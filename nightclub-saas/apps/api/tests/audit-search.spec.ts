import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';

type AuditLogRecord = {
  id: string;
  tenantId: string;
  actorId: string | null;
  actorRole: string | null;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  requestId: string | null;
  correlationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

const seedAuditLogs: AuditLogRecord[] = [
  {
    id: 'log-001',
    tenantId: 'tenant-aaa',
    actorId: 'actor-100',
    actorRole: 'Admin',
    actionType: 'REQUEST_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-001',
    beforeData: null,
    afterData: { status: 'PENDING' },
    requestId: 'req-100',
    correlationId: 'corr-aaa-001',
    ipAddress: '10.0.0.1',
    userAgent: 'jest-agent',
    createdAt: new Date('2026-03-01T09:00:00Z'),
  },
  {
    id: 'log-002',
    tenantId: 'tenant-aaa',
    actorId: 'actor-100',
    actorRole: 'Admin',
    actionType: 'APPROVE_MONTHLY_UNLOCK',
    targetType: 'MonthlyClose',
    targetId: 'close-001',
    beforeData: { status: 'closed' },
    afterData: { status: 'open' },
    requestId: 'req-200',
    correlationId: 'corr-aaa-002',
    ipAddress: '10.0.0.2',
    userAgent: 'jest-agent',
    createdAt: new Date('2026-03-02T09:00:00Z'),
  },
  {
    id: 'log-006',
    tenantId: 'tenant-aaa',
    actorId: 'actor-300',
    actorRole: 'Admin',
    actionType: 'UPDATE_ACCOUNT',
    targetType: 'Account',
    targetId: 'account-001',
    beforeData: { status: 'active' },
    afterData: { status: 'inactive' },
    requestId: 'req-100-extra',
    correlationId: 'corr-aaa-003-extra',
    ipAddress: '10.0.0.6',
    userAgent: 'jest-agent',
    createdAt: new Date('2026-03-02T12:00:00Z'),
  },
  {
    id: 'log-003',
    tenantId: 'tenant-aaa',
    actorId: 'actor-200',
    actorRole: 'SystemAdmin',
    actionType: 'REJECT_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-002',
    beforeData: { status: 'PENDING' },
    afterData: { status: 'REJECTED' },
    requestId: 'req-300',
    correlationId: 'corr-aaa-003',
    ipAddress: null,
    userAgent: null,
    createdAt: new Date('2026-03-03T09:00:00Z'),
  },
  {
    id: 'log-004',
    tenantId: 'tenant-aaa',
    actorId: 'actor-400',
    actorRole: 'Admin',
    actionType: 'UPDATE_COMPENSATION_PLAN',
    targetType: 'CompensationPlan',
    targetId: 'plan-001',
    beforeData: { hourlyRate: 3000 },
    afterData: { hourlyRate: 3500 },
    requestId: 'req-400',
    correlationId: 'corr-aaa-004',
    ipAddress: '10.0.0.4',
    userAgent: 'jest-agent',
    createdAt: new Date('2026-03-04T09:00:00Z'),
  },
  {
    id: 'log-005',
    tenantId: 'tenant-bbb',
    actorId: 'actor-500',
    actorRole: 'Admin',
    actionType: 'REQUEST_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-900',
    beforeData: null,
    afterData: { status: 'PENDING' },
    requestId: 'req-900',
    correlationId: 'corr-bbb-001',
    ipAddress: '10.0.1.1',
    userAgent: 'jest-agent',
    createdAt: new Date('2026-03-05T09:00:00Z'),
  },
];

const applyAuditFilters = (rows: AuditLogRecord[], where: any): AuditLogRecord[] => {
  let filtered = [...rows];
  if (!where) {
    return filtered;
  }

  if (where.tenantId) {
    filtered = filtered.filter((row) => row.tenantId === where.tenantId);
  }
  if (where.actionType) {
    filtered = filtered.filter((row) => row.actionType === where.actionType);
  }
  if (where.actorId) {
    filtered = filtered.filter((row) => row.actorId === where.actorId);
  }
  if (where.requestId) {
    filtered = filtered.filter((row) => row.requestId === where.requestId);
  }
  if (where.correlationId) {
    filtered = filtered.filter((row) => row.correlationId === where.correlationId);
  }
  if (where.targetType) {
    filtered = filtered.filter((row) => row.targetType === where.targetType);
  }
  if (where.targetId) {
    filtered = filtered.filter((row) => row.targetId === where.targetId);
  }
  if (where.createdAt?.gte) {
    const fromTime = new Date(where.createdAt.gte).getTime();
    filtered = filtered.filter((row) => row.createdAt.getTime() >= fromTime);
  }
  if (where.createdAt?.lte) {
    const toTime = new Date(where.createdAt.lte).getTime();
    filtered = filtered.filter((row) => row.createdAt.getTime() <= toTime);
  }

  return filtered;
};

const prismaMock = {
  tenant: {
    findUnique: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  compensationPlan: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

const makeToken = (role: string, tenantId: string, id: string) =>
  jwt.sign({ sub: id, tenantId, role }, JWT_SECRET, { expiresIn: '1h' });

describe('Audit Search API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue({ status: 'active' });
    prismaMock.auditLog.findMany.mockImplementation(async (args: any) => {
      const filtered = applyAuditFilters(seedAuditLogs, args?.where);
      const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const skip = Number(args?.skip ?? 0);
      const take = Number(args?.take ?? sorted.length);
      return sorted.slice(skip, skip + take).map((row) => ({ ...row }));
    });
    prismaMock.auditLog.count.mockImplementation(async (args: any) => {
      const filtered = applyAuditFilters(seedAuditLogs, args?.where);
      return filtered.length;
    });
  });

  it('1. basic listing works', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(5);
    expect(res.body.data.items[0].id).toBe('log-004');
    expect(res.body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 5,
    });
  });

  it('2. date range filtering works', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs?from=2026-03-02T00:00:00Z&to=2026-03-03T23:59:59Z')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.map((item: any) => item.id)).toEqual(['log-003', 'log-006', 'log-002']);
    expect(res.body.data.pagination.total).toBe(3);
  });

  it('3. from > to returns 422', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs?from=2026-03-10T00:00:00Z&to=2026-03-01T00:00:00Z')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_INVALID_RANGE');
    expect(res.body.error.field).toBe('from');
  });

  it('4. actorId filter works', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs?actorId=actor-100')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.map((item: any) => item.id)).toEqual(['log-002', 'log-001']);
  });

  it('5. action filter works', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs?action=APPROVE_MONTHLY_UNLOCK')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].id).toBe('log-002');
  });

  it('6. requestId filter works as exact match', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs?requestId=req-100')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].id).toBe('log-001');
  });

  it('7. correlationId filter works as exact match', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs?correlationId=corr-aaa-003')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].id).toBe('log-003');
  });

  it('8. Admin cannot search another tenant', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs?tenantId=tenant-bbb')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TENANT_MISMATCH');
  });

  it('9. SystemAdmin can search across tenants', async () => {
    const token = makeToken('SystemAdmin', 'tenant-root', 'sys-001');
    const res = await request(app)
      .get('/admin/audit-logs?tenantId=tenant-bbb')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].tenantId).toBe('tenant-bbb');
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('10. pagination works', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .get('/admin/audit-logs?page=2&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.map((item: any) => item.id)).toEqual(['log-006', 'log-002']);
    expect(res.body.data.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
    });
  });
});
