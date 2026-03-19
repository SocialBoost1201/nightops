import {
    Injectable,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RequestUser } from '../../common';
import {
    calculateTotalPay,
} from '@nightops/shared';
import type { PayType } from '@nightops/shared';

@Injectable()
export class PayrollService {
    private readonly logger = new Logger(PayrollService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditLogService: AuditLogService,
    ) {}

    /**
     * 月次給与計算（対象期間の全キャストを一括計算）
     */
    async calculate(user: RequestUser, yearMonth: string) {
        // yearMonth = "2026-03" 形式
        const [year, month] = yearMonth.split('-').map(Number);
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0); // 月末

        // 月次締め済みか確認
        const monthlyClose = await this.prisma.monthlyClose.findFirst({
            where: {
                tenantId: user.tenantId,
                month: yearMonth,
            },
        });

        if (monthlyClose && monthlyClose.status === 'closed') {
            throw new ConflictException({
                error: { code: 'CLOSE_001', message: '既に月次締め済みです' },
            });
        }

        // 対象キャスト一覧
        const accounts = await this.prisma.account.findMany({
            where: {
                tenantId: user.tenantId,
                userProfile: { userType: 'cast' },
                status: 'active',
            },
            include: { userProfile: true },
        });

        const results = [];

        for (const account of accounts) {
            // 報酬プラン取得（現在有効なもの）
            const plan = await this.prisma.compensationPlan.findFirst({
                where: {
                    tenantId: user.tenantId,
                    accountId: account.id,
                    effectiveFrom: { lte: periodEnd },
                    OR: [
                        { effectiveTo: null },
                        { effectiveTo: { gte: periodStart } },
                    ],
                },
                orderBy: { effectiveFrom: 'desc' },
            });

            if (!plan) continue;

            // 出退勤データから実働時間を計算
            const checkins = await this.prisma.punchEvent.findMany({
                where: {
                    tenantId: user.tenantId,
                    accountId: account.id,
                    type: 'checkin',
                    businessDate: { gte: periodStart, lte: periodEnd },
                },
            });

            const castCheckouts = await this.prisma.castCheckout.findMany({
                where: {
                    tenantId: user.tenantId,
                    accountId: account.id,
                    businessDate: { gte: periodStart, lte: periodEnd },
                },
            });

            // 実働時間（分単位）
            let totalMinutes = 0;
            for (const ci of checkins) {
                const co = castCheckouts.find(
                    (c: typeof castCheckouts[number]) =>
                        c.businessDate.getTime() === ci.businessDate.getTime(),
                );
                if (co && ci.timestamp) {
                    // checkin timestampからcheckoutTimeまでの分数を計算
                    const ciTime = ci.timestamp;
                    const [coH, coM] = co.checkoutTime.split(':').map(Number);
                    // coはあがり時間（HH:MM）、checkoutは翌日の可能性あり
                    const coDate = new Date(ci.businessDate);
                    coDate.setHours(coH, coM, 0, 0);
                    if (coDate < ciTime) {
                        coDate.setDate(coDate.getDate() + 1); // 翌日跨ぎ
                    }
                    totalMinutes += Math.max(0, (coDate.getTime() - ciTime.getTime()) / 60000);
                }
            }

            // 売上データ（本指名）
            const slips = await this.prisma.salesSlip.findMany({
                where: {
                    tenantId: user.tenantId,
                    mainCastId: account.id,
                    businessDate: { gte: periodStart, lte: periodEnd },
                },
            });

            const personalSales = slips.reduce(
                (sum: number, s: typeof slips[number]) => sum + s.subtotal, 0,
            );
            const nominationCount = slips.length;

            // ドリンク杯数
            const drinks = await this.prisma.drinkCount.findMany({
                where: {
                    tenantId: user.tenantId,
                    castId: account.id,
                    salesSlip: {
                        businessDate: { gte: periodStart, lte: periodEnd },
                    },
                },
            });
            const totalDrinks = drinks.reduce(
                (sum: number, d: typeof drinks[number]) => sum + d.cups, 0,
            );

            // 給与計算（shared パッケージの関数を使用）
            const payrollResult = calculateTotalPay({
                payType: plan.payType as PayType,
                totalMinutes: Math.round(totalMinutes),
                hourlyRate: plan.hourlyRate ?? 0,
                salesSubtotal: personalSales,
                commissionRate: plan.commissionRate?.toNumber() ?? 0,
                inhouseCount: 0, // 場内指名は別途集計が必要
                inhouseUnit: plan.inhouseUnit ?? 1000,
                drinkCount: totalDrinks,
                drinkUnit: plan.drinkUnit ?? 100,
                allowance: 0,
                deduction: 0,
            });

            results.push({
                accountId: account.id,
                displayName: account.userProfile?.displayName,
                payType: plan.payType,
                totalMinutes: Math.round(totalMinutes),
                personalSales,
                nominationCount,
                totalDrinks,
                basePay: payrollResult.hourlyPay + payrollResult.commission,
                backPay: payrollResult.inhouseBack + payrollResult.drinkBack,
                totalPay: payrollResult.totalPay,
            });
        }

        return {
            yearMonth,
            results,
            totalPayroll: results.reduce((sum, r) => sum + r.totalPay, 0),
        };
    }

    /**
     * 月次締め（給与確定）
     */
    async monthlyClose(user: RequestUser, yearMonth: string) {
        const existing = await this.prisma.monthlyClose.findFirst({
            where: { tenantId: user.tenantId, month: yearMonth },
        });

        if (existing && existing.status === 'closed') {
            throw new ConflictException({
                error: { code: 'CLOSE_001', message: '既に月次締め済みです' },
            });
        }

        let closeRecord;
        if (existing) {
            closeRecord = await this.prisma.monthlyClose.update({
                where: { id: existing.id },
                data: {
                    status: 'closed',
                    closedBy: user.id,
                    closedAt: new Date(),
                },
            });
        } else {
            closeRecord = await this.prisma.monthlyClose.create({
                data: {
                    tenantId: user.tenantId,
                    month: yearMonth,
                    status: 'closed',
                    closedBy: user.id,
                    closedAt: new Date(),
                },
            });
        }

        await this.auditLogService.log({
            user,
            actionType: 'MONTHLY_CLOSE',
            targetType: 'MonthlyClose',
            targetId: closeRecord.id,
            afterData: { yearMonth },
        });

        return { closeId: closeRecord.id, yearMonth, status: 'closed' };
    }
}
