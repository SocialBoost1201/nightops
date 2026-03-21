import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
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

const MONTHLY_UNLOCK_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

type MonthlyUnlockRequestRow = {
  id: string;
  tenantId: string;
  month: string;
  requesterId: string;
  approverId: string | null;
  rejectorId: string | null;
  reason: string;
  status: string;
  createdAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
};

const validateUnlockReason = (reasonValue: unknown): string => {
  const reason = typeof reasonValue === 'string' ? reasonValue.trim() : '';
  if (reason.length < 10) {
    throw new APIError(
      422,
      AppErrorCodes.VALIDATION_INVALID_RANGE,
      'reason must be at least 10 characters for monthly unlock request',
      'reason',
    );
  }
  return reason;
};

const findMonthlyUnlockRequestById = async (
  tx: Pick<PrismaClient, '$queryRaw'>,
  requestId: string,
): Promise<MonthlyUnlockRequestRow | null> => {
  const rows = await tx.$queryRaw<MonthlyUnlockRequestRow[]>`
    SELECT
      unlock_request_id AS "id",
      tenant_id AS "tenantId",
      month,
      requester_id AS "requesterId",
      approver_id AS "approverId",
      rejector_id AS "rejectorId",
      reason,
      status,
      created_at AS "createdAt",
      approved_at AS "approvedAt",
      rejected_at AS "rejectedAt"
    FROM unlock_requests
    WHERE unlock_request_id = ${requestId}::uuid
    LIMIT 1
  `;

  return rows[0] ?? null;
};

