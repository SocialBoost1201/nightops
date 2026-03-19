import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestUser } from '../../common';
import { SubmitShiftsDto, ApproveShiftsDto, ShiftChangeRequestDto } from './shift.dto';

@Injectable()
export class ShiftService {
    private readonly logger = new Logger(ShiftService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogService: AuditLogService,
    ) {}

    /**
     * シフト提出（2週間分一括）
     * Cast / Staff は自分のシフトのみ
     */
    async submit(user: RequestUser, dto: SubmitShiftsDto) {
        const periodStart = new Date(dto.periodStart);
        const periodEnd = new Date(dto.periodEnd);

        // 既存のシフトを確認（同一期間の重複チェック）
        const existing = await this.prisma.shiftEntry.findFirst({
            where: {
                tenantId: user.tenantId,
                accountId: user.id,
                periodStart,
                periodEnd,
            },
        });

        if (existing) {
            // 既存がある場合は削除して再提出（submitted の場合のみ）
            const existingEntries = await this.prisma.shiftEntry.findMany({
                where: {
                    tenantId: user.tenantId,
                    accountId: user.id,
                    periodStart,
                    periodEnd,
                    status: 'submitted',
                },
            });

            if (existingEntries.length > 0) {
                await this.prisma.shiftEntry.deleteMany({
                    where: {
                        id: { in: existingEntries.map((e: typeof existingEntries[number]) => e.id) },
                    },
                });
            }

            // approved 状態のものがあれば再提出不可
            const hasApproved = await this.prisma.shiftEntry.findFirst({
                where: {
                    tenantId: user.tenantId,
                    accountId: user.id,
                    periodStart,
                    periodEnd,
                    status: 'approved',
                },
            });

            if (hasApproved) {
                throw new ConflictException({
                    error: {
                        code: 'CLOSE_001',
                        message: '承認済みのシフトは再提出できません。変更申請を行ってください',
                    },
                });
            }
        }

        // 一括作成
        const entries = await Promise.all(
            dto.entries.map((entry) =>
                this.prisma.shiftEntry.create({
                    data: {
                        tenantId: user.tenantId,
                        accountId: user.id,
                        periodStart,
                        periodEnd,
                        date: new Date(entry.date),
                        plannedStart: entry.plannedStart ?? null,
                        plannedEnd: entry.plannedEnd ?? null,
                        memo: entry.memo ?? null,
                        status: 'submitted',
                    },
                }),
            ),
        );

        return {
            count: entries.length,
            periodStart: dto.periodStart,
            periodEnd: dto.periodEnd,
            entries: entries.map((e) => ({
                id: e.id,
                date: e.date,
                plannedStart: e.plannedStart,
                plannedEnd: e.plannedEnd,
                status: e.status,
            })),
        };
    }

    /**
     * シフト一覧取得
     * - Cast/Staff: 自分のシフトのみ
     * - Manager/Admin: テナント全体
     */
    async list(
        user: RequestUser,
        filters?: {
            accountId?: string;
            periodStart?: string;
            periodEnd?: string;
            status?: string;
        },
    ) {
        const where: any = { tenantId: user.tenantId };

        // Cast / Staff は自分のシフトのみ
        if (user.role === 'Cast' || user.role === 'Staff') {
            where.accountId = user.id;
        } else if (filters?.accountId) {
            where.accountId = filters.accountId;
        }

        if (filters?.periodStart) {
            where.periodStart = new Date(filters.periodStart);
        }
        if (filters?.periodEnd) {
            where.periodEnd = new Date(filters.periodEnd);
        }
        if (filters?.status) {
            where.status = filters.status;
        }

        const entries = await this.prisma.shiftEntry.findMany({
            where,
            include: {
                account: {
                    include: { userProfile: true },
                },
            },
            orderBy: [{ date: 'asc' }],
        });

        return entries.map((e: typeof entries[number]) => ({
            id: e.id,
            accountId: e.accountId,
            displayName: e.account.userProfile?.displayName || e.account.loginId,
            periodStart: e.periodStart,
            periodEnd: e.periodEnd,
            date: e.date,
            plannedStart: e.plannedStart,
            plannedEnd: e.plannedEnd,
            memo: e.memo,
            status: e.status,
        }));
    }

