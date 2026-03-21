import express, { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '../prisma/generated/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  APIError,
  authenticate,
  requireRoles,
  enforceTenantBoundary,
  requireSelfOrAdmin,
  errorHandler,
  checkTenantStatus,
  correlationMiddleware,
  responseEnvelope,
} from './middleware';
import cors from 'cors';
import { AppErrorCodes } from './common/error-codes';
import { writeAuditLogFromRequest } from './common/audit/audit.service';

export const app = express();
app.use(correlationMiddleware);
app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(responseEnvelope);

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';

// =======================
// エンドポイント (Step 7: 最小エンドポイント対応)
// =======================

// ヘルスチェック
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ログイン
app.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { loginId, password } = req.body;
        if (!loginId || !password) {
            throw new APIError(400, AppErrorCodes.VALIDATION_INVALID_RANGE, 'loginId and password are required');
        }

        const account = await prisma.account.findUnique({
            where: { loginId },
        });

        if (!account) {
            throw new APIError(401, AppErrorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid credentials');
        }

        if (account.status !== 'active') {
            throw new APIError(403, AppErrorCodes.ACCESS_DENIED, 'Account is deactivated');
        }

        const isMatch = await bcrypt.compare(password, account.passwordHash);
        if (!isMatch) {
            throw new APIError(401, AppErrorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid credentials');
        }

        const payload = { sub: account.id, tenantId: account.tenantId, role: account.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            accessToken: token,
            user: { id: account.id, loginId: account.loginId, role: account.role, tenantId: account.tenantId }
        });
    } catch (error) {
        next(error);
    }
});

// GET /me
app.get('/me', authenticate, checkTenantStatus, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, tenantId } = (req as any).user;
        const account = await prisma.account.findUnique({
            where: { id },
            select: { id: true, loginId: true, role: true, status: true, tenantId: true, createdAt: true }
        });

        if (!account || account.tenantId !== tenantId) {
            throw new APIError(404, AppErrorCodes.NOT_FOUND, 'User not found');
        }

        res.json(account);
    } catch (error) {
        next(error);
    }
});

// =======================
// Admin 専用エンドポイント (Step 7)
// =======================

const adminOnly = requireRoles(['Admin', 'SystemAdmin']);

const MAX_AUDIT_LOG_LIMIT = 100;
const DEFAULT_AUDIT_LOG_LIMIT = 20;
const MAX_WORKFLOW_LIST_LIMIT = 100;
const DEFAULT_WORKFLOW_LIST_LIMIT = 20;
const APPROVAL_TYPE_MONTHLY_UNLOCK = 'MONTHLY_UNLOCK';
const ALLOWED_APPROVAL_TYPES = new Set([APPROVAL_TYPE_MONTHLY_UNLOCK]);
const ALLOWED_UNLOCK_REQUEST_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);
const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;

type AuditSearchItem = {
    id: string;
    action: string;
    actorId: string | null;
    actorRole: string | null;
    tenantId: string;
    resourceType: string | null;
    resourceId: string | null;
    beforeData: Prisma.JsonValue | null;
    afterData: Prisma.JsonValue | null;
    correlationId: string | null;
    createdAt: Date;
    ipAddress?: string;
    userAgent?: string;
};

type PendingApprovalItem = {
    id: string;
    type: string;
    tenantId: string;
    month: string;
    requesterId: string;
    reason: string;
    status: string;
    createdAt: Date;
    correlationId: string | null;
    summary: {
        month: string;
    };
};

type UnlockRequestRow = {
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

type UnlockRequestListItem = {
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
    correlationId: string | null;
};

const getOptionalString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const parsePositiveInt = (value: unknown, field: string, defaultValue: number): number => {
    const raw = getOptionalString(value);
    if (!raw) {
        return defaultValue;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, `${field} must be a positive integer`, field);
    }
    return parsed;
};

