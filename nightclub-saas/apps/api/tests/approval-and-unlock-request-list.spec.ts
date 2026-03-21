import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';

type UnlockRequestRecord = {
  id: string;
  tenantId: string;
  month: string;
  requesterId: string;
  approverId: string | null;
  rejectorId: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
};

type AuditRecord = {
  id: string;
  tenantId: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  correlationId: string | null;
  createdAt: Date;
};

const unlockRequestsSeed: UnlockRequestRecord[] = [
  {
    id: 'unlock-001',
    tenantId: 'tenant-aaa',
    month: '2026-03',
    requesterId: 'req-001',
    approverId: null,
    rejectorId: null,
    reason: 'Need to correct monthly data in review window',
    status: 'PENDING',
    createdAt: new Date('2026-03-01T10:00:00Z'),
    approvedAt: null,
    rejectedAt: null,
  },
  {
    id: 'unlock-002',
    tenantId: 'tenant-aaa',
    month: '2026-02',
    requesterId: 'req-002',
    approverId: 'approver-001',
    rejectorId: null,
    reason: 'Backdated fix approved by finance manager',
    status: 'APPROVED',
    createdAt: new Date('2026-03-02T10:00:00Z'),
    approvedAt: new Date('2026-03-03T10:00:00Z'),
    rejectedAt: null,
  },
  {
    id: 'unlock-003',
    tenantId: 'tenant-aaa',
    month: '2026-01',
    requesterId: 'req-003',
    approverId: null,
    rejectorId: 'rejector-001',
    reason: 'Rejected due to insufficient supporting information',
    status: 'REJECTED',
    createdAt: new Date('2026-03-04T10:00:00Z'),
    approvedAt: null,
    rejectedAt: new Date('2026-03-05T10:00:00Z'),
  },
  {
    id: 'unlock-004',
    tenantId: 'tenant-bbb',
    month: '2026-03',
    requesterId: 'req-004',
    approverId: null,
    rejectorId: null,
    reason: 'Pending request from another tenant for cross-tenant checks',
    status: 'PENDING',
    createdAt: new Date('2026-03-05T10:00:00Z'),
    approvedAt: null,
    rejectedAt: null,
  },
  {
    id: 'unlock-005',
    tenantId: 'tenant-aaa',
    month: '2026-03',
    requesterId: 'req-005',
    approverId: null,
    rejectorId: null,
    reason: 'Pending request for additional reconciliation adjustment',
    status: 'PENDING',
    createdAt: new Date('2026-03-06T10:00:00Z'),
    approvedAt: null,
    rejectedAt: null,
  },
];

const auditLogSeed: AuditRecord[] = [
  {
    id: 'audit-001',
    tenantId: 'tenant-aaa',
    actionType: 'REQUEST_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-001',
    correlationId: 'corr-unlock-001',
    createdAt: new Date('2026-03-01T10:00:01Z'),
  },
  {
    id: 'audit-002',
    tenantId: 'tenant-aaa',
    actionType: 'REQUEST_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-002',
    correlationId: 'corr-unlock-002-request',
    createdAt: new Date('2026-03-02T10:00:01Z'),
  },
  {
    id: 'audit-003',
    tenantId: 'tenant-aaa',
    actionType: 'APPROVE_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-002',
    correlationId: 'corr-unlock-002-approve',
    createdAt: new Date('2026-03-03T10:00:01Z'),
  },
  {
    id: 'audit-004',
    tenantId: 'tenant-aaa',
    actionType: 'REJECT_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-003',
    correlationId: 'corr-unlock-003-reject',
    createdAt: new Date('2026-03-05T10:00:01Z'),
  },
  {
    id: 'audit-005',
    tenantId: 'tenant-bbb',
    actionType: 'REQUEST_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-004',
    correlationId: 'corr-unlock-004',
    createdAt: new Date('2026-03-05T10:00:01Z'),
  },
  {
    id: 'audit-006',
    tenantId: 'tenant-aaa',
    actionType: 'REQUEST_MONTHLY_UNLOCK',
    targetType: 'UnlockRequest',
    targetId: 'unlock-005',
    correlationId: 'corr-unlock-005',
    createdAt: new Date('2026-03-06T10:00:01Z'),
  },
];

const applyUnlockFilters = (rows: UnlockRequestRecord[], where: any): UnlockRequestRecord[] => {
  let filtered = [...rows];
  if (!where) {
    return filtered;
  }

  if (where.tenantId) {
    filtered = filtered.filter((row) => row.tenantId === where.tenantId);
  }
  if (where.status) {
    filtered = filtered.filter((row) => row.status === where.status);
  }
  if (where.month) {
    filtered = filtered.filter((row) => row.month === where.month);
  }
  if (where.requesterId) {
    filtered = filtered.filter((row) => row.requesterId === where.requesterId);
  }
  if (where.approverId) {
    filtered = filtered.filter((row) => row.approverId === where.approverId);
  }
  if (where.createdAt?.gte) {
    const fromTime = new Date(where.createdAt.gte).getTime();
    filtered = filtered.filter((row) => row.createdAt.getTime() >= fromTime);
  }
  if (where.createdAt?.lte) {
    const toTime = new Date(where.createdAt.lte).getTime();
    filtered = filtered.filter((row) => row.createdAt.getTime() <= toTime);
  }
  if (where.from) {
    const fromTime = new Date(where.from).getTime();
    filtered = filtered.filter((row) => row.createdAt.getTime() >= fromTime);
  }
  if (where.to) {
    const toTime = new Date(where.to).getTime();
    filtered = filtered.filter((row) => row.createdAt.getTime() <= toTime);
  }

  return filtered;
};

