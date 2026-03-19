import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../prisma/generated/client';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';
const prisma = new PrismaClient();

// =======================
// エラークラス
// =======================

export class APIError extends Error {
  constructor(public statusCode: number, public errorCode: string, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

// =======================
// ミドルウェア
// =======================

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new APIError(401, 'AUTH_003', 'Token missing'));
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    (req as any).user = {
      id: decoded.sub,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };
    next();
  } catch {
    return next(new APIError(401, 'AUTH_003', 'Invalid token'));
  }
};

export const requireRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return next(new APIError(403, 'ACCESS_001', 'Permission denied'));
    }
    next();
  };
};

export const enforceTenantBoundary = (req: Request, res: Response, next: NextFunction) => {
  const requestedTenantId = req.query.tenantId || req.body.tenantId;
  const userTenantId = (req as any).user?.tenantId;
  if (
    requestedTenantId &&
    requestedTenantId !== userTenantId &&
    (req as any).user?.role !== 'SystemAdmin'
  ) {
    return next(new APIError(403, 'TENANT_001', 'Tenant boundary violation'));
  }
  next();
};

export const checkTenantStatus = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  // SystemAdminはテナント状態に関わらずアクセス可能
  if (!user || user.role === 'SystemAdmin') {
    return next();
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { status: true },
    });

    if (!tenant) {
      return next(new APIError(404, 'TENANT_002', 'Tenant not found'));
    }

    const { status } = tenant;
    (req as any).tenantStatus = status;

    // suspended, canceled 状態の場合は書き込み(POST, PUT, PATCH, DELETE)を禁止
    if (status === 'suspended' || status === 'canceled') {
      if (req.method !== 'GET') {
        return next(
          new APIError(403, 'BILLING_001', `Tenant is ${status}. Write operations are disabled.`)
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireSelfOrAdmin = (targetAccountIdParamName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const targetAccountId = req.params[targetAccountIdParamName];
    const user = (req as any).user;
    if (user.role === 'Admin' || user.role === 'SystemAdmin') {
      return next();
    }
    if (user.id !== targetAccountId) {
      return next(new APIError(403, 'ACCESS_002', 'Cannot access other user data'));
    }
    next();
  };
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({ error: err.errorCode, message: err.message });
  }
  res.status(500).json({ error: 'SYS_001', message: 'Internal server error' });
};