const parseDateFilter = (value: unknown, field: string): Date | undefined => {
    const raw = getOptionalString(value);
    if (!raw) {
        return undefined;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_DATE, `${field} must be a valid date`, field);
    }
    return parsed;
};

const isValidAuditActionFilter = (value: string): boolean => /^[A-Z0-9_]+$/.test(value);
const isValidYearMonth = (value: string): boolean => {
    const match = value.match(YEAR_MONTH_RE);
    if (!match) {
        return false;
    }
    const month = Number(match[2]);
    return month >= 1 && month <= 12;
};

const validateDateRange = (from: Date | undefined, to: Date | undefined): void => {
    if (from && to && from.getTime() > to.getTime()) {
        throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'from must be less than or equal to to', 'from');
    }
};

const resolveTargetTenantId = (
    user: { tenantId: string; role: string },
    requestedTenantId: string | undefined,
): string | undefined => {
    if (user.role === 'SystemAdmin') {
        return requestedTenantId;
    }
    return user.tenantId;
};

const parseWorkflowListLimit = (value: unknown): number => {
    const limit = parsePositiveInt(value, 'limit', DEFAULT_WORKFLOW_LIST_LIMIT);
    if (limit > MAX_WORKFLOW_LIST_LIMIT) {
        throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, `limit must be less than or equal to ${MAX_WORKFLOW_LIST_LIMIT}`, 'limit');
    }
    return limit;
};

const buildUnlockRequestWhereClause = (params: {
    tenantId?: string;
    status?: string;
    month?: string;
    requesterId?: string;
    approverId?: string;
    from?: Date;
    to?: Date;
}): { whereSql: string; values: Array<string | Date> } => {
    const values: Array<string | Date> = [];
    const conditions: string[] = [];

    const addCondition = (sql: string, value: string | Date) => {
        values.push(value);
        conditions.push(`${sql} $${values.length}`);
    };

    if (params.tenantId) {
        addCondition('tenant_id =', params.tenantId);
        conditions[conditions.length - 1] += '::uuid';
    }
    if (params.status) {
        addCondition('status =', params.status);
    }
    if (params.month) {
        addCondition('month =', params.month);
    }
    if (params.requesterId) {
        addCondition('requester_id =', params.requesterId);
        conditions[conditions.length - 1] += '::uuid';
    }
    if (params.approverId) {
        addCondition('approver_id =', params.approverId);
        conditions[conditions.length - 1] += '::uuid';
    }
    if (params.from) {
        addCondition('created_at >=', params.from);
    }
    if (params.to) {
        addCondition('created_at <=', params.to);
    }

    return {
        whereSql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        values,
    };
};

// POST /admin/accounts
app.post('/admin/accounts', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { loginId, password, role, tenantId, displayName } = req.body;

        // SystemAdmin は任意のテナントIDを指定可能だが、Adminは自身のテナント内に限定される（enforceTenantBoundaryでガード済）
        const targetTenantId = req.body.tenantId || (req as any).user.tenantId;

        const existing = await prisma.account.findUnique({ where: { loginId } });
        if (existing) {
            throw new APIError(409, AppErrorCodes.CONFLICT, 'loginId already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const account = await prisma.account.create({
            data: {
                tenantId: targetTenantId,
                loginId,
                passwordHash,
                role,
                userProfile: {
                    create: {
                        tenantId: targetTenantId,
                        displayName: displayName || loginId,
                    }
                }
            },
            include: { userProfile: true }
        });

        await writeAuditLogFromRequest(prisma, req, {
            action: 'CREATE_ACCOUNT',
            resourceType: 'Account',
            resourceId: account.id,
            tenantId: targetTenantId,
            after: { loginId, role, status: account.status },
            reason: req.body.reason ?? null,
        }, 'best_effort');

        res.status(201).json({ id: account.id, loginId: account.loginId, role: account.role, tenantId: account.tenantId });
    } catch (error) {
        next(error);
    }
});

