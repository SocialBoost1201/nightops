import {
    Injectable,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../../common';

@Injectable()
export class ReportService {
    private readonly logger = new Logger(ReportService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * 日別売上集計
     */
    async dailySummary(user: RequestUser, businessDate: string) {
        const date = new Date(businessDate);

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
            businessDate,
            slipCount,
            totalSubtotal,
            totalSales,
            avgPerSlip,
        };
    }

    /**
     * キャスト別売上ランキング（期間指定）
     */
    async castSalesRanking(user: RequestUser, from: string, to: string) {
        const slips = await this.prisma.salesSlip.findMany({
            where: {
                tenantId: user.tenantId,
                businessDate: {
                    gte: new Date(from),
                    lte: new Date(to),
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

        return { period: { from, to }, ranking };
    }

    /**
     * ドリンクランキング（期間指定）
     */
    async drinkRanking(user: RequestUser, from: string, to: string) {
        const drinks = await this.prisma.drinkCount.findMany({
            where: {
                tenantId: user.tenantId,
                salesSlip: {
                    businessDate: {
                        gte: new Date(from),
                        lte: new Date(to),
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

        return { period: { from, to }, ranking };
    }

    /**
     * 指名ランキング（本指名回数）
     */
    async nominationRanking(user: RequestUser, from: string, to: string) {
        const slips = await this.prisma.salesSlip.findMany({
            where: {
                tenantId: user.tenantId,
                businessDate: {
                    gte: new Date(from),
                    lte: new Date(to),
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

        return { period: { from, to }, ranking };
    }
}