const findPendingMonthlyUnlockRequest = async (
  tx: Pick<PrismaClient, '$queryRaw'>,
  tenantId: string,
  month: string,
): Promise<MonthlyUnlockRequestRow | null> => {
  const rows = await tx.$queryRaw<MonthlyUnlockRequestRow[]>`
    SELECT
      unlock_request_id AS "id",
      tenant_id AS "tenantId",
      month,
      requester_id AS "requesterId",
      approver_id AS "approverId",
      rejector_id AS "rejectorId",
      reason,
      status,
      created_at AS "createdAt",
      approved_at AS "approvedAt",
      rejected_at AS "rejectedAt"
    FROM unlock_requests
    WHERE tenant_id = ${tenantId}
      AND month = ${month}
      AND status = ${MONTHLY_UNLOCK_STATUS.PENDING}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
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
  '/close/monthly/unlock/request',
  authenticate,
  checkTenantStatus,
  financeCloseRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenantId = resolveTargetTenantId(req);
      const { month } = resolveMonthRange(req.body?.month ?? req.query.month);
      const reason = validateUnlockReason(req.body?.reason);

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

      const unlockRequest = await prisma.$transaction(async (tx) => {
        const pending = await findPendingMonthlyUnlockRequest(tx, tenantId, month);
        if (pending) {
          throw new APIError(409, AppErrorCodes.CONFLICT, 'An unlock request is already pending for this month');
        }

        const requestId = randomUUID();
        const rows = await tx.$queryRaw<MonthlyUnlockRequestRow[]>`
          INSERT INTO unlock_requests (
            unlock_request_id,
            tenant_id,
            month,
            requester_id,
            reason,
            status,
            created_at,
            approved_at,
            rejector_id,
            rejected_at
          ) VALUES (
            ${requestId}::uuid,
            ${tenantId}::uuid,
            ${month},
            ${String(user.id)}::uuid,
            ${reason},
            ${MONTHLY_UNLOCK_STATUS.PENDING},
            NOW(),
            NULL,
            NULL,
            NULL
          )
          RETURNING
            unlock_request_id AS "id",
            tenant_id AS "tenantId",
            month,
            requester_id AS "requesterId",
            approver_id AS "approverId",
            rejector_id AS "rejectorId",
            reason,
            status,
            created_at AS "createdAt",
            approved_at AS "approvedAt",
            rejected_at AS "rejectedAt"
        `;
        const created = rows[0];
        if (!created) {
          throw new APIError(500, AppErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create unlock request');
        }

        await writeAuditLogFromRequest(tx, req, {
          action: 'REQUEST_MONTHLY_UNLOCK',
          resourceType: 'UnlockRequest',
          resourceId: created.id,
          tenantId,
          before: {
            month,
            monthlyCloseStatus: existingClose.status,
          },
          after: {
            requestId: created.id,
            month,
            status: created.status,
            requesterId: created.requesterId,
          },
          reason,
          requireReason: true,
          auditMeta: {
            approvalFlow: '4-eyes',
            requestId: created.id,
          },
        }, 'strict');

        return created;
      });

      res.json({
        requestId: unlockRequest.id,
        month: unlockRequest.month,
        status: unlockRequest.status,
        requesterId: unlockRequest.requesterId,
        createdAt: unlockRequest.createdAt,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/close/monthly/unlock/approve',
  authenticate,
  checkTenantStatus,
  financeCloseRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenantId = resolveTargetTenantId(req);
      const requestId = String(req.body?.requestId ?? '').trim();

      if (!requestId) {
        throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'requestId is required', 'requestId');
      }

      const unlocked = await prisma.$transaction(async (tx) => {
        const unlockRequest = await findMonthlyUnlockRequestById(tx, requestId);
        if (!unlockRequest) {
          throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Unlock request not found');
        }

        if (unlockRequest.tenantId !== tenantId && user.role !== 'SystemAdmin') {
          throw new APIError(403, AppErrorCodes.TENANT_MISMATCH, 'Tenant boundary violation');
        }

        if (unlockRequest.status !== MONTHLY_UNLOCK_STATUS.PENDING) {
          throw new APIError(409, AppErrorCodes.CONFLICT, 'Unlock request is already resolved');
        }

        if (unlockRequest.requesterId === String(user.id)) {
          throw new APIError(409, AppErrorCodes.CONFLICT, 'Requester cannot approve own unlock request');
        }

        const existingClose = await tx.monthlyClose.findUnique({
          where: {
            uq_monthly_closes_tenant_month: {
              tenantId: unlockRequest.tenantId,
              month: unlockRequest.month,
            },
          },
        });
        if (!existingClose || existingClose.status !== 'closed') {
          throw new APIError(409, AppErrorCodes.CONFLICT, 'This month is not in confirmed state');
        }

        const close = await tx.monthlyClose.update({
          where: { id: existingClose.id },
          data: {
            status: 'open',
            closedBy: null,
            closedAt: null,
          },
        });

        const rows = await tx.$queryRaw<MonthlyUnlockRequestRow[]>`
          UPDATE unlock_requests
          SET
            status = ${MONTHLY_UNLOCK_STATUS.APPROVED},
            approver_id = ${String(user.id)}::uuid,
            approved_at = NOW(),
            rejector_id = NULL,
            rejected_at = NULL
          WHERE unlock_request_id = ${unlockRequest.id}::uuid
          RETURNING
            unlock_request_id AS "id",
            tenant_id AS "tenantId",
            month,
            requester_id AS "requesterId",
            approver_id AS "approverId",
            rejector_id AS "rejectorId",
            reason,
            status,
            created_at AS "createdAt",
            approved_at AS "approvedAt",
            rejected_at AS "rejectedAt"
        `;
        const approvedRequest = rows[0];
        if (!approvedRequest) {
          throw new APIError(500, AppErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to approve unlock request');
        }

        await writeAuditLogFromRequest(tx, req, {
          action: 'APPROVE_MONTHLY_UNLOCK',
          resourceType: 'MonthlyClose',
          resourceId: close.id,
          tenantId: unlockRequest.tenantId,
          before: {
            requestId: unlockRequest.id,
            month: unlockRequest.month,
            status: unlockRequest.status,
            monthlyCloseStatus: existingClose.status,
          },
          after: {
            requestId: unlockRequest.id,
            month: unlockRequest.month,
            unlockRequestStatus: approvedRequest.status,
            approverId: approvedRequest.approverId,
            status: close.status,
            confirmed: false,
            approvalFlow: '4-eyes',
          },
          reason: unlockRequest.reason,
          requireReason: true,
          auditMeta: {
            approvalFlow: '4-eyes',
            requestId: unlockRequest.id,
          },
        }, 'strict');

        return {
          close,
          unlockRequest: approvedRequest,
        };
      });

      res.json({
        closeId: unlocked.close.id,
        month: unlocked.close.month,
        status: unlocked.close.status,
        confirmed: false,
        requestId: unlocked.unlockRequest.id,
        unlockRequestStatus: unlocked.unlockRequest.status,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/close/monthly/unlock/reject',
  authenticate,
  checkTenantStatus,
  financeCloseRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenantId = resolveTargetTenantId(req);
      const requestId = String(req.body?.requestId ?? '').trim();
      const reason = validateUnlockReason(req.body?.reason);

      if (!requestId) {
        throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'requestId is required', 'requestId');
      }

      const rejected = await prisma.$transaction(async (tx) => {
        const unlockRequest = await findMonthlyUnlockRequestById(tx, requestId);
        if (!unlockRequest) {
          throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Unlock request not found');
        }

        if (unlockRequest.tenantId !== tenantId && user.role !== 'SystemAdmin') {
          throw new APIError(403, AppErrorCodes.TENANT_MISMATCH, 'Tenant boundary violation');
        }

        if (unlockRequest.status !== MONTHLY_UNLOCK_STATUS.PENDING) {
          throw new APIError(409, AppErrorCodes.CONFLICT, 'Unlock request is already resolved');
        }

        if (unlockRequest.requesterId === String(user.id)) {
          throw new APIError(409, AppErrorCodes.CONFLICT, 'Requester cannot reject own unlock request');
        }

        const rows = await tx.$queryRaw<MonthlyUnlockRequestRow[]>`
          UPDATE unlock_requests
          SET
            status = ${MONTHLY_UNLOCK_STATUS.REJECTED},
            rejector_id = ${String(user.id)}::uuid,
            rejected_at = NOW(),
            approver_id = NULL,
            approved_at = NULL
          WHERE unlock_request_id = ${unlockRequest.id}::uuid
          RETURNING
            unlock_request_id AS "id",
            tenant_id AS "tenantId",
            month,
            requester_id AS "requesterId",
            approver_id AS "approverId",
            rejector_id AS "rejectorId",
            reason,
            status,
            created_at AS "createdAt",
            approved_at AS "approvedAt",
            rejected_at AS "rejectedAt"
        `;

        const rejectedRequest = rows[0];
        if (!rejectedRequest) {
          throw new APIError(500, AppErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to reject unlock request');
        }

        await writeAuditLogFromRequest(tx, req, {
          action: 'REJECT_MONTHLY_UNLOCK',
          resourceType: 'UnlockRequest',
          resourceId: rejectedRequest.id,
          tenantId: unlockRequest.tenantId,
          before: {
            requestId: unlockRequest.id,
            month: unlockRequest.month,
            status: unlockRequest.status,
          },
          after: {
            requestId: unlockRequest.id,
            month: unlockRequest.month,
            unlockRequestStatus: rejectedRequest.status,
            rejectorId: rejectedRequest.rejectorId,
            rejectedAt: rejectedRequest.rejectedAt,
          },
          reason,
          requireReason: true,
          auditMeta: {
            approvalFlow: '4-eyes',
            requestId: unlockRequest.id,
          },
        }, 'strict');

        return rejectedRequest;
      });

      res.json({
        requestId: rejected.id,
        month: rejected.month,
        unlockRequestStatus: rejected.status,
        rejectorId: rejected.rejectorId,
        rejectedAt: rejected.rejectedAt,
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
