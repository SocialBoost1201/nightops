import {
    Injectable,
    ConflictException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestUser } from '../../common';
import { CreateSalesSlipDto, UpdateSalesSlipDto } from './sales.dto';
import {
    calculateSubtotal,
    calculateServiceTax,
    roundTotal,
} from '@nightops/shared';

@Injectable()
export class SalesService {
    private readonly logger = new Logger(SalesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogService: AuditLogService,
    ) {}

    // ===========================
    // 締め済みチェック
    // ===========================

    private async assertNotClosed(tenantId: string, businessDate: Date): Promise<void> {
        const close = await this.prisma.dailyClose.findUnique({
            where: {
                uq_daily_closes_tenant_date: { tenantId, businessDate },
            },
        });

        if (close && close.status === 'closed') {
            throw new ConflictException({
                error: {
                    code: 'CLOSE_001',
                    message: '締め済みデータは編集できません。修正申請を行ってください',
                },
            });
        }
    }

    // ===========================
    // 店舗設定取得
    // ===========================

    private async getStoreSettings(tenantId: string) {
        const settings = await this.prisma.storeSettings.findUnique({
            where: { tenantId },
        });
        return {
            taxServiceMultiplier: settings ? Number(settings.serviceTaxMultiplier) : 1.32,
            roundingUnit: settings?.roundingUnit ?? 1000,
            roundingThreshold: settings?.roundingThreshold ?? 500,
        };
    }

    // ===========================
    // 伝票作成
    // ===========================

    async createSlip(user: RequestUser, dto: CreateSalesSlipDto) {
        const businessDate = new Date(dto.businessDate);
        await this.assertNotClosed(user.tenantId, businessDate);

        const settings = await this.getStoreSettings(user.tenantId);

        // 計算（shared パッケージの関数を使用）
        const lineInputs = dto.lines.map((l) => ({
            quantity: l.qty,
            unitPrice: l.unitPrice,
        }));
        const subtotal = calculateSubtotal(lineInputs);
        const serviceTaxAmount = calculateServiceTax(subtotal, settings.taxServiceMultiplier);
        const totalRounded = roundTotal(serviceTaxAmount, settings.roundingUnit, settings.roundingThreshold);

        // 顧客検索/作成
        let customerId: string | null = null;
        if (dto.customerName) {
            let customer = await this.prisma.customer.findFirst({
                where: { tenantId: user.tenantId, name: dto.customerName, deletedAt: null },
            });
            if (!customer) {
                customer = await this.prisma.customer.create({
                    data: { tenantId: user.tenantId, name: dto.customerName },
                });
            }
            customerId = customer.id;
        }

        // 伝票作成（明細 + ドリンクを一緒に）
        const slip = await this.prisma.salesSlip.create({
            data: {
                tenantId: user.tenantId,
                businessDate,
                tableNo: dto.tableNo ?? null,
                customerId,
                customerNameRaw: dto.customerName ?? null,
                partySize: dto.partySize,
                mainCastId: dto.mainCastId,
                subtotal,
                serviceTaxAmount,
                totalRounded,
                status: 'draft',
                lines: {
                    create: dto.lines.map((l) => ({
                        tenantId: user.tenantId,
                        itemCode: l.itemCode,
                        itemName: l.itemName,
                        qty: l.qty,
                        unitPrice: l.unitPrice,
                        amount: Math.floor(l.qty * l.unitPrice),
                    })),
                },
                ...(dto.drinkCounts && dto.drinkCounts.length > 0
                    ? {
                          drinkCounts: {
                              create: dto.drinkCounts.map((d) => ({
                                  tenantId: user.tenantId,
                                  castId: d.castId,
                                  cups: d.cups,
                              })),
                          },
                      }
                    : {}),
            },
            include: { lines: true, drinkCounts: true },
        });

        await this.auditLogService.log({
            user,
            actionType: 'CREATE_SALES_SLIP',
            targetType: 'SalesSlip',
            targetId: slip.id,
            afterData: { subtotal, serviceTaxAmount, totalRounded },
        });

        return {
            slipId: slip.id,
            subtotal,
            serviceTaxAmount,
            totalRounded,
            lines: slip.lines,
            drinkCounts: slip.drinkCounts,
        };
    }

    // ===========================
    // 伝票更新（締め前のみ）
    // ===========================