const applyAuditFilters = (rows: AuditRecord[], where: any): AuditRecord[] => {
  let filtered = [...rows];
  if (!where) {
    return filtered;
  }

  if (where.targetType) {
    filtered = filtered.filter((row) => row.targetType === where.targetType);
  }
  if (where.actionType) {
    filtered = filtered.filter((row) => row.actionType === where.actionType);
  }
  if (where.targetId?.in) {
    const ids = new Set(where.targetId.in as string[]);
    filtered = filtered.filter((row) => row.targetId !== null && ids.has(row.targetId));
  }

  return filtered;
};

const prismaMock = {
  $queryRawUnsafe: jest.fn(),
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
    findUnique: jest.fn(),
    update: jest.fn(),
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

describe('Approval Pending List and Unlock Request List APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue({ status: 'active' });

    prismaMock.$queryRawUnsafe.mockImplementation(async (...args: any[]) => {
      const [query, ...values] = args;
      const queryText = Array.isArray(query) ? query.join(' ') : String(query);

      if (!queryText.includes('FROM unlock_requests')) {
        return [];
      }

      let valueIndex = 0;
      const where: any = {};
      if (queryText.includes('tenant_id =')) where.tenantId = String(values[valueIndex++]);
      if (queryText.includes('status =')) where.status = String(values[valueIndex++]);
      if (queryText.includes('month =')) where.month = String(values[valueIndex++]);
      if (queryText.includes('requester_id =')) where.requesterId = String(values[valueIndex++]);
      if (queryText.includes('approver_id =')) where.approverId = String(values[valueIndex++]);
      if (queryText.includes('created_at >=')) where.from = new Date(values[valueIndex++]);
      if (queryText.includes('created_at <=')) where.to = new Date(values[valueIndex++]);

      const filtered = applyUnlockFilters(unlockRequestsSeed, where);

      if (queryText.includes('COUNT(*)::int AS total')) {
        return [{ total: filtered.length }];
      }

      const orderDirection = queryText.includes('ORDER BY created_at ASC') ? 1 : -1;
      const sorted = filtered.sort((a, b) => orderDirection * (a.createdAt.getTime() - b.createdAt.getTime()));
      const limit = Number(values[valueIndex++] ?? sorted.length);
      const offset = Number(values[valueIndex++] ?? 0);
      return sorted.slice(offset, offset + limit).map((row) => ({ ...row }));
    });

    prismaMock.auditLog.findMany.mockImplementation(async (args: any) => {
      const filtered = applyAuditFilters(auditLogSeed, args?.where);
      return filtered
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => ({ ...row }));
    });
  });

  describe('GET /admin/approvals/pending', () => {
    it('1. basic listing works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/approvals/pending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items.map((item: any) => item.id)).toEqual(['unlock-001', 'unlock-005']);
      expect(res.body.data.items[0].type).toBe('MONTHLY_UNLOCK');
      expect(res.body.data.items[0].summary).toEqual({ month: '2026-03' });
      expect(res.body.data.items[0].correlationId).toBe('corr-unlock-001');
      expect(res.body.data.pagination).toEqual({ page: 1, limit: 20, total: 2 });
    });

    it('2. returns only PENDING unlock requests', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/approvals/pending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.every((item: any) => item.status === 'PENDING')).toBe(true);
    });

    it('3. Admin cannot see another tenant pending items', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/approvals/pending?tenantId=tenant-bbb')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_MISMATCH');
    });

    it('4. SystemAdmin can search across tenants', async () => {
      const token = makeToken('SystemAdmin', 'tenant-root', 'sys-001');
      const res = await request(app)
        .get('/admin/approvals/pending?tenantId=tenant-bbb')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].id).toBe('unlock-004');
      expect(res.body.data.items[0].tenantId).toBe('tenant-bbb');
    });

    it('5. pagination works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/approvals/pending?page=2&limit=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].id).toBe('unlock-005');
      expect(res.body.data.pagination).toEqual({ page: 2, limit: 1, total: 2 });
    });

    it('6. invalid filters return 422', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/approvals/pending?type=INVALID_TYPE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_INVALID_RANGE');
      expect(res.body.error.field).toBe('type');
    });
  });

  describe('GET /admin/unlock-requests', () => {
    it('1. basic listing works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(4);
      expect(res.body.data.items.map((item: any) => item.id)).toEqual([
        'unlock-005',
        'unlock-003',
        'unlock-002',
        'unlock-001',
      ]);
      expect(res.body.data.items[1].correlationId).toBe('corr-unlock-003-reject');
    });

    it('2. status filter works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests?status=APPROVED')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].id).toBe('unlock-002');
    });

    it('3. month filter works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests?month=2026-03')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.map((item: any) => item.id)).toEqual(['unlock-005', 'unlock-001']);
    });

    it('4. requesterId filter works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests?requesterId=req-003')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].id).toBe('unlock-003');
    });

    it('5. approverId filter works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests?approverId=approver-001')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].id).toBe('unlock-002');
    });

    it('6. date range filter works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests?from=2026-03-02T00:00:00Z&to=2026-03-05T23:59:59Z')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.map((item: any) => item.id)).toEqual(['unlock-003', 'unlock-002']);
    });

    it('7. from > to returns 422', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests?from=2026-03-10T00:00:00Z&to=2026-03-01T00:00:00Z')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_INVALID_RANGE');
      expect(res.body.error.field).toBe('from');
    });

    it('8. tenant boundary enforced', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests?tenantId=tenant-bbb')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TENANT_MISMATCH');
    });

    it('9. pagination works', async () => {
      const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
      const res = await request(app)
        .get('/admin/unlock-requests?page=2&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.map((item: any) => item.id)).toEqual(['unlock-002', 'unlock-001']);
      expect(res.body.data.pagination).toEqual({ page: 2, limit: 2, total: 4 });
    });
  });
});