    /**
     * シフト承認/差戻（一括）
     * Manager / Admin のみ
     */
    async approve(user: RequestUser, dto: ApproveShiftsDto) {
        // テナント所有確認
        const shifts = await this.prisma.shiftEntry.findMany({
            where: {
                id: { in: dto.shiftIds },
                tenantId: user.tenantId,
            },
        });

        if (shifts.length !== dto.shiftIds.length) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定されたシフトの一部が見つかりません' },
            });
        }

        // submitted 状態のもののみ承認/差戻可能
        const nonSubmitted = shifts.filter((s: typeof shifts[number]) => s.status !== 'submitted');
        if (nonSubmitted.length > 0) {
            throw new ConflictException({
                error: {
                    code: 'CLOSE_001',
                    message: '未提出または既に処理済みのシフトが含まれています',
                },
            });
        }

        const updatedCount = await this.prisma.shiftEntry.updateMany({
            where: {
                id: { in: dto.shiftIds },
                tenantId: user.tenantId,
            },
            data: { status: dto.action },
        });

        // 監査ログ
        for (const shift of shifts) {
            await this.auditLogService.log({
                user,
                actionType: dto.action === 'approved' ? 'APPROVE_SHIFT' : 'REJECT_SHIFT',
                targetType: 'ShiftEntry',
                targetId: shift.id,
                beforeData: { status: shift.status },
                afterData: { status: dto.action },
            });
        }

        return { updated: updatedCount.count };
    }

    /**
     * シフト変更申請（承認済みシフトの変更）
     * Cast / Staff が申請 → Manager / Admin が承認
     */
    async requestChange(user: RequestUser, dto: ShiftChangeRequestDto) {
        const shift = await this.prisma.shiftEntry.findFirst({
            where: {
                id: dto.shiftId,
                tenantId: user.tenantId,
            },
        });

        if (!shift) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定されたシフトが見つかりません' },
            });
        }

        // Cast/Staff は自分のシフトのみ
        if (['Cast', 'Staff'].includes(user.role) && shift.accountId !== user.id) {
            throw new ForbiddenException({
                error: { code: 'ACCESS_002', message: '他のユーザーのデータにはアクセスできません' },
            });
        }

        // 承認済みでなければ変更申請は不要（直接再提出可能）
        if (shift.status !== 'approved') {
            throw new ConflictException({
                error: {
                    code: 'VALID_002',
                    message: '承認済みのシフトのみ変更申請が可能です',
                },
            });
        }

        // 同一対象に承認待ちの申請がないか確認
        const existingRequest = await this.prisma.changeRequest.findFirst({
            where: {
                tenantId: user.tenantId,
                targetType: 'ShiftEntry',
                targetId: dto.shiftId,
                status: 'pending',
            },
        });

        if (existingRequest) {
            throw new ConflictException({
                error: { code: 'CHANGE_001', message: '同一対象に承認待ちの申請が存在します' },
            });
        }

        // 修正申請を作成
        const changeRequest = await this.prisma.changeRequest.create({
            data: {
                tenantId: user.tenantId,
                targetType: 'ShiftEntry',
                targetId: dto.shiftId,
                reason: dto.reason,
                status: 'pending',
                requestedBy: user.id,
                diffJson: {
                    before: {
                        plannedStart: shift.plannedStart,
                        plannedEnd: shift.plannedEnd,
                        memo: shift.memo,
                    },
                    after: {
                        plannedStart: dto.newPlannedStart ?? shift.plannedStart,
                        plannedEnd: dto.newPlannedEnd ?? shift.plannedEnd,
                        memo: dto.newMemo ?? shift.memo,
                    },
                },
            },
        });

        // 監査ログ
        await this.auditLogService.log({
            user,
            actionType: 'CREATE_CHANGE_REQUEST',
            targetType: 'ShiftEntry',
            targetId: dto.shiftId,
            afterData: { changeRequestId: changeRequest.id, reason: dto.reason },
        });

        return {
            changeRequestId: changeRequest.id,
            status: changeRequest.status,
        };
    }
}
