import {
    Injectable,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common';

@Injectable()
export class ReportService {
    private readonly logger = new Logger(ReportService.name);
    private readonly dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;

    constructor(private readonly prisma: PrismaService) {}

    private formatDate(date: Date): string {
        return date.toISOString().slice(0, 10);
    }

    private todayDateString(): string {
        return this.formatDate(new Date());
    }

    private parseDateParam(paramName: string, value: string): Date {
        const match = value.match(this.dateRegex);
        if (!match) {
            throw new BadRequestException({
                error: {
                    code: 'VALID_002',
                    message: `${paramName} は YYYY-MM-DD 形式で入力してください`,
                },
            });
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const parsed = new Date(Date.UTC(year, month - 1, day));

        if (
            parsed.getUTCFullYear() !== year ||
            parsed.getUTCMonth() !== month - 1 ||
            parsed.getUTCDate() !== day
        ) {
            throw new BadRequestException({
                error: {
                    code: 'VALID_002',
                    message: `${paramName} は存在する日付で指定してください`,
                },
            });
        }

        return new Date(`${value}T00:00:00.000Z`);
    }

    private getCurrentMonthRange(): { from: string; to: string } {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() + 1;
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const pad = (n: number) => String(n).padStart(2, '0');

        return {
            from: `${year}-${pad(month)}-01`,
            to: `${year}-${pad(month)}-${pad(lastDay)}`,
        };
    }

    private resolveDateRange(from?: string, to?: string) {
        const defaults = this.getCurrentMonthRange();
        const fromStr = from ?? defaults.from;
        const toStr = to ?? defaults.to;
        const fromDate = this.parseDateParam('from', fromStr);
        const toDate = this.parseDateParam('to', toStr);

        if (fromDate > toDate) {
            throw new BadRequestException({
                error: {
                    code: 'VALID_002',
                    message: 'from は to 以前の日付で指定してください',
                },
            });
        }

        return { fromStr, toStr, fromDate, toDate };
    }

    /**
     * 日別売上集計
     */
    async dailySummary(user: RequestUser, businessDate?: string) {
        const dateStr = businessDate ?? this.todayDateString();
        const date = this.parseDateParam('businessDate', dateStr);

        const slips = await this.prisma.salesSlip.findMany({
            where: {
                tenantId: user.tenantId,
                businessDate: date,
            },
        });

        const totalSales = slips.reduce((sum: number, s: typeof slips[number]) => sum + s.totalRounded, 0);
        const totalSubtotal = slips.reduce((sum: number, s: typeof slips[number]) => sum + s.subtotal, 0);
        const slipCount = slips.length;
        const avgPerSlip = slipCount > 0 ? Math.round(totalSales / slipCount) : 0;

        return {
            businessDate: dateStr,
            slipCount,
            totalSubtotal,
            totalSales,
            avgPerSlip,
        };
    }

    /**
     * キャスト別売上ランキング（期間指定）
     */
    async castSalesRanking(user: RequestUser, from?: string, to?: string) {
        const { fromStr, toStr, fromDate, toDate } = this.resolveDateRange(from, to);
        const slips = await this.prisma.salesSlip.findMany({
            where: {
                tenantId: user.tenantId,
                businessDate: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
            include: {
                mainCast: {
                    include: { userProfile: true },
                },
            },
        });

        // キャスト別に集計
        const castMap = new Map<string, {
            accountId: string;
            displayName: string;
            totalSales: number;
            slipCount: number;
        }>();

        for (const slip of slips) {
            const castId = slip.mainCastId;
            const existing = castMap.get(castId);

            if (existing) {
                existing.totalSales += slip.totalRounded;
                existing.slipCount += 1;
            } else {
                castMap.set(castId, {
                    accountId: castId,
                    displayName: slip.mainCast.userProfile?.displayName ?? slip.mainCast.loginId,
                    totalSales: slip.totalRounded,
                    slipCount: 1,
                });
            }
        }

        const ranking = Array.from(castMap.values())
            .sort((a, b) => b.totalSales - a.totalSales)
            .map((item, index) => ({ rank: index + 1, ...item }));

        return { period: { from: fromStr, to: toStr }, ranking };
    }

    /**
     * ドリンクランキング（期間指定）
     */
    async drinkRanking(user: RequestUser, from?: string, to?: string) {
        const { fromStr, toStr, fromDate, toDate } = this.resolveDateRange(from, to);
        const drinks = await this.prisma.drinkCount.findMany({
            where: {
                tenantId: user.tenantId,
                salesSlip: {
                    businessDate: {
                        gte: fromDate,
                        lte: toDate,
                    },
                },
            },
            include: {
                cast: {
                    include: { userProfile: true },
                },
            },
        });

        // キャスト別ドリンク合計
        const drinkMap = new Map<string, {
            accountId: string;
            displayName: string;
            totalCups: number;
        }>();

        for (const d of drinks) {
            const castId = d.castId;
            const existing = drinkMap.get(castId);

            if (existing) {
                existing.totalCups += d.cups;
            } else {
                drinkMap.set(castId, {
                    accountId: castId,
                    displayName: d.cast.userProfile?.displayName ?? d.cast.loginId,
                    totalCups: d.cups,
                });
            }
        }

        const ranking = Array.from(drinkMap.values())
            .sort((a, b) => b.totalCups - a.totalCups)
            .map((item, index) => ({ rank: index + 1, ...item }));

        return { period: { from: fromStr, to: toStr }, ranking };
    }

    /**
     * 指名ランキング（本指名回数）
     */
    async nominationRanking(user: RequestUser, from?: string, to?: string) {
        const { fromStr, toStr, fromDate, toDate } = this.resolveDateRange(from, to);
        const slips = await this.prisma.salesSlip.findMany({
            where: {
                tenantId: user.tenantId,
                businessDate: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
            include: {
                mainCast: {
                    include: { userProfile: true },
                },
            },
        });

        // メインキャスト = 本指名回数としてカウント
        const nominationMap = new Map<string, {
            accountId: string;
            displayName: string;
            nominationCount: number;
        }>();

        for (const slip of slips) {
            const castId = slip.mainCastId;
            const existing = nominationMap.get(castId);

            if (existing) {
                existing.nominationCount += 1;
            } else {
                nominationMap.set(castId, {
                    accountId: castId,
                    displayName: slip.mainCast.userProfile?.displayName ?? slip.mainCast.loginId,
                    nominationCount: 1,
                });
            }
        }

        const ranking = Array.from(nominationMap.values())
            .sort((a, b) => b.nominationCount - a.nominationCount)
            .map((item, index) => ({ rank: index + 1, ...item }));

        return { period: { from: fromStr, to: toStr }, ranking };
    }
}
