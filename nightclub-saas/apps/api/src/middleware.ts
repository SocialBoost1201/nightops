import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../prisma/generated/client';
import { v4 as uuidv4 } from 'uuid';
import { ApiError, getCorrelationId } from './common/api-contract';
import { AppErrorCodes, normalizeErrorCode } from './common/error-codes';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';
const prisma = new PrismaClient();

// =======================
// エラークラス
// =======================

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// =======================
// ミドルウェア
// =======================

export const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers['x-correlation-id'];
  const correlationId = typeof incoming === 'string' && incoming.trim().length > 0
    ? incoming
    : uuidv4();

  (req as any).correlationId = correlationId;
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};

export const responseEnvelope = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    if (res.locals.rawResponse === true) {
      return originalJson(body);
    }

    if (body && typeof body === 'object' && 'success' in (body as Record<string, unknown>)) {
      return originalJson(body);
    }

    return originalJson({
      success: true,
      data: body ?? null,
      meta: { correlationId: getCorrelationId(req) },
    });
  }) as Response['json'];

  next();
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new APIError(401, AppErrorCodes.AUTH_TOKEN_EXPIRED, 'Token is missing or invalid'));
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
    return next(new APIError(401, AppErrorCodes.AUTH_TOKEN_EXPIRED, 'Token is missing or invalid'));
  }
};

export const requireRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return next(new APIError(403, AppErrorCodes.ACCESS_DENIED, 'Permission denied'));
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
    return next(new APIError(403, AppErrorCodes.TENANT_MISMATCH, 'Tenant boundary violation'));
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
      return next(new APIError(404, AppErrorCodes.NOT_FOUND, 'Tenant not found'));
    }

    const { status } = tenant;
    (req as any).tenantStatus = status;

    // suspended, canceled 状態の場合は書き込み(POST, PUT, PATCH, DELETE)を禁止
    if (status === 'suspended' || status === 'canceled') {
      if (req.method !== 'GET') {
        return next(
          new APIError(403, AppErrorCodes.ACCESS_DENIED, `Tenant is ${status}. Write operations are disabled.`)
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
      return next(new APIError(403, AppErrorCodes.ACCESS_DENIED, 'Cannot access other user data'));
    }
    next();
  };
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  const correlationId = getCorrelationId(req);

  if (err instanceof APIError) {
    const payload: ApiError = {
      success: false,
      error: {
        code: normalizeErrorCode(err.errorCode, err.statusCode),
        message: err.message,
        correlationId,
        ...(err.field ? { field: err.field } : {}),
      },
    };
    return res.status(err.statusCode).json(payload);
  }

  const payload: ApiError = {
    success: false,
    error: {
      code: AppErrorCodes.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      correlationId,
    },
  };
  return res.status(500).json(payload);
};
