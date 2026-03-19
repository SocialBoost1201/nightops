import {
    Injectable,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestUser } from '../../common';
import { CreateCustomerDto, UpdateCustomerDto } from './customer.dto';

@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogService: AuditLogService,
    ) {}

    async create(user: RequestUser, dto: CreateCustomerDto) {
        const customer = await this.prisma.customer.create({
            data: {
                tenantId: user.tenantId,
                name: dto.name,
                phoneNumber: dto.phoneNumber ?? null,
                memo: dto.memo ?? null,
            },
        });

        await this.auditLogService.log({
            user,
            actionType: 'CREATE_CUSTOMER',
            targetType: 'Customer',
            targetId: customer.id,
            afterData: { name: dto.name },
        });

        return customer;
    }

    async list(user: RequestUser, search?: string) {
        const where: any = {
            tenantId: user.tenantId,
            deletedAt: null,
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search } },
            ];
        }

        return this.prisma.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(user: RequestUser, customerId: string, dto: UpdateCustomerDto) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, tenantId: user.tenantId, deletedAt: null },
        });

        if (!customer) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定された顧客が見つかりません' },
            });
        }

        const updated = await this.prisma.customer.update({
            where: { id: customerId },
            data: {
                ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
                ...(dto.memo !== undefined ? { memo: dto.memo } : {}),
            },
        });

        return updated;
    }

    async softDelete(user: RequestUser, customerId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, tenantId: user.tenantId, deletedAt: null },
        });

        if (!customer) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定された顧客が見つかりません' },
            });
        }

        await this.prisma.customer.update({
            where: { id: customerId },
            data: { deletedAt: new Date() },
        });

        await this.auditLogService.log({
            user,
            actionType: 'DELETE_CUSTOMER',
            targetType: 'Customer',
            targetId: customerId,
            beforeData: { name: customer.name },
        });

        return { deleted: true };
    }

    /**
     * 顧客別来店回数・売上サマリ
     */
    async getCustomerSummary(user: RequestUser, customerId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, tenantId: user.tenantId, deletedAt: null },
        });

        if (!customer) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定された顧客が見つかりません' },
            });
        }

        const slips = await this.prisma.salesSlip.findMany({
            where: { tenantId: user.tenantId, customerId },
            select: {
                id: true,
                businessDate: true,
                totalRounded: true,
            },
            orderBy: { businessDate: 'desc' },
        });

        const visitCount = slips.length;
        const totalSpent = slips.reduce((sum: number, s: typeof slips[number]) => sum + s.totalRounded, 0);

        return {
            customer,
            visitCount,
            totalSpent,
            recentVisits: slips.slice(0, 10),
        };
    }

    /**
     * 顧客名寄せ（source を target に統合）
     * - 売上伝票の顧客IDを付け替え
     * - source を論理削除
     */
    async mergeCustomers(user: RequestUser, sourceId: string, targetId: string) {
        const [source, target] = await Promise.all([
            this.prisma.customer.findFirst({ where: { id: sourceId, tenantId: user.tenantId, deletedAt: null } }),
            this.prisma.customer.findFirst({ where: { id: targetId, tenantId: user.tenantId, deletedAt: null } }),
        ]);

        if (!source || !target) {
            throw new NotFoundException({
                error: { code: 'CUSTOMER_001', message: '指定された顧客が見つかりません' },
            });
        }

        // 売上伝票の顧客IDを付け替え
        await this.prisma.salesSlip.updateMany({
            where: { customerId: sourceId, tenantId: user.tenantId },
            data: { customerId: targetId },
        });

        // source を論理削除
        await this.prisma.customer.update({
            where: { id: sourceId },
            data: {
                deletedAt: new Date(),
                memo: (source.memo ? source.memo + ' ' : '') + '[\u7d71合済み → ' + targetId + ']',
            },
        });

        await this.auditLogService.log({
            user,
            actionType: 'MERGE_CUSTOMER',
            targetType: 'Customer',
            targetId: targetId,
            beforeData: { sourceId, sourceName: source.name },
            afterData: { targetId, targetName: target.name },
        });

        return { merged: true, targetId, sourceId };
    }
}
