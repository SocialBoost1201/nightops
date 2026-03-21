import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../../prisma/generated/client';
import { APIError, authenticate, checkTenantStatus, enforceTenantBoundary, requireRoles } from '../middleware';
import { AppErrorCodes } from '../common/error-codes';
import {
  getCurrentMonthDateRange,
  getTodayBusinessDateString,
  MVP_TIMEZONE,
  parseDateOnlyString,
} from '../utils/business-date';

const router = Router();
const prisma = new PrismaClient();

const reportRoles = requireRoles(['Manager', 'Admin', 'SystemAdmin']);

const resolveTargetTenantId = (req: Request): string => {
  const user = (req as any).user;
  if (user.role === 'SystemAdmin' && req.query.tenantId) {
    return String(req.query.tenantId);
  }
  return user.tenantId;
};

const resolveBusinessDate = (businessDateQuery: unknown): { date: Date; dateString: string } => {
  const dateString = businessDateQuery ? String(businessDateQuery) : getTodayBusinessDateString(MVP_TIMEZONE);
  const date = parseDateOnlyString(dateString);
  if (!date) {
    throw new APIError(
      422,
      AppErrorCodes.REPORT_INVALID_BUSINESS_DATE,
      '日付形式が不正です。YYYY-MM-DD 形式で指定してください。',
      'businessDate',
    );
  }

  return { date, dateString };
};

const resolveDateRange = (fromQuery: unknown, toQuery: unknown) => {
  const defaults = getCurrentMonthDateRange(MVP_TIMEZONE);
  const fromString = fromQuery ? String(fromQuery) : defaults.from;
  const toString = toQuery ? String(toQuery) : defaults.to;
  const fromDate = parseDateOnlyString(fromString);
  const toDate = parseDateOnlyString(toString);

  if (!fromDate) {
    throw new APIError(
      422,
      AppErrorCodes.VALIDATION_INVALID_DATE,
      '日付形式が不正です。YYYY-MM-DD 形式で指定してください。',
      'from',
    );
  }

  if (!toDate) {
    throw new APIError(
      422,
      AppErrorCodes.VALIDATION_INVALID_DATE,
      '日付形式が不正です。YYYY-MM-DD 形式で指定してください。',
      'to',
    );
  }

  if (fromDate.getTime() > toDate.getTime()) {
    throw new APIError(
      422,
      AppErrorCodes.REPORT_INVALID_RANGE,
      'from は to 以前の日付で指定してください。',
      'from',
    );
  }

  return { fromString, toString, fromDate, toDate };
};

/**
 * GET /reports/daily
 * businessDate は店舗営業日（MVPでは Asia/Tokyo）として扱う。
 */
router.get(
  '/daily',
  authenticate,
  checkTenantStatus,
  reportRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, dateString } = resolveBusinessDate(req.query.businessDate);
      const tenantId = resolveTargetTenantId(req);

      const slips = await prisma.salesSlip.findMany({
        where: {
          tenantId,
          businessDate: date,
        },
      });

      const slipCount = slips.length;
      const totalSubtotal = slips.reduce((sum, slip) => sum + slip.subtotal, 0);
      const totalSales = slips.reduce((sum, slip) => sum + slip.totalRounded, 0);
      const avgPerSlip = slipCount > 0 ? Math.round(totalSales / slipCount) : 0;

      res.json({
        businessDate: dateString,
        slipCount,
        totalSubtotal,
        totalSales,
        avgPerSlip,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/ranking/sales',
  authenticate,
  checkTenantStatus,
  reportRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = resolveTargetTenantId(req);
      const { fromDate, toDate, fromString, toString } = resolveDateRange(req.query.from, req.query.to);

      const slips = await prisma.salesSlip.findMany({
        where: {
          tenantId,
          businessDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
        include: {
          mainCast: {
            include: {
              userProfile: true,
            },
          },
        },
      });

      const map = new Map<string, { accountId: string; displayName: string; totalSales: number; slipCount: number }>();

      for (const slip of slips) {
        if (!slip.mainCastId || !slip.mainCast) continue;
        const accountId = slip.mainCastId;
        const existing = map.get(accountId);
        if (existing) {
          existing.totalSales += slip.totalRounded;
          existing.slipCount += 1;
          continue;
        }

        map.set(accountId, {
          accountId,
          displayName: slip.mainCast.userProfile?.displayName ?? slip.mainCast.loginId,
          totalSales: slip.totalRounded,
          slipCount: 1,
        });
      }

      const ranking = Array.from(map.values())
        .sort((a, b) => b.totalSales - a.totalSales)
        .map((item, index) => ({ rank: index + 1, ...item }));

      res.json({
        period: { from: fromString, to: toString },
        ranking,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/ranking/drinks',
  authenticate,
  checkTenantStatus,
  reportRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = resolveTargetTenantId(req);
      const { fromDate, toDate, fromString, toString } = resolveDateRange(req.query.from, req.query.to);

      const drinks = await prisma.drinkCount.findMany({
        where: {
          tenantId,
          businessDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
        include: {
          account: {
            include: {
              userProfile: true,
            },
          },
        },
      });

      const ranking = drinks
        .map((drink) => ({
          accountId: drink.accountId,
          displayName: drink.account.userProfile?.displayName ?? drink.account.loginId,
          totalDrinks: drink.count,
        }))
        .sort((a, b) => b.totalDrinks - a.totalDrinks)
        .map((item, index) => ({ rank: index + 1, ...item }));

      res.json({
        period: { from: fromString, to: toString },
        ranking,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/ranking/nominations',
  authenticate,
  checkTenantStatus,
  reportRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = resolveTargetTenantId(req);
      const { fromDate, toDate, fromString, toString } = resolveDateRange(req.query.from, req.query.to);

      const slips = await prisma.salesSlip.findMany({
        where: {
          tenantId,
          businessDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
        include: {
          mainCast: {
            include: {
              userProfile: true,
            },
          },
        },
      });

      const map = new Map<string, { accountId: string; displayName: string; nominationCount: number }>();

      for (const slip of slips) {
        if (!slip.mainCastId || !slip.mainCast) continue;
        const accountId = slip.mainCastId;
        const existing = map.get(accountId);
        if (existing) {
          existing.nominationCount += 1;
          continue;
        }

        map.set(accountId, {
          accountId,
          displayName: slip.mainCast.userProfile?.displayName ?? slip.mainCast.loginId,
          nominationCount: 1,
        });
      }

      const ranking = Array.from(map.values())
        .sort((a, b) => b.nominationCount - a.nominationCount)
        .map((item, index) => ({ rank: index + 1, ...item }));

      res.json({
        period: { from: fromString, to: toString },
        ranking,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
