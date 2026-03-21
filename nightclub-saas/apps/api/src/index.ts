import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../prisma/generated/client';
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

// =======================
// 勤怠ルーター (M2)
// =======================
import attendanceRouter from './routes/attendance';
app.use('/attendance', attendanceRouter);

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
