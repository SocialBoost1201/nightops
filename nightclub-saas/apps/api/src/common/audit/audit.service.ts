import { Request } from 'express';
import { Prisma, PrismaClient } from '../../../prisma/generated/client';
import { APIError } from '../../middleware';
import { getCorrelationId } from '../api-contract';
import { AppErrorCodes } from '../error-codes';
import { AuditLogRequestInput, AuditLogWriteInput, AuditSnapshot, AuditWriteMode } from './audit.types';
import { sanitizeAuditPayload } from './audit.utils';

type AuditPrismaLike = Pick<PrismaClient, 'auditLog'>;

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

const normalizeAuditWriteInput = (req: Request, input: AuditLogRequestInput): AuditLogWriteInput => {
  const user = (req as any).user;
  const baseAfter = sanitizeAuditPayload(input.after) as AuditSnapshot;
  const baseBefore = sanitizeAuditPayload(input.before) as AuditSnapshot;

  return {
    ...input,
    tenantId: input.tenantId || user?.tenantId || input.fallbackTenantId,
    actorId: input.actorId ?? user?.id ?? null,
    actorRole: input.actorRole ?? user?.role ?? null,
    correlationId: input.correlationId || getCorrelationId(req),
    ipAddress: input.ipAddress ?? getClientIp(req),
    userAgent: input.userAgent ?? (typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null),
    requestId: input.requestId ?? `${req.method} ${req.originalUrl}`,
    source: input.source ?? 'api',
    result: input.result ?? 'success',
    before: baseBefore ?? null,
    after: baseAfter ?? null,
  };
};

const buildAfterData = (input: AuditLogWriteInput): Record<string, unknown> => {
  return {
    snapshot: input.after ?? null,
    __audit: {
      reason: input.reason ?? null,
      result: input.result ?? 'success',
      source: input.source ?? 'api',
    },
  };
};

const assertReasonIfRequired = (input: AuditLogWriteInput): void => {
  if (!input.requireReason) {
    return;
  }
  if (typeof input.reason === 'string' && input.reason.trim().length > 0) {
    return;
  }
  throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'reason is required for this operation', 'reason');
};

export const writeAuditLog = async (
  prisma: AuditPrismaLike,
  input: AuditLogWriteInput,
  mode: AuditWriteMode = 'best_effort',
): Promise<void> => {
  assertReasonIfRequired(input);

  if (!input.tenantId) {
    throw new APIError(400, AppErrorCodes.VALIDATION_INVALID_RANGE, 'tenantId is required for audit log', 'tenantId');
  }

  try {
    const beforeData = input.before === undefined || input.before === null
      ? Prisma.JsonNull
      : (sanitizeAuditPayload(input.before) as Prisma.InputJsonValue);
    const afterData = buildAfterData(input) as Prisma.InputJsonValue;

    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        actionType: input.action,
        targetType: input.resourceType,
        targetId: input.resourceId ?? null,
        beforeData,
        afterData,
        requestId: input.requestId ?? null,
        correlationId: input.correlationId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    if (mode === 'strict') {
      throw new APIError(500, AppErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to persist audit log for critical action');
    }
    console.error('Best-effort audit log write failed:', error);
  }
};

export const writeAuditLogFromRequest = async (
  prisma: AuditPrismaLike,
  req: Request,
  input: AuditLogRequestInput,
  mode: AuditWriteMode = 'best_effort',
): Promise<void> => {
  const normalized = normalizeAuditWriteInput(req, input);
  await writeAuditLog(prisma, normalized, mode);
};
