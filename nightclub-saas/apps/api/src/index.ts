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
import { getCorrelationId } from './common/api-contract';

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

type AuditLogInput = {
    action: string;
    resourceType: string;
    resourceId: string;
    before?: any;
    after?: any;
    reason?: string;
};

// 監査ログ書き込みヘルパー
const createAuditLog = async (req: Request, input: AuditLogInput) => {
    const user = (req as any).user;
    if (!user) return; // 未認証操作は除外するか別途扱う

    await prisma.auditLog.create({
        data: {
            tenantId: user.tenantId,
            actorId: user.id,
            actorRole: user.role,
            actionType: input.action,
            targetType: input.resourceType,
            targetId: input.resourceId,
            beforeData: input.before ?? null,
            afterData: input.after ?? null,
            requestId: `${req.method} ${req.originalUrl}`,
            correlationId: getCorrelationId(req),
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
        }
    });
};

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

        await createAuditLog(req, {
            action: 'CREATE_ACCOUNT',
            resourceType: 'Account',
            resourceId: account.id,
            after: { loginId, role, status: account.status },
        });

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

        const updated = await prisma.account.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(role && { role }),
            },
            select: { id: true, loginId: true, role: true, status: true }
        });

        await createAuditLog(req, {
            action: 'UPDATE_ACCOUNT',
            resourceType: 'Account',
            resourceId: updated.id,
            before: beforeData,
            after: { status: updated.status, role: updated.role },
            reason: req.body.reason,
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

        const plan = await prisma.compensationPlan.create({
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

        await createAuditLog(req, {
            action: 'CREATE_PLAN',
            resourceType: 'CompensationPlan',
            resourceId: plan.id,
            after: plan,
            reason: req.body.reason,
        });

        res.status(201).json(plan);
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