// GET /admin/accounts
app.get('/admin/accounts', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetTenantId = req.query.tenantId ? String(req.query.tenantId) : (req as any).user.tenantId;
        const accounts = await prisma.account.findMany({
            where: { tenantId: targetTenantId },
            select: { id: true, loginId: true, role: true, status: true, createdAt: true }
        });
        res.json(accounts);
    } catch (error) {
        next(error);
    }
});

// PATCH /admin/accounts/:id
app.patch('/admin/accounts/:id', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status, role } = req.body;

        const targetAccount = await prisma.account.findUnique({ where: { id } });
        if (!targetAccount) {
            throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Account not found');
        }

        // Tenant check again inside (To be perfectly secure if params don't have tenantId)
        if (targetAccount.tenantId !== (req as any).user.tenantId && (req as any).user.role !== 'SystemAdmin') {
            throw new APIError(403, AppErrorCodes.TENANT_MISMATCH, 'Tenant boundary violation');
        }

        const beforeData = { status: targetAccount.status, role: targetAccount.role };

        const updated = await prisma.$transaction(async (tx) => {
            const changed = await tx.account.update({
                where: { id },
                data: {
                    ...(status && { status }),
                    ...(role && { role }),
                },
                select: { id: true, loginId: true, role: true, status: true }
            });

            await writeAuditLogFromRequest(tx, req, {
                action: 'UPDATE_ACCOUNT',
                resourceType: 'Account',
                resourceId: changed.id,
                tenantId: targetAccount.tenantId,
                before: beforeData,
                after: { status: changed.status, role: changed.role },
                reason: req.body.reason ?? null,
                source: 'system',
                requireReason: true,
            }, 'strict');

            return changed;
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// POST /admin/compensation-plans
app.post('/admin/compensation-plans', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetTenantId = req.body.tenantId || (req as any).user.tenantId;
        const { accountId, type, hourlyRate, commissionRate, salesBackRate, drinkBackRate, jonaiBackRate, effectiveFrom } = req.body;

        const plan = await prisma.$transaction(async (tx) => {
            const created = await tx.compensationPlan.create({
                data: {
                    tenantId: targetTenantId,
                    accountId,
                    type,
                    hourlyRate,
                    commissionRate,
                    salesBackRate,
                    drinkBackRate,
                    jonaiBackRate,
                    effectiveFrom: new Date(effectiveFrom)
                }
            });

            await writeAuditLogFromRequest(tx, req, {
                action: 'CREATE_COMPENSATION_PLAN',
                resourceType: 'CompensationPlan',
                resourceId: created.id,
                tenantId: targetTenantId,
                before: null,
                after: created,
                reason: req.body.reason ?? null,
                requireReason: true,
            }, 'strict');

            return created;
        });

        res.status(201).json(plan);
    } catch (error) {
        next(error);
    }
});

