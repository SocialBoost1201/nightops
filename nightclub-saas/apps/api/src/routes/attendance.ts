import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../../prisma/generated/client';
import { APIError, authenticate, requireRoles, enforceTenantBoundary } from '../middleware';
import { AppErrorCodes } from '../common/error-codes';

const router = Router();
const prisma = new PrismaClient();

// =======================
// シフトルーター (M2)
// =======================

/**
 * POST /attendance/shifts
 * Cast / Staff が自分のシフトを申請する
 * Manager / Admin / SystemAdmin も登録可能（他アカウント分も可）
 */
router.post(
  '/shifts',
  authenticate,
  requireRoles(['Cast', 'Staff', 'Manager', 'Admin', 'SystemAdmin']),
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { accountId, targetDate, startTime, endTime, submissionNote, isWorking } = req.body;

      // Cast / Staff は自分のシフトのみ申請可
      const targetAccountId = accountId ?? user.id;
      if (
        (user.role === 'Cast' || user.role === 'Staff') &&
        targetAccountId !== user.id
      ) {
        return next(new APIError(403, AppErrorCodes.ACCESS_DENIED, 'Cannot register shift for another account'));
      }

      if (!targetDate) {
        return next(new APIError(400, AppErrorCodes.VALIDATION_INVALID_RANGE, 'targetDate is required'));
      }

      const shift = await prisma.shiftEntry.create({
        data: {
          tenantId: user.tenantId,
          accountId: targetAccountId,
          targetDate: new Date(targetDate),
          isWorking: isWorking ?? true,
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          submissionNote: submissionNote ?? null,
          status: 'pending',
        },
      });

      res.status(201).json(shift);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /attendance/shifts
 * Manager / Admin / SystemAdmin が一覧を取得する
 * Cast / Staff は自分の分のみ
 */
router.get(
  '/shifts',
  authenticate,
  requireRoles(['Cast', 'Staff', 'Manager', 'Admin', 'SystemAdmin']),
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const targetTenantId =
        user.role === 'SystemAdmin' && req.query.tenantId
          ? String(req.query.tenantId)
          : user.tenantId;

      const where: any = { tenantId: targetTenantId };

      // Cast / Staff は自分のシフトのみ
      if (user.role === 'Cast' || user.role === 'Staff') {
        where.accountId = user.id;
      }

      // 日付フィルタ（オプション）
      if (req.query.targetDate) {
        where.targetDate = new Date(String(req.query.targetDate));
      }

      // Manager以上は特定アカウントでフィルタ可能
      if (req.query.accountId && ['Manager', 'Admin', 'SystemAdmin'].includes(user.role)) {
        where.accountId = String(req.query.accountId);
      }

      const shifts = await prisma.shiftEntry.findMany({
        where,
        orderBy: [{ targetDate: 'asc' }],
      });

      res.json(shifts);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /attendance/shifts/status
 * Manager / Admin が一括承認・却下する
 */
router.put(
  '/shifts/status',
  authenticate,
  requireRoles(['Manager', 'Admin', 'SystemAdmin']),
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { shiftIds, status, managerNote } = req.body;

      if (!shiftIds || !Array.isArray(shiftIds) || shiftIds.length === 0) {
        return next(new APIError(400, AppErrorCodes.VALIDATION_INVALID_RANGE, 'shiftIds must be a non-empty array'));
      }

      const allowedStatuses = ['approved', 'rejected'];
      if (!allowedStatuses.includes(status)) {
        return next(
          new APIError(400, AppErrorCodes.VALIDATION_INVALID_RANGE, `status must be one of: ${allowedStatuses.join(', ')}`)
        );
      }

      // テナント所有確認
      const existingShifts = await prisma.shiftEntry.findMany({
        where: { id: { in: shiftIds } },
        select: { id: true, tenantId: true },
      });

      const foreignIds = existingShifts
        .filter((s) => s.tenantId !== user.tenantId && user.role !== 'SystemAdmin')
        .map((s) => s.id);

      if (foreignIds.length > 0) {
        return next(new APIError(403, AppErrorCodes.TENANT_MISMATCH, 'Tenant boundary violation'));
      }

      const updated = await prisma.shiftEntry.updateMany({
        where: {
          id: { in: shiftIds },
          ...(user.role !== 'SystemAdmin' ? { tenantId: user.tenantId } : {}),
        },
        data: {
          status,
          ...(managerNote ? { managerNote } : {}),
        },
      });

      res.json({ updated: updated.count });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
