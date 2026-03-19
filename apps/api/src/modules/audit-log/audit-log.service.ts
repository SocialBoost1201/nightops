import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common';

interface AuditLogInput {
    user: RequestUser;
    actionType: string;
    targetType: string;
    targetId: string;
    beforeData?: Record<string, any> | null;
    afterData?: Record<string, any> | null;
    reason?: string;
    requestId?: string;
    correlationId?: string;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditLogService {
    private readonly logger = new Logger(AuditLogService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 監査ログ書き込み
     */
    async log(input: AuditLogInput): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    tenantId: input.user.tenantId,
                    actorId: input.user.id,
                    actorRole: input.user.role,
                    actionType: input.actionType,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    beforeData: input.beforeData ?? undefined,
                    afterData: input.afterData ?? undefined,
                    reason: input.reason,
                    requestId: input.requestId,
                    correlationId: input.correlationId,
                    ipAddress: input.ipAddress,
                    userAgent: input.userAgent,
                },
            });
        } catch (error) {
            // 監査ログの書き込み失敗はビジネスロジックを中断しない（ただしログには出力）
            this.logger.error('監査ログの書き込みに失敗しました', error);
        }
    }

    /**
     * 監査ログ検索（Admin 専用）
     */
    async search(
        tenantId: string,
        filters?: {
            targetType?: string;
            targetId?: string;
            actorId?: string;
            actionType?: string;
            from?: Date;
            to?: Date;
        },
        page = 1,
        pageSize = 50,
    ) {
        const where: any = { tenantId };

        if (filters?.targetType) where.targetType = filters.targetType;
        if (filters?.targetId) where.targetId = filters.targetId;
        if (filters?.actorId) where.actorId = filters.actorId;
        if (filters?.actionType) where.actionType = filters.actionType;
        if (filters?.from || filters?.to) {
            where.createdAt = {};
            if (filters.from) where.createdAt.gte = filters.from;
            if (filters.to) where.createdAt.lte = filters.to;
        }

        const [total, logs] = await Promise.all([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        return {
            data: logs,
            meta: { page, pageSize, total },
        };
    }
}