// PATCH /admin/compensation-plans/:id
app.patch('/admin/compensation-plans/:id', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const { type, hourlyRate, commissionRate, salesBackRate, drinkBackRate, jonaiBackRate, effectiveFrom, effectiveTo, reason } = req.body;

        const existing = await prisma.compensationPlan.findUnique({ where: { id } });
        if (!existing) {
            throw new APIError(404, AppErrorCodes.NOT_FOUND, 'Compensation plan not found');
        }

        if (existing.tenantId !== user.tenantId && user.role !== 'SystemAdmin') {
            throw new APIError(403, AppErrorCodes.TENANT_MISMATCH, 'Tenant boundary violation');
        }

        const updateData: Record<string, unknown> = {};
        if (type !== undefined) updateData.type = type;
        if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
        if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
        if (salesBackRate !== undefined) updateData.salesBackRate = salesBackRate;
        if (drinkBackRate !== undefined) updateData.drinkBackRate = drinkBackRate;
        if (jonaiBackRate !== undefined) updateData.jonaiBackRate = jonaiBackRate;
        if (effectiveFrom !== undefined) updateData.effectiveFrom = new Date(effectiveFrom);
        if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;

        if (Object.keys(updateData).length === 0) {
            throw new APIError(400, AppErrorCodes.VALIDATION_INVALID_RANGE, 'No updatable fields provided');
        }

        const beforeData = {
            type: existing.type,
            hourlyRate: existing.hourlyRate,
            commissionRate: existing.commissionRate,
            salesBackRate: existing.salesBackRate,
            drinkBackRate: existing.drinkBackRate,
            jonaiBackRate: existing.jonaiBackRate,
            effectiveFrom: existing.effectiveFrom,
            effectiveTo: existing.effectiveTo,
        };

        const updated = await prisma.$transaction(async (tx) => {
            const changed = await tx.compensationPlan.update({
                where: { id },
                data: updateData,
            });

            await writeAuditLogFromRequest(tx, req, {
                action: 'UPDATE_COMPENSATION_PLAN',
                resourceType: 'CompensationPlan',
                resourceId: changed.id,
                tenantId: changed.tenantId,
                before: beforeData,
                after: {
                    type: changed.type,
                    hourlyRate: changed.hourlyRate,
                    commissionRate: changed.commissionRate,
                    salesBackRate: changed.salesBackRate,
                    drinkBackRate: changed.drinkBackRate,
                    jonaiBackRate: changed.jonaiBackRate,
                    effectiveFrom: changed.effectiveFrom,
                    effectiveTo: changed.effectiveTo,
                },
                reason: reason ?? null,
                requireReason: true,
            }, 'strict');

            return changed;
        });

        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// GET /admin/compensation-plans
app.get('/admin/compensation-plans', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetTenantId = req.query.tenantId ? String(req.query.tenantId) : (req as any).user.tenantId;
        const plans = await prisma.compensationPlan.findMany({
            where: { tenantId: targetTenantId }
        });
        res.json(plans);
    } catch (error) {
        next(error);
	    }
	});