    async updateSlip(user: RequestUser, slipId: string, dto: UpdateSalesSlipDto) {
        const slip = await this.prisma.salesSlip.findFirst({
            where: { id: slipId, tenantId: user.tenantId },
            include: { lines: true, drinkCounts: true },
        });

        if (!slip) {
            throw new NotFoundException({
                error: { code: 'SALES_001', message: '指定された伝票が見つかりません' },
            });
        }

        if (slip.status === 'closed') {
            throw new ConflictException({
                error: { code: 'SALES_002', message: '締め済みの伝票は修正できません' },
            });
        }

        const beforeData = {
            subtotal: slip.subtotal,
            serviceTaxAmount: slip.serviceTaxAmount,
            totalRounded: slip.totalRounded,
        };

        // 明細が更新される場合は再計算
        let subtotal = slip.subtotal;
        let serviceTaxAmount = slip.serviceTaxAmount;
        let totalRounded = slip.totalRounded;

        if (dto.lines) {
            const settings = await this.getStoreSettings(user.tenantId);
            const lineInputs = dto.lines.map((l) => ({
                quantity: l.qty,
                unitPrice: l.unitPrice,
            }));
            subtotal = calculateSubtotal(lineInputs);
            serviceTaxAmount = calculateServiceTax(subtotal, settings.taxServiceMultiplier);
            totalRounded = roundTotal(serviceTaxAmount, settings.roundingUnit, settings.roundingThreshold);

            // 既存明細を削除して再作成
            await this.prisma.salesLine.deleteMany({ where: { slipId } });
            await Promise.all(
                dto.lines.map((l) =>
                    this.prisma.salesLine.create({
                        data: {
                            tenantId: user.tenantId,
                            slipId,
                            itemCode: l.itemCode,
                            itemName: l.itemName,
                            qty: l.qty,
                            unitPrice: l.unitPrice,
                            amount: Math.floor(l.qty * l.unitPrice),
                        },
                    }),
                ),
            );
        }

        // ドリンク更新
        if (dto.drinkCounts) {
            await this.prisma.drinkCount.deleteMany({ where: { slipId } });
            await Promise.all(
                dto.drinkCounts.map((d) =>
                    this.prisma.drinkCount.create({
                        data: {
                            tenantId: user.tenantId,
                            slipId,
                            castId: d.castId,
                            cups: d.cups,
                        },
                    }),
                ),
            );
        }

        // 顧客更新
        let customerId = slip.customerId;
        if (dto.customerName !== undefined) {
            if (dto.customerName) {
                let customer = await this.prisma.customer.findFirst({
                    where: { tenantId: user.tenantId, name: dto.customerName, deletedAt: null },
                });
                if (!customer) {
                    customer = await this.prisma.customer.create({
                        data: { tenantId: user.tenantId, name: dto.customerName },
                    });
                }
                customerId = customer.id;
            } else {
                customerId = null;
            }
        }

        const updated = await this.prisma.salesSlip.update({
            where: { id: slipId },
            data: {
                ...(dto.tableNo !== undefined ? { tableNo: dto.tableNo } : {}),
                ...(dto.customerName !== undefined
                    ? { customerId, customerNameRaw: dto.customerName }
                    : {}),
                ...(dto.partySize !== undefined ? { partySize: dto.partySize } : {}),
                ...(dto.mainCastId !== undefined ? { mainCastId: dto.mainCastId } : {}),
                subtotal,
                serviceTaxAmount,
                totalRounded,
            },
            include: { lines: true, drinkCounts: true },
        });

        await this.auditLogService.log({
            user,
            actionType: 'UPDATE_SALES_SLIP',
            targetType: 'SalesSlip',
            targetId: slipId,
            beforeData,
            afterData: { subtotal, serviceTaxAmount, totalRounded },
        });

        return {
            slipId: updated.id,
            subtotal,
            serviceTaxAmount,
            totalRounded,
            lines: updated.lines,
            drinkCounts: updated.drinkCounts,
        };
    }

    // ===========================
    // 伝票一覧
    // ===========================

    async listSlips(user: RequestUser, businessDate?: string) {
        const where: any = { tenantId: user.tenantId };
        if (businessDate) {
            where.businessDate = new Date(businessDate);
        }

        const slips = await this.prisma.salesSlip.findMany({
            where,
            include: {
                lines: true,
                drinkCounts: true,
                customer: true,
                mainCast: {
                    include: { userProfile: true },
                },
            },
            orderBy: { businessDate: 'desc' },
        });

        return slips.map((s: typeof slips[number]) => ({
            slipId: s.id,
            businessDate: s.businessDate,
            tableNo: s.tableNo,
            customerName: s.customer?.name ?? s.customerNameRaw,
            partySize: s.partySize,
            mainCastName: s.mainCast.userProfile?.displayName ?? s.mainCast.loginId,
            subtotal: s.subtotal,
            serviceTaxAmount: s.serviceTaxAmount,
            totalRounded: s.totalRounded,
            status: s.status,
            lineCount: s.lines.length,
            drinkCounts: s.drinkCounts,
        }));
    }

    // ===========================
    // 伝票詳細
    // ===========================

    async getSlip(user: RequestUser, slipId: string) {
        const slip = await this.prisma.salesSlip.findFirst({
            where: { id: slipId, tenantId: user.tenantId },
            include: {
                lines: true,
                drinkCounts: { include: { cast: { include: { userProfile: true } } } },
                customer: true,
                mainCast: { include: { userProfile: true } },
            },
        });

        if (!slip) {
            throw new NotFoundException({
                error: { code: 'SALES_001', message: '指定された伝票が見つかりません' },
            });
        }

        return slip;
    }

    // ===========================
    // 伝票削除（締め前のみ）
    // ===========================

    async deleteSlip(user: RequestUser, slipId: string) {
        const slip = await this.prisma.salesSlip.findFirst({
            where: { id: slipId, tenantId: user.tenantId },
        });

        if (!slip) {
            throw new NotFoundException({
                error: { code: 'SALES_001', message: '指定された伝票が見つかりません' },
            });
        }

        if (slip.status === 'closed') {
            throw new ConflictException({
                error: { code: 'SALES_002', message: '締め済みの伝票は削除できません。修正申請を行ってください' },
            });
        }

        const beforeData = { slipId, subtotal: slip.subtotal, totalRounded: slip.totalRounded };

        // 明細・ドリンクカウントは Prismaスキーマの cascade で自動削除
        await this.prisma.salesLine.deleteMany({ where: { slipId } });
        await this.prisma.drinkCount.deleteMany({ where: { slipId } });
        await this.prisma.salesSlip.delete({ where: { id: slipId } });

        await this.auditLogService.log({
            user,
            actionType: 'DELETE_SALES_SLIP',
            targetType: 'SalesSlip',
            targetId: slipId,
            beforeData,
        });

        return { deleted: true, slipId };
    }
}
