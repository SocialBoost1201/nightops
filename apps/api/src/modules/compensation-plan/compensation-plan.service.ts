import {
    Injectable,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompensationPlanDto } from './compensation-plan.dto';

@Injectable()
export class CompensationPlanService {
    private readonly logger = new Logger(CompensationPlanService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 報酬プラン作成（期間重複チェック付き）
     */
    async create(tenantId: string, dto: CreateCompensationPlanDto) {
        const effectiveFrom = new Date(dto.effectiveFrom);
        const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

        // 期間重複チェック
        const overlapping = await this.prisma.compensationPlan.findFirst({
            where: {
                tenantId,
                accountId: dto.accountId,
                OR: [
                    // 既存プランの期間内に新規の開始日がある
                    {
                        effectiveFrom: { lte: effectiveFrom },
                        OR: [
                            { effectiveTo: null },
                            { effectiveTo: { gte: effectiveFrom } },
                        ],
                    },
                    // 新規プランの期間内に既存の開始日がある
                    ...(effectiveTo
                        ? [{
                              effectiveFrom: { lte: effectiveTo },
                              OR: [
                                  { effectiveTo: null } as any,
                                  { effectiveTo: { gte: effectiveFrom } } as any,
                              ],
                          }]
                        : []),
                ],
            },
        });

        if (overlapping) {
            throw new ConflictException({
                error: { code: 'PAYROLL_001', message: '報酬プランの適用期間が重複しています' },
            });
        }

        const plan = await this.prisma.compensationPlan.create({
            data: {
                tenantId,
                accountId: dto.accountId,
                payType: dto.payType,
                hourlyRate: dto.hourlyRate ?? null,
                commissionRate: dto.commissionRate ?? null,
                inhouseUnit: dto.inhouseUnit ?? 1000,
                drinkUnit: dto.drinkUnit ?? 100,
                effectiveFrom,
                effectiveTo,
            },
        });

        return plan;
    }

    /**
     * テナント内の報酬プラン一覧
     */
    async list(tenantId: string, accountId?: string) {
        const where: any = { tenantId };
        if (accountId) where.accountId = accountId;

        return this.prisma.compensationPlan.findMany({
            where,
            orderBy: [{ accountId: 'asc' }, { effectiveFrom: 'desc' }],
        });
    }
}
