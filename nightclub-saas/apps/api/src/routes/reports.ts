import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../../prisma/generated/client';
import { APIError, authenticate, checkTenantStatus, enforceTenantBoundary, requireRoles } from '../middleware';
import { AppErrorCodes } from '../common/error-codes';
import { writeAuditLogFromRequest } from '../common/audit/audit.service';
import {
  getCurrentMonthDateRange,
  getTodayBusinessDateString,
  MVP_TIMEZONE,
  parseDateOnlyString,
} from '../utils/business-date';

const router = Router();
const prisma = new PrismaClient();

const reportRoles = requireRoles(['Manager', 'Admin', 'SystemAdmin']);
const financeCloseRoles = requireRoles(['Admin', 'SystemAdmin']);

const resolveTargetTenantId = (req: Request): string => {
  const user = (req as any).user;
  if (user.role === 'SystemAdmin' && req.query.tenantId) {
    return String(req.query.tenantId);
  }
  if (user.role === 'SystemAdmin' && req.body?.tenantId) {
    return String(req.body.tenantId);
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

const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;

const resolveMonthRange = (monthValue: unknown): { month: string; fromDate: Date; toDate: Date } => {
  if (!monthValue) {
    throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'month is required', 'month');
  }
  const month = String(monthValue);
  const match = month.match(YEAR_MONTH_RE);
  if (!match) {
    throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'month must be YYYY-MM format', 'month');
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'month must be YYYY-MM format', 'month');
  }

  const fromDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const toDate = new Date(Date.UTC(year, monthNumber, 0));
  return { month, fromDate, toDate };
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

router.post(
  '/close/daily',
  authenticate,
  checkTenantStatus,
  reportRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenantId = resolveTargetTenantId(req);
      const { date, dateString } = resolveBusinessDate(req.body?.businessDate ?? req.query.businessDate);
      const cashActual = Number(req.body?.cashActual);
      if (!Number.isFinite(cashActual)) {
        throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'cashActual is required', 'cashActual');
      }

      const existingClose = await prisma.dailyClose.findUnique({
        where: {
          uq_daily_closes_tenant_date: {
            tenantId,
            businessDate: date,
          },
        },
      });

      if (existingClose?.status === 'closed') {
        throw new APIError(409, AppErrorCodes.CONFLICT, 'This businessDate is already closed');
      }

      const slips = await prisma.salesSlip.findMany({
        where: {
          tenantId,
          businessDate: date,
        },
      });
      const totalSales = slips.reduce((sum, slip) => sum + slip.totalRounded, 0);
      const cashExpected = totalSales;
      const difference = Math.round(cashActual - cashExpected);
      const hasDifference = difference !== 0;

      const close = await prisma.$transaction(async (tx) => {
        const closed = await tx.dailyClose.upsert({
          where: {
            uq_daily_closes_tenant_date: {
              tenantId,
              businessDate: date,
            },
          },
          update: {
            status: 'closed',
            closedBy: String(user.id),
            closedAt: new Date(),
          },
          create: {
            tenantId,
            businessDate: date,
            status: 'closed',
            closedBy: String(user.id),
            closedAt: new Date(),
          },
        });

        await writeAuditLogFromRequest(tx, req, {
          action: 'DAILY_CLOSE',
          resourceType: 'DailyClose',
          resourceId: closed.id,
          tenantId,
          before: {
            businessDate: dateString,
            status: existingClose?.status ?? 'open',
          },
          after: {
            businessDate: dateString,
            totalSales,
            cashExpected,
            cashActual,
            difference,
            status: 'closed',
            warning: hasDifference ? 'CASH_DIFFERENCE_DETECTED' : null,
          },
          reason: req.body?.reason ?? null,
          requireReason: true,
        }, 'strict');

        return closed;
      });

      res.json({
        closeId: close.id,
        businessDate: dateString,
        status: close.status,
        totalSales,
        cashExpected,
        cashActual,
        difference,
        warning: hasDifference ? 'CASH_DIFFERENCE_DETECTED' : null,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/close/monthly',
  authenticate,
  checkTenantStatus,
  financeCloseRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenantId = resolveTargetTenantId(req);
      const { month, fromDate, toDate } = resolveMonthRange(req.body?.month ?? req.query.month);

      const existingClose = await prisma.monthlyClose.findUnique({
        where: {
          uq_monthly_closes_tenant_month: {
            tenantId,
            month,
          },
        },
      });
      if (existingClose?.status === 'closed') {
        throw new APIError(409, AppErrorCodes.CONFLICT, 'This month is already confirmed');
      }

      const slips = await prisma.salesSlip.findMany({
        where: {
          tenantId,
          businessDate: {
            gte: fromDate,
            lte: toDate,
          },
        },
      });
      const totalSales = slips.reduce((sum, slip) => sum + slip.totalRounded, 0);

      const confirmed = await prisma.$transaction(async (tx) => {
        const close = await tx.monthlyClose.upsert({
          where: {
            uq_monthly_closes_tenant_month: {
              tenantId,
              month,
            },
          },
          update: {
            status: 'closed',
            closedBy: String(user.id),
            closedAt: new Date(),
          },
          create: {
            tenantId,
            month,
            status: 'closed',
            closedBy: String(user.id),
            closedAt: new Date(),
          },
        });

        await writeAuditLogFromRequest(tx, req, {
          action: 'MONTHLY_CONFIRM',
          resourceType: 'MonthlyClose',
          resourceId: close.id,
          tenantId,
          before: {
            month,
            status: existingClose?.status ?? 'open',
          },
          after: {
            month,
            totalSales,
            confirmed: true,
            status: 'closed',
          },
          reason: req.body?.reason ?? null,
          requireReason: true,
        }, 'strict');

        return close;
      });

      res.json({
        closeId: confirmed.id,
        month,
        status: confirmed.status,
        totalSales,
        confirmed: true,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/close/monthly/unlock',
  authenticate,
  checkTenantStatus,
  financeCloseRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = resolveTargetTenantId(req);
      const { month } = resolveMonthRange(req.body?.month ?? req.query.month);

      const existingClose = await prisma.monthlyClose.findUnique({
        where: {
          uq_monthly_closes_tenant_month: {
            tenantId,
            month,
          },
        },
      });
      if (!existingClose || existingClose.status !== 'closed') {
        throw new APIError(409, AppErrorCodes.CONFLICT, 'This month is not in confirmed state');
      }

      const unlocked = await prisma.$transaction(async (tx) => {
        const close = await tx.monthlyClose.update({
          where: { id: existingClose.id },
          data: {
            status: 'open',
            closedBy: null,
            closedAt: null,
          },
        });

        await writeAuditLogFromRequest(tx, req, {
          action: 'MONTHLY_UNLOCK',
          resourceType: 'MonthlyClose',
          resourceId: close.id,
          tenantId,
          before: {
            month,
            status: existingClose.status,
          },
          after: {
            month,
            status: close.status,
            confirmed: false,
          },
          reason: req.body?.reason ?? null,
          requireReason: true,
        }, 'strict');

        return close;
      });

      res.json({
        closeId: unlocked.id,
        month,
        status: unlocked.status,
        confirmed: false,
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
