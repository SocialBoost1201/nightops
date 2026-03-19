import {
    Injectable,
    ForbiddenException,
    ConflictException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestUser } from '../../common';
import { CheckinDto, CheckoutDto, CastCheckoutDto, DailyCloseDto } from './attendance.dto';

@Injectable()
export class AttendanceService {
    private readonly logger = new Logger(AttendanceService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogService: AuditLogService,
    ) {}

    // ===========================
    // 営業日算出ヘルパー
    // ===========================

    /**
     * タイムスタンプから営業日を決定
     * 06:00 以前 → 前日の営業日
     */
    private resolveBusinessDate(timestamp: Date, cutoffHour = 6): Date {
        const local = new Date(timestamp.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        if (local.getHours() < cutoffHour) {
            local.setDate(local.getDate() - 1);
        }
        return new Date(local.toISOString().split('T')[0]);
    }

    // ===========================
    // 締め済みチェック
    // ===========================

    private async assertNotClosed(tenantId: string, businessDate: Date): Promise<void> {
        const close = await this.prisma.dailyClose.findUnique({
            where: {
                uq_daily_closes_tenant_date: {
                    tenantId,
                    businessDate,
                },
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
    // 出勤打刻
    // ===========================

    async checkin(user: RequestUser, dto: CheckinDto) {
        const now = dto.timestamp ? new Date(dto.timestamp) : new Date();
        const businessDate = this.resolveBusinessDate(now);

        await this.assertNotClosed(user.tenantId, businessDate);

        // 二重打刻チェック
        const existing = await this.prisma.punchEvent.findFirst({
            where: {
                tenantId: user.tenantId,
                accountId: user.id,
                businessDate,
                type: 'checkin',
            },
        });

        if (existing) {
            throw new ConflictException({
                error: { code: 'PUNCH_001', message: '既に出勤打刻されています' },
            });
        }

        const punch = await this.prisma.punchEvent.create({
            data: {
                tenantId: user.tenantId,
                accountId: user.id,
                businessDate,
                type: 'checkin',
                timestamp: now,
            },
        });

        await this.auditLogService.log({
            user,
            actionType: 'CHECKIN',
            targetType: 'PunchEvent',
            targetId: punch.id,
            afterData: { businessDate, timestamp: now },
        });

        return { punchId: punch.id, businessDate, timestamp: now };
    }

    // ===========================
    // 退勤打刻（Staff のみ）
    // ===========================

    async checkout(user: RequestUser, dto: CheckoutDto) {
        // Cast は退勤ボタンなし（あがりは Manager が入力）
        const account = await this.prisma.account.findUnique({
            where: { id: user.id },
            include: { userProfile: true },
        });

        if (account?.userProfile?.userType === 'cast') {
            throw new ForbiddenException({
                error: {
                    code: 'ACCESS_001',
                    message: 'キャストは退勤打刻できません。あがり時間は管理者が入力します',
                },
            });
        }

        const now = dto.timestamp ? new Date(dto.timestamp) : new Date();
        const businessDate = this.resolveBusinessDate(now);

        await this.assertNotClosed(user.tenantId, businessDate);

        // 出勤打刻済みか確認
        const checkinPunch = await this.prisma.punchEvent.findFirst({
            where: {
                tenantId: user.tenantId,
                accountId: user.id,
                businessDate,
                type: 'checkin',
            },
        });

        if (!checkinPunch) {
            throw new ConflictException({
                error: { code: 'PUNCH_002', message: '出勤打刻がありません' },
            });
        }

        // 二重退勤チェック
        const existingCheckout = await this.prisma.punchEvent.findFirst({
            where: {
                tenantId: user.tenantId,
                accountId: user.id,
                businessDate,
                type: 'checkout',
            },
        });

        if (existingCheckout) {
            throw new ConflictException({
                error: { code: 'PUNCH_001', message: '既に退勤打刻されています' },
            });
        }

        const punch = await this.prisma.punchEvent.create({
            data: {
                tenantId: user.tenantId,
                accountId: user.id,
                businessDate,
                type: 'checkout',
                timestamp: now,
            },
        });

        await this.auditLogService.log({
            user,
            actionType: 'CHECKOUT',
            targetType: 'PunchEvent',
            targetId: punch.id,
            afterData: { businessDate, timestamp: now },
        });

        return { punchId: punch.id, businessDate, timestamp: now };
    }

    // ===========================
    // キャストあがり入力（Manager / Admin）
    // ===========================

    async setCastCheckout(user: RequestUser, dto: CastCheckoutDto) {
        const businessDate = new Date(dto.businessDate);

        await this.assertNotClosed(user.tenantId, businessDate);

        // 対象キャストのテナント確認
        const targetAccount = await this.prisma.account.findFirst({
            where: {
                id: dto.accountId,
                tenantId: user.tenantId,
            },
            include: { userProfile: true },
        });

        if (!targetAccount) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定されたアカウントが見つかりません' },
            });
        }

        // 出勤済みか確認
        const checkinPunch = await this.prisma.punchEvent.findFirst({
            where: {
                tenantId: user.tenantId,
                accountId: dto.accountId,
                businessDate,
                type: 'checkin',
            },
        });

        if (!checkinPunch) {
            throw new ConflictException({
                error: { code: 'PUNCH_002', message: '出勤打刻がないキャストにはあがり入力できません' },
            });
        }

        // 既存あがりを上書き（upsert）
        const existing = await this.prisma.castCheckout.findFirst({
            where: {
                tenantId: user.tenantId,
                accountId: dto.accountId,
                businessDate,
            },
        });

        let castCheckout;
        if (existing) {
            castCheckout = await this.prisma.castCheckout.update({
                where: { id: existing.id },
                data: {
                    checkoutTime: dto.checkoutTime,
                    setByAccountId: user.id,
                },
            });
        } else {
            castCheckout = await this.prisma.castCheckout.create({
                data: {
                    tenantId: user.tenantId,
                    accountId: dto.accountId,
                    businessDate,
                    checkoutTime: dto.checkoutTime,
                    setByAccountId: user.id,
                },
            });
        }

        await this.auditLogService.log({
            user,
            actionType: existing ? 'UPDATE_CAST_CHECKOUT' : 'CREATE_CAST_CHECKOUT',
            targetType: 'CastCheckout',
            targetId: castCheckout.id,
            beforeData: existing ? { checkoutTime: existing.checkoutTime } : null,
            afterData: { checkoutTime: dto.checkoutTime },
        });

        return { castCheckoutId: castCheckout.id, checkoutTime: dto.checkoutTime };
    }

    // ===========================
    // 当日打刻状況一覧（Manager 向け）
    // ===========================

    async getTodayStatus(user: RequestUser, businessDate: string) {
        const date = new Date(businessDate);

        // テナント内の全アカウント（active のみ）
        const accounts = await this.prisma.account.findMany({
            where: { tenantId: user.tenantId, status: 'active' },
            include: { userProfile: true },
        });

        // 当日の打刻
        const punches = await this.prisma.punchEvent.findMany({
            where: { tenantId: user.tenantId, businessDate: date },
        });

        // 当日のあがり
        const checkouts = await this.prisma.castCheckout.findMany({
            where: { tenantId: user.tenantId, businessDate: date },
        });

        // 当日のシフト予定
        const shifts = await this.prisma.shiftEntry.findMany({
            where: {
                tenantId: user.tenantId,
                date,
                status: 'approved',
            },
        });

        return accounts.map((a: typeof accounts[number]) => {
            const userPunches = punches.filter((p: typeof punches[number]) => p.accountId === a.id);
            const checkin = userPunches.find((p: typeof userPunches[number]) => p.type === 'checkin');
            const checkout = userPunches.find((p: typeof userPunches[number]) => p.type === 'checkout');
            const castCheckout = checkouts.find((c: typeof checkouts[number]) => c.accountId === a.id);
            const shift = shifts.find((s: typeof shifts[number]) => s.accountId === a.id);

            return {
                accountId: a.id,
                displayName: a.userProfile?.displayName || a.loginId,
                userType: a.userProfile?.userType,
                role: a.role,
                hasShift: !!shift,
                plannedStart: shift?.plannedStart ?? null,
                plannedEnd: shift?.plannedEnd ?? null,
                checkinAt: checkin?.timestamp ?? null,
                checkoutAt: checkout?.timestamp ?? null,
                castCheckoutTime: castCheckout?.checkoutTime ?? null,
                status: this.deriveStatus(a.userProfile?.userType, !!checkin, !!checkout, !!castCheckout),
            };
        });
    }

    private deriveStatus(
        userType: string | undefined,
        hasCheckin: boolean,
        hasCheckout: boolean,
        hasCastCheckout: boolean,
    ): string {
        if (!hasCheckin) return 'not_checked_in';
        if (userType === 'cast') {
            return hasCastCheckout ? 'completed' : 'working';
        }
        return hasCheckout ? 'completed' : 'working';
    }

    // ===========================
    // 日次締め
    // ===========================

    async dailyClose(user: RequestUser, dto: DailyCloseDto) {
        const businessDate = new Date(dto.businessDate);

        // 既に締め済みか確認
        const existing = await this.prisma.dailyClose.findUnique({
            where: {
                uq_daily_closes_tenant_date: {
                    tenantId: user.tenantId,
                    businessDate,
                },
            },
        });

        if (existing && existing.status === 'closed') {
            throw new ConflictException({
                error: { code: 'CLOSE_001', message: '既に締め済みです' },
            });
        }

        // 締め前チェック: 未入力データの確認
        const warnings: Array<{ type: string; accountId: string; displayName: string }> = [];

        // 出勤済みキャストであがり未入力
        const castCheckins = await this.prisma.punchEvent.findMany({
            where: {
                tenantId: user.tenantId,
                businessDate,
                type: 'checkin',
            },
            include: {
                account: { include: { userProfile: true } },
            },
        });

        for (const punch of castCheckins) {
            if (punch.account.userProfile?.userType === 'cast') {
                const hasCastCheckout = await this.prisma.castCheckout.findFirst({
                    where: {
                        tenantId: user.tenantId,
                        accountId: punch.accountId,
                        businessDate,
                    },
                });

                if (!hasCastCheckout) {
                    warnings.push({
                        type: 'CAST_NO_CHECKOUT',
                        accountId: punch.accountId,
                        displayName: punch.account.userProfile.displayName,
                    });
                }
            }
        }

        // 出勤済みスタッフで退勤未入力
        for (const punch of castCheckins) {
            if (punch.account.userProfile?.userType === 'staff') {
                const hasCheckout = await this.prisma.punchEvent.findFirst({
                    where: {
                        tenantId: user.tenantId,
                        accountId: punch.accountId,
                        businessDate,
                        type: 'checkout',
                    },
                });

                if (!hasCheckout) {
                    warnings.push({
                        type: 'STAFF_NO_CHECKOUT',
                        accountId: punch.accountId,
                        displayName: punch.account.userProfile?.displayName || punch.account.loginId,
                    });
                }
            }
        }

        // 未入力がある場合は forceClose でない限り拒否
        if (warnings.length > 0 && !dto.forceClose) {
            throw new ConflictException({
                error: {
                    code: 'CLOSE_003',
                    message: '未入力データがあるため締めできません',
                    detail: JSON.stringify(warnings),
                },
            });
        }

        // 日次締め実行
        let closeRecord;
        if (existing) {
            closeRecord = await this.prisma.dailyClose.update({
                where: { id: existing.id },
                data: {
                    status: 'closed',
                    closedBy: user.id,
                    closedAt: new Date(),
                },
            });
        } else {
            closeRecord = await this.prisma.dailyClose.create({
                data: {
                    tenantId: user.tenantId,
                    businessDate,
                    status: 'closed',
                    closedBy: user.id,
                    closedAt: new Date(),
                },
            });
        }

        // 当日の売上伝票もクローズ
        await this.prisma.salesSlip.updateMany({
            where: {
                tenantId: user.tenantId,
                businessDate,
                status: 'draft',
            },
            data: {
                status: 'closed',
                closedBy: user.id,
            },
        });

        await this.auditLogService.log({
            user,
            actionType: 'DAILY_CLOSE',
            targetType: 'DailyClose',
            targetId: closeRecord.id,
            afterData: { businessDate: dto.businessDate, warnings },
        });

        return {
            closeId: closeRecord.id,
            status: 'closed',
            businessDate: dto.businessDate,
            warnings,
        };
    }

    // ===========================
    // 日次締め状況確認
    // ===========================

    async getDailyCloseStatus(user: RequestUser, businessDate: string) {
        const date = new Date(businessDate);
        const close = await this.prisma.dailyClose.findUnique({
            where: {
                uq_daily_closes_tenant_date: {
                    tenantId: user.tenantId,
                    businessDate: date,
                },
            },
        });

        return {
            businessDate,
            status: close?.status ?? 'open',
            closedAt: close?.closedAt ?? null,
        };
    }
}