// GET /admin/audit-logs
app.get('/admin/audit-logs', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user as { tenantId: string; role: string };
        const from = parseDateFilter(req.query.from, 'from');
        const to = parseDateFilter(req.query.to, 'to');

        if (from && to && from.getTime() > to.getTime()) {
            throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'from must be less than or equal to to', 'from');
        }

        const page = parsePositiveInt(req.query.page, 'page', 1);
        const limit = parsePositiveInt(req.query.limit, 'limit', DEFAULT_AUDIT_LOG_LIMIT);
        if (limit > MAX_AUDIT_LOG_LIMIT) {
            throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, `limit must be less than or equal to ${MAX_AUDIT_LOG_LIMIT}`, 'limit');
        }

        const action = getOptionalString(req.query.action);
        if (action && !isValidAuditActionFilter(action)) {
            throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'action must match ^[A-Z0-9_]+$', 'action');
        }

        const actorId = getOptionalString(req.query.actorId);
        const requestId = getOptionalString(req.query.requestId);
        const correlationId = getOptionalString(req.query.correlationId);
        const resourceType = getOptionalString(req.query.resourceType);
        const resourceId = getOptionalString(req.query.resourceId);
        const requestedTenantId = getOptionalString(req.query.tenantId);
        const targetTenantId = user.role === 'SystemAdmin' ? requestedTenantId : user.tenantId;

        const where: Prisma.AuditLogWhereInput = {};
        if (targetTenantId) {
            where.tenantId = targetTenantId;
        }
        if (action) {
            where.actionType = action;
        }
        if (actorId) {
            where.actorId = actorId;
        }
        if (requestId) {
            where.requestId = requestId;
        }
        if (correlationId) {
            where.correlationId = correlationId;
        }
        if (resourceType) {
            where.targetType = resourceType;
        }
        if (resourceId) {
            where.targetId = resourceId;
        }
        if (from || to) {
            where.createdAt = {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
            };
        }

        const skip = (page - 1) * limit;
        const [rows, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    actionType: true,
                    actorId: true,
                    actorRole: true,
                    tenantId: true,
                    targetType: true,
                    targetId: true,
                    beforeData: true,
                    afterData: true,
                    correlationId: true,
                    createdAt: true,
                    ipAddress: true,
                    userAgent: true,
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        const items: AuditSearchItem[] = rows.map((row) => {
            const item: AuditSearchItem = {
                id: row.id,
                action: row.actionType,
                actorId: row.actorId,
                actorRole: row.actorRole,
                tenantId: row.tenantId,
                resourceType: row.targetType,
                resourceId: row.targetId,
                beforeData: row.beforeData as Prisma.JsonValue | null,
                afterData: row.afterData as Prisma.JsonValue | null,
                correlationId: row.correlationId,
                createdAt: row.createdAt,
            };

            if (row.ipAddress) {
                item.ipAddress = row.ipAddress;
            }
            if (row.userAgent) {
                item.userAgent = row.userAgent;
            }
            return item;
        });

        res.json({
            items,
            pagination: {
                page,
                limit,
                total,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /admin/approvals/pending
app.get('/admin/approvals/pending', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user as { tenantId: string; role: string };
        const type = getOptionalString(req.query.type);
        const from = parseDateFilter(req.query.from, 'from');
        const to = parseDateFilter(req.query.to, 'to');
        validateDateRange(from, to);

        if (type && !ALLOWED_APPROVAL_TYPES.has(type)) {
            throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'type must be MONTHLY_UNLOCK', 'type');
        }

        const page = parsePositiveInt(req.query.page, 'page', 1);
        const limit = parseWorkflowListLimit(req.query.limit);
        const requestedTenantId = getOptionalString(req.query.tenantId);
        const targetTenantId = resolveTargetTenantId(user, requestedTenantId);
        const skip = (page - 1) * limit;
        const { whereSql, values } = buildUnlockRequestWhereClause({
            tenantId: targetTenantId,
            status: 'PENDING',
            from,
            to,
        });
        const rowsQuery = `
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
            ${whereSql}
            ORDER BY created_at ASC
            LIMIT $${values.length + 1}
            OFFSET $${values.length + 2}
        `;
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM unlock_requests
            ${whereSql}
        `;

        const [rows, countRows] = await Promise.all([
            prisma.$queryRawUnsafe<UnlockRequestRow[]>(rowsQuery, ...values, limit, skip),
            prisma.$queryRawUnsafe<{ total: number }[]>(countQuery, ...values),
        ]);
        const total = countRows[0]?.total ?? 0;

        const unlockRequestIds = rows.map((row) => row.id);
        const correlationMap = new Map<string, string | null>();

        if (unlockRequestIds.length > 0) {
            const auditRows = await prisma.auditLog.findMany({
                where: {
                    targetType: 'UnlockRequest',
                    targetId: { in: unlockRequestIds },
                    actionType: 'REQUEST_MONTHLY_UNLOCK',
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    targetId: true,
                    correlationId: true,
                },
            });

            for (const auditRow of auditRows) {
                if (!auditRow.targetId || correlationMap.has(auditRow.targetId)) {
                    continue;
                }
                correlationMap.set(auditRow.targetId, auditRow.correlationId);
            }
        }

        const items: PendingApprovalItem[] = rows.map((row) => ({
            id: row.id,
            type: APPROVAL_TYPE_MONTHLY_UNLOCK,
            tenantId: row.tenantId,
            month: row.month,
            requesterId: row.requesterId,
            reason: row.reason,
            status: row.status,
            createdAt: row.createdAt,
            correlationId: correlationMap.get(row.id) ?? null,
            summary: {
                month: row.month,
            },
        }));

        res.json({
            items,
            pagination: {
                page,
                limit,
                total,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /admin/unlock-requests
app.get('/admin/unlock-requests', authenticate, checkTenantStatus, adminOnly, enforceTenantBoundary, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user as { tenantId: string; role: string };
        const status = getOptionalString(req.query.status);
        const month = getOptionalString(req.query.month);
        const requesterId = getOptionalString(req.query.requesterId);
        const approverId = getOptionalString(req.query.approverId);
        const from = parseDateFilter(req.query.from, 'from');
        const to = parseDateFilter(req.query.to, 'to');
        validateDateRange(from, to);

        if (status && !ALLOWED_UNLOCK_REQUEST_STATUSES.has(status)) {
            throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'status must be one of PENDING, APPROVED, REJECTED', 'status');
        }
        if (month && !isValidYearMonth(month)) {
            throw new APIError(422, AppErrorCodes.VALIDATION_INVALID_RANGE, 'month must be YYYY-MM format', 'month');
        }

        const page = parsePositiveInt(req.query.page, 'page', 1);
        const limit = parseWorkflowListLimit(req.query.limit);
        const requestedTenantId = getOptionalString(req.query.tenantId);
        const targetTenantId = resolveTargetTenantId(user, requestedTenantId);
        const skip = (page - 1) * limit;
        const { whereSql, values } = buildUnlockRequestWhereClause({
            tenantId: targetTenantId,
            status,
            month,
            requesterId,
            approverId,
            from,
            to,
        });
        const rowsQuery = `
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
            ${whereSql}
            ORDER BY created_at DESC
            LIMIT $${values.length + 1}
            OFFSET $${values.length + 2}
        `;
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM unlock_requests
            ${whereSql}
        `;

        const [rows, countRows] = await Promise.all([
            prisma.$queryRawUnsafe<UnlockRequestRow[]>(rowsQuery, ...values, limit, skip),
            prisma.$queryRawUnsafe<{ total: number }[]>(countQuery, ...values),
        ]);
        const total = countRows[0]?.total ?? 0;

        const unlockRequestIds = rows.map((row) => row.id);
        const correlationMap = new Map<string, string | null>();

        if (unlockRequestIds.length > 0) {
            const auditRows = await prisma.auditLog.findMany({
                where: {
                    targetType: 'UnlockRequest',
                    targetId: { in: unlockRequestIds },
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    targetId: true,
                    correlationId: true,
                },
            });

            for (const auditRow of auditRows) {
                if (!auditRow.targetId || correlationMap.has(auditRow.targetId)) {
                    continue;
                }
                correlationMap.set(auditRow.targetId, auditRow.correlationId);
            }
        }

        const items: UnlockRequestListItem[] = rows.map((row) => ({
            id: row.id,
            tenantId: row.tenantId,
            month: row.month,
            requesterId: row.requesterId,
            approverId: row.approverId,
            rejectorId: row.rejectorId,
            reason: row.reason,
            status: row.status,
            createdAt: row.createdAt,
            approvedAt: row.approvedAt,
            rejectedAt: row.rejectedAt,
            correlationId: correlationMap.get(row.id) ?? null,
        }));

        res.json({
            items,
            pagination: {
                page,
                limit,
                total,
            },
        });
    } catch (error) {
        next(error);
    }
});

// =======================
// 勤怠ルーター (M2)
// =======================
import attendanceRouter from './routes/attendance';
app.use('/attendance', attendanceRouter);

// =======================
// 売上ルーター
// =======================
import salesRouter from './routes/sales';
app.use('/sales', salesRouter);

// =======================
// レポートルーター
// =======================
import reportsRouter from './routes/reports';
app.use('/reports', reportsRouter);

// =======================
// 課金・SaaSルーター (billing)
// =======================
import billingRouter from './routes/billing';
app.use('/billing', billingRouter);

// =======================
// システム管理・SaaS運営ルーター (system)
// =======================
import systemRouter from './routes/system';
app.use('/system', systemRouter);

// Error handler 登録 (一番最後に)
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`API server is running on port ${PORT}`);
    });
}
