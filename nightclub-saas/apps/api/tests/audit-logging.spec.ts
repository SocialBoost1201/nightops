import request from 'supertest';
import jwt from 'jsonwebtoken';
import { sanitizeAuditPayload } from '../src/common/audit/audit.utils';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';

const prismaMock = {
  $transaction: jest.fn(),
  auditLog: {
    create: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  compensationPlan: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  shiftEntry: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  salesSlip: {
    findMany: jest.fn(),
  },
  drinkCount: {
    findMany: jest.fn(),
  },
  plan: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  billingHistory: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  stripeEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../prisma/generated/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
  Prisma: {
    JsonNull: null,
  },
}));

import { app } from '../src/index';

const makeToken = (role: string, tenantId = 'tenant-aaa', id = 'actor-001') => {
  return jwt.sign({ sub: id, tenantId, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('Audit Logging Hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(prismaMock));
    prismaMock.tenant.findUnique.mockImplementation(async (args: any) => {
      if (args?.select?.status) return { status: 'active' };
      if (args?.where?.id) return { id: args.where.id, status: 'trial', planId: 'plan-basic' };
      return null;
    });
    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit-001' });
    prismaMock.compensationPlan.findUnique.mockResolvedValue({
      id: 'plan-001',
      tenantId: 'tenant-aaa',
      type: 'hourly',
      hourlyRate: 3000,
      commissionRate: null,
      salesBackRate: null,
      drinkBackRate: 0,
      jonaiBackRate: 0,
      effectiveFrom: new Date('2026-03-01'),
      effectiveTo: null,
    });
    prismaMock.compensationPlan.update.mockResolvedValue({
      id: 'plan-001',
      tenantId: 'tenant-aaa',
      type: 'hourly',
      hourlyRate: 3500,
      commissionRate: null,
      salesBackRate: null,
      drinkBackRate: 0,
      jonaiBackRate: 0,
      effectiveFrom: new Date('2026-03-01'),
      effectiveTo: null,
    });
    prismaMock.shiftEntry.findMany.mockResolvedValue([
      {
        id: 'shift-001',
        tenantId: 'tenant-aaa',
        accountId: 'cast-001',
        targetDate: new Date('2026-03-10'),
        status: 'pending',
        managerNote: null,
        updatedAt: new Date('2026-03-09T12:00:00Z'),
      },
    ]);
    prismaMock.shiftEntry.updateMany.mockResolvedValue({ count: 1 });
  });

  it('1. compensation plan update writes before/after and reason', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .patch('/admin/compensation-plans/plan-001')
      .set('Authorization', `Bearer ${token}`)
      .set('x-correlation-id', 'corr-comp-001')
      .send({
        hourlyRate: 3500,
        reason: '契約改定のため',
      });

    expect(res.status).toBe(200);
    const data = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(data.actionType).toBe('UPDATE_COMPENSATION_PLAN');
    expect(data.targetType).toBe('CompensationPlan');
    expect(data.targetId).toBe('plan-001');
    expect(data.beforeData.hourlyRate).toBe(3000);
    expect(data.afterData.snapshot.hourlyRate).toBe(3500);
    expect(data.afterData.__audit.reason).toBe('契約改定のため');
    expect(data.correlationId).toBe('corr-comp-001');
  });

  it('2. tenant status update logs actor/tenant/correlationId', async () => {
    const token = makeToken('SystemAdmin', 'tenant-root', 'sys-001');
    prismaMock.tenant.update.mockResolvedValue({
      id: 'tenant-bbb',
      status: 'suspended',
      planId: 'plan-pro',
    });

    const res = await request(app)
      .patch('/system/tenants/tenant-bbb')
      .set('Authorization', `Bearer ${token}`)
      .set('x-correlation-id', 'corr-tenant-001')
      .send({
        status: 'suspended',
        reason: '滞納のため',
      });

    expect(res.status).toBe(200);
    const data = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(data.actorId).toBe('sys-001');
    expect(data.actorRole).toBe('SystemAdmin');
    expect(data.tenantId).toBe('tenant-bbb');
    expect(data.correlationId).toBe('corr-tenant-001');
  });

  it('3. sanitize removes secrets from nested payloads', () => {
    const sanitized = sanitizeAuditPayload({
      password: 'plain',
      nested: {
        token: 'abc',
        refreshToken: 'def',
        stripeSecret: 'secret',
      },
      headers: {
        authorization: 'Bearer x',
        cookie: 'session=1',
      },
      safe: 'ok',
    }) as any;

    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.nested.token).toBe('[REDACTED]');
    expect(sanitized.nested.refreshToken).toBe('[REDACTED]');
    expect(sanitized.nested.stripeSecret).toBe('[REDACTED]');
    expect(sanitized.headers.authorization).toBe('[REDACTED]');
    expect(sanitized.headers.cookie).toBe('[REDACTED]');
    expect(sanitized.safe).toBe('ok');
  });

  it('4. shift approval requires reason and returns validation error without it', async () => {
    const token = makeToken('Manager', 'tenant-aaa', 'mgr-001');

    const res = await request(app)
      .put('/attendance/shifts/status')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shiftIds: ['shift-001'],
        status: 'approved',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_INVALID_RANGE');
    expect(res.body.error.field).toBe('reason');
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('5. strict audit failure causes critical operation failure', async () => {
    const token = makeToken('SystemAdmin', 'tenant-root', 'sys-001');
    prismaMock.tenant.update.mockResolvedValue({
      id: 'tenant-ccc',
      status: 'active',
      planId: 'plan-basic',
    });
    prismaMock.auditLog.create.mockRejectedValueOnce(new Error('audit write failed'));

    const res = await request(app)
      .patch('/system/tenants/tenant-ccc')
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'active',
        reason: '運用再開',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('6. best-effort audit failure does not block standard update', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    prismaMock.account.findUnique.mockResolvedValue(null);
    prismaMock.account.create.mockResolvedValue({
      id: 'acc-999',
      loginId: 'new-admin',
      role: 'Manager',
      tenantId: 'tenant-aaa',
      status: 'active',
    });
    prismaMock.auditLog.create.mockRejectedValueOnce(new Error('audit best effort failed'));

    const res = await request(app)
      .post('/admin/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        loginId: 'new-admin',
        password: 'Admin1234!',
        role: 'Manager',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('acc-999');
  });
});
