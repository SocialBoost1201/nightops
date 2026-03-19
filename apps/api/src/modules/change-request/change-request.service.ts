import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestUser } from '../../common';
import { ProcessChangeRequestDto } from './change-request.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChangeRequestService {
    private readonly logger = new Logger(ChangeRequestService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogService: AuditLogService,
    ) {}

    /**
     * 承認待ちの申請一覧取得（Manager / Admin 向け）
     */
    async listPending(user: RequestUser) {
        return this.prisma.changeRequest.findMany({
            where: {
                tenantId: user.tenantId,
                status: 'pending',
            },
            include: {
                requester: {
                    include: { userProfile: true },
                },
                approver: {
                    include: { userProfile: true },
                },
            },
        });
    }

    /**
     * 自分が申請した履歴取得
     */
    async listMyRequests(user: RequestUser) {
        return this.prisma.changeRequest.findMany({
            where: {
                tenantId: user.tenantId,
                requestedBy: user.id,
            },
            include: {
                approver: {
                    include: { userProfile: true },
                },
            },
        });
    }

    /**
     * 修正申請の承認・差戻
     * 承認された場合、対象データ（ShiftEntry, PunchEvent等）を更新する
     */
    async process(user: RequestUser, id: string, dto: ProcessChangeRequestDto) {
        const request = await this.prisma.changeRequest.findFirst({
            where: { id, tenantId: user.tenantId },
        });

        if (!request) {
            throw new NotFoundException({
                error: { code: 'VALID_001', message: '指定された申請が見つかりません' },
            });
        }

        if (request.status !== 'pending') {
            throw new ConflictException({
                error: { code: 'CHANGE_002', message: '既に処理済みの申請です' },
            });
        }

        // 差戻（却下）の場合
        if (dto.action === 'rejected') {
            const rejected = await this.prisma.changeRequest.update({
                where: { id },
                data: {
                    status: 'rejected',
                    approvedBy: user.id,
                    approvedAt: new Date(),
                },
            });

            await this.auditLogService.log({
                user,
                actionType: 'REJECT_CHANGE_REQUEST',
                targetType: 'ChangeRequest',
                targetId: id,
                afterData: { status: 'rejected' },
            });

            return rejected;
        }

        // 承認の場合：対象データを更新するトランザクション
        const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 申請ステータス更新
            const approved = await tx.changeRequest.update({
                where: { id },
                data: {
                    status: 'approved',
                    approvedBy: user.id,
                    approvedAt: new Date(),
                },
            });

            const diff = request.diffJson as Record<string, any>;

            // ShiftEntry の場合
            if (request.targetType === 'ShiftEntry') {
                await tx.shiftEntry.update({
                    where: { id: request.targetId },
                    data: {
                        plannedStart: diff.after?.plannedStart,
                        plannedEnd: diff.after?.plannedEnd,
                        memo: diff.after?.memo,
                    },
                });
            }
            // PunchEvent などの追加対応もここに実装可能
            else if (request.targetType === 'PunchEvent') {
                await tx.punchEvent.update({
                    where: { id: request.targetId },
                    data: {
                        timestamp: diff.after?.timestamp ? new Date(diff.after.timestamp) : undefined,
                    },
                });
            }

            return approved;
        });

        await this.auditLogService.log({
            user,
            actionType: 'APPROVE_CHANGE_REQUEST',
            targetType: 'ChangeRequest',
            targetId: id,
            afterData: { status: 'approved', targetType: request.targetType, targetId: request.targetId },
        });

        return result;
    }
}
