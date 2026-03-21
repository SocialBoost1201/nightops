import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../../prisma/generated/client';
import { APIError, authenticate, checkTenantStatus, enforceTenantBoundary, requireRoles } from '../middleware';
import { AppErrorCodes } from '../common/error-codes';
import { writeAuditLogFromRequest } from '../common/audit/audit.service';
import { parseDateOnlyString } from '../utils/business-date';

const router = Router();
const prisma = new PrismaClient();

const salesUpdateRoles = requireRoles(['Manager', 'Admin', 'SystemAdmin']);

const buildSalesSlipUpdateData = (payload: Record<string, unknown>) => {
  const updateData: Record<string, unknown> = {};

  if (payload.tableNumber !== undefined) updateData.tableNumber = payload.tableNumber;
  if (payload.headcount !== undefined) updateData.headcount = payload.headcount;
  if (payload.mainCastId !== undefined) updateData.mainCastId = payload.mainCastId || null;
  if (payload.customerId !== undefined) updateData.customerId = payload.customerId || null;
  if (payload.subtotal !== undefined) updateData.subtotal = payload.subtotal;
  if (payload.serviceTaxAmount !== undefined) updateData.serviceTaxAmount = payload.serviceTaxAmount;
  if (payload.totalRounded !== undefined) updateData.totalRounded = payload.totalRounded;
  if (payload.status !== undefined) updateData.status = payload.status;

  if (payload.businessDate !== undefined) {
    const date = parseDateOnlyString(String(payload.businessDate));
    if (!date) {
      throw new APIError(
        422,
        AppErrorCodes.VALIDATION_INVALID_DATE,
        'businessDate は YYYY-MM-DD 形式で指定してください。',
        'businessDate',
      );
    }
    updateData.businessDate = date;
  }

  return updateData;
};

const extractSlipSnapshot = (slip: {
  id: string;
  tenantId: string;
  businessDate: Date;
  tableNumber: string;
  headcount: number;
  subtotal: number;
  serviceTaxAmount: number;
  totalRounded: number;
  status: string;
  mainCastId: string | null;
  customerId: string | null;
}) => {
  return {
    id: slip.id,
    tenantId: slip.tenantId,
    businessDate: slip.businessDate,
    tableNumber: slip.tableNumber,
    headcount: slip.headcount,
    subtotal: slip.subtotal,
    serviceTaxAmount: slip.serviceTaxAmount,
    totalRounded: slip.totalRounded,
    status: slip.status,
    mainCastId: slip.mainCastId,
    customerId: slip.customerId,
  };
};

router.patch(
  '/:id',
  authenticate,
  checkTenantStatus,
  salesUpdateRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const existing = await prisma.salesSlip.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Sales slip not found');
      }

      if (existing.tenantId !== user.tenantId && user.role !== 'SystemAdmin') {
        throw new APIError(403, AppErrorCodes.TENANT_MISMATCH, 'Tenant boundary violation');
      }

      const updateData = buildSalesSlipUpdateData(req.body ?? {});
      if (Object.keys(updateData).length === 0) {
        throw new APIError(400, AppErrorCodes.VALIDATION_INVALID_RANGE, 'No updatable fields provided');
      }

      const before = extractSlipSnapshot(existing);
      const updated = await prisma.$transaction(async (tx) => {
        const changed = await tx.salesSlip.update({
          where: { id },
          data: updateData,
        });

        await writeAuditLogFromRequest(tx, req, {
          action: 'UPDATE_SALES_SLIP',
          resourceType: 'SalesSlip',
          resourceId: changed.id,
          tenantId: changed.tenantId,
          before,
          after: extractSlipSnapshot(changed),
          reason: req.body?.reason ?? null,
          requireReason: true,
        }, 'strict');

        return changed;
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/change-requests/:id/approve',
  authenticate,
  checkTenantStatus,
  salesUpdateRoles,
  enforceTenantBoundary,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const changeRequest = await prisma.changeRequest.findUnique({
        where: { id },
      });

      if (!changeRequest) {
        throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Change request not found');
      }

      if (changeRequest.tenantId !== user.tenantId && user.role !== 'SystemAdmin') {
        throw new APIError(403, AppErrorCodes.TENANT_MISMATCH, 'Tenant boundary violation');
      }

      if (changeRequest.status !== 'pending') {
        throw new APIError(409, AppErrorCodes.CONFLICT, 'Change request is already resolved');
      }

      if (changeRequest.targetType !== 'SalesSlip') {
        throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'Only SalesSlip change requests can be approved');
      }

      const targetSlip = await prisma.salesSlip.findUnique({
        where: { id: changeRequest.targetId },
      });
      if (!targetSlip) {
        throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Target sales slip not found');
      }

      const updateData = buildSalesSlipUpdateData((req.body?.patch ?? {}) as Record<string, unknown>);
      if (Object.keys(updateData).length === 0) {
        throw new APIError(400, AppErrorCodes.VALIDATION_INVALID_RANGE, 'patch is required to approve sales change request', 'patch');
      }

      const beforeSlip = extractSlipSnapshot(targetSlip);

      const result = await prisma.$transaction(async (tx) => {
        const updatedSlip = await tx.salesSlip.update({
          where: { id: targetSlip.id },
          data: updateData,
        });

        const approvedRequest = await tx.changeRequest.update({
          where: { id: changeRequest.id },
          data: {
            status: 'approved',
            approvedBy: String(user.id),
            approvedAt: new Date(),
          },
        });

        await writeAuditLogFromRequest(tx, req, {
          action: 'APPROVE_SALES_CHANGE_REQUEST',
          resourceType: 'ChangeRequest',
          resourceId: approvedRequest.id,
          tenantId: changeRequest.tenantId,
          before: {
            request: {
              id: changeRequest.id,
              status: changeRequest.status,
              targetType: changeRequest.targetType,
              targetId: changeRequest.targetId,
              reason: changeRequest.reason,
            },
            salesSlip: beforeSlip,
          },
          after: {
            request: {
              id: approvedRequest.id,
              status: approvedRequest.status,
              approvedBy: approvedRequest.approvedBy,
              approvedAt: approvedRequest.approvedAt,
            },
            salesSlip: extractSlipSnapshot(updatedSlip),
          },
          reason: req.body?.reason ?? changeRequest.reason ?? null,
          requireReason: true,
        }, 'strict');

        return {
          changeRequest: approvedRequest,
          salesSlip: updatedSlip,
        };
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
