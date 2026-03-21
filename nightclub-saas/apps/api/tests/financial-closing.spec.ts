import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';

const prismaMock = {
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  auditLog: {
    create: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  compensationPlan: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  shiftEntry: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
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
  changeRequest: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  salesSlip: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  dailyClose: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  monthlyClose: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

type UnlockRequestRecord = {
  id: string;
  tenantId: string;
  month: string;
  requesterId: string;
  approverId: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  approvedAt: Date | null;
};

let unlockRequests: UnlockRequestRecord[] = [];
let monthlyCloseState: {
  id: string;
  tenantId: string;
  month: string;
  status: 'open' | 'closed';
  closedBy: string | null;
  closedAt: Date | null;
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

describe('Financial Audit and Closing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(prismaMock));

    prismaMock.tenant.findUnique.mockImplementation(async (args: any) => {
      if (args?.select?.status) return { status: 'active' };
      if (args?.where?.id) return { id: args.where.id, status: 'active', planId: 'plan-basic' };
      return null;
    });

    prismaMock.salesSlip.findUnique.mockResolvedValue({
      id: 'slip-001',
      tenantId: 'tenant-aaa',
      businessDate: new Date('2026-03-10'),
      customerId: null,
      tableNumber: 'A1',
      headcount: 2,
      mainCastId: 'cast-001',
      subtotal: 10000,
      serviceTaxAmount: 1000,
      totalRounded: 11000,
      status: 'open',
      closedAt: null,
      closedBy: null,
      createdAt: new Date('2026-03-10T10:00:00Z'),
      updatedAt: new Date('2026-03-10T10:00:00Z'),
    });
    prismaMock.salesSlip.update.mockResolvedValue({
      id: 'slip-001',
      tenantId: 'tenant-aaa',
      businessDate: new Date('2026-03-10'),
      customerId: null,
      tableNumber: 'A1',
      headcount: 2,
      mainCastId: 'cast-001',
      subtotal: 12000,
      serviceTaxAmount: 1200,
      totalRounded: 13200,
      status: 'open',
      closedAt: null,
      closedBy: null,
      createdAt: new Date('2026-03-10T10:00:00Z'),
      updatedAt: new Date('2026-03-10T11:00:00Z'),
    });
    prismaMock.salesSlip.findMany.mockResolvedValue([
      { totalRounded: 13000 },
      { totalRounded: 12000 },
    ]);

    unlockRequests = [];
    monthlyCloseState = {
      id: 'mclose-001',
      tenantId: 'tenant-aaa',
      month: '2026-03',
      status: 'open',
      closedBy: null,
      closedAt: null,
    };

    prismaMock.dailyClose.findUnique.mockResolvedValue(null);
    prismaMock.dailyClose.upsert.mockResolvedValue({
      id: 'dclose-001',
      tenantId: 'tenant-aaa',
      businessDate: new Date('2026-03-10'),
      status: 'closed',
      closedBy: 'manager-001',
      closedAt: new Date('2026-03-10T23:59:00Z'),
    });

    prismaMock.monthlyClose.findUnique.mockImplementation(async (args: any) => {
      const key = args?.where?.uq_monthly_closes_tenant_month;
      if (!key) {
        return null;
      }
      if (key.tenantId !== monthlyCloseState.tenantId || key.month !== monthlyCloseState.month) {
        return null;
      }
      return { ...monthlyCloseState };
    });

    prismaMock.monthlyClose.upsert.mockImplementation(async () => {
      monthlyCloseState = {
        ...monthlyCloseState,
        status: 'closed',
        closedBy: 'admin-001',
        closedAt: new Date('2026-03-31T23:59:00Z'),
      };
      return { ...monthlyCloseState };
    });

    prismaMock.monthlyClose.update.mockImplementation(async () => {
      monthlyCloseState = {
        ...monthlyCloseState,
        status: 'open',
        closedBy: null,
        closedAt: null,
      };
      return { ...monthlyCloseState };
    });

    prismaMock.$queryRaw.mockImplementation(async (...args: any[]) => {
      const [query, ...values] = args;
      const queryText = Array.isArray(query) ? query.join(' ') : String(query);

      if (queryText.includes('INSERT INTO unlock_requests')) {
        const [id, tenantId, month, requesterId, reason, status] = values;
        const record: UnlockRequestRecord = {
          id: String(id),
          tenantId: String(tenantId),
          month: String(month),
          requesterId: String(requesterId),
          approverId: null,
          reason: String(reason),
          status: String(status) as UnlockRequestRecord['status'],
          createdAt: new Date('2026-03-21T12:00:00Z'),
          approvedAt: null,
        };
        unlockRequests.push(record);
        return [{ ...record }];
      }

      if (queryText.includes('UPDATE unlock_requests')) {
        const [status, approverId, requestId] = values;
        const index = unlockRequests.findIndex((item) => item.id === String(requestId));
        if (index < 0) {
          return [];
        }
        const nextRecord: UnlockRequestRecord = {
          ...unlockRequests[index],
          status: String(status) as UnlockRequestRecord['status'],
          approverId: String(approverId),
          approvedAt: new Date('2026-03-21T12:10:00Z'),
        };
        unlockRequests[index] = nextRecord;
        return [{ ...nextRecord }];
      }

      if (queryText.includes('AND status =') && queryText.includes('FROM unlock_requests')) {
        const [tenantId, month, status] = values;
        const found = unlockRequests
          .filter(
            (item) =>
              item.tenantId === String(tenantId) &&
              item.month === String(month) &&
              item.status === String(status),
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        return found ? [{ ...found }] : [];
      }

      if (queryText.includes('WHERE unlock_request_id')) {
        const [requestId] = values;
        const found = unlockRequests.find((item) => item.id === String(requestId));
        return found ? [{ ...found }] : [];
      }

      return [];
    });

    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit-001' });
  });

  it('1. sales update records before/after in audit log', async () => {
    const token = makeToken('Manager', 'tenant-aaa', 'manager-001');
    const res = await request(app)
      .patch('/sales/slip-001')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subtotal: 12000,
        serviceTaxAmount: 1200,
        totalRounded: 13200,
        reason: '会計修正',
      });

    expect(res.status).toBe(200);
    const data = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(data.actionType).toBe('UPDATE_SALES_SLIP');
    expect(data.beforeData.subtotal).toBe(10000);
    expect(data.afterData.snapshot.subtotal).toBe(12000);
    expect(data.afterData.__audit.reason).toBe('会計修正');
  });

  it('2. sales update rejects when reason is missing', async () => {
    const token = makeToken('Manager', 'tenant-aaa', 'manager-001');
    const res = await request(app)
      .patch('/sales/slip-001')
      .set('Authorization', `Bearer ${token}`)
      .send({
        totalRounded: 13200,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.field).toBe('reason');
  });

  it('3. rejects sales update when month is already confirmed', async () => {
    const token = makeToken('Manager', 'tenant-aaa', 'manager-001');
    prismaMock.monthlyClose.findUnique.mockResolvedValue({ status: 'closed' });

    const res = await request(app)
      .patch('/sales/slip-001')
      .set('Authorization', `Bearer ${token}`)
      .send({
        totalRounded: 13200,
        reason: '修正テスト',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('4. daily close creates audit snapshot', async () => {
    const token = makeToken('Manager', 'tenant-aaa', 'manager-001');
    const res = await request(app)
      .post('/reports/close/daily')
      .set('Authorization', `Bearer ${token}`)
      .send({
        businessDate: '2026-03-10',
        cashActual: 25000,
        reason: '営業日締め',
      });

    expect(res.status).toBe(200);
    const data = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(data.actionType).toBe('DAILY_CLOSE');
    expect(data.afterData.snapshot.totalSales).toBe(25000);
    expect(data.afterData.snapshot.cashExpected).toBe(25000);
    expect(data.afterData.snapshot.cashActual).toBe(25000);
    expect(data.afterData.snapshot.difference).toBe(0);
  });

  it('5. correlationId is attached to financial audit logs', async () => {
    const token = makeToken('Manager', 'tenant-aaa', 'manager-001');
    await request(app)
      .patch('/sales/slip-001')
      .set('Authorization', `Bearer ${token}`)
      .set('x-correlation-id', 'corr-fin-001')
      .send({
        totalRounded: 13200,
        reason: '伝票修正',
      });

    const data = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(data.correlationId).toBe('corr-fin-001');
  });

  it('6. monthly unlock request creation works', async () => {
    monthlyCloseState = {
      ...monthlyCloseState,
      status: 'closed',
      closedBy: 'admin-001',
      closedAt: new Date('2026-03-31T23:59:00Z'),
    };
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .post('/reports/close/monthly/unlock/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        month: '2026-03',
        reason: 'Monthly rollback due audit mismatch',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.requestId).toBeDefined();
    expect(unlockRequests).toHaveLength(1);

    const data = prismaMock.auditLog.create.mock.calls[0][0].data;
    expect(data.actionType).toBe('REQUEST_MONTHLY_UNLOCK');
    expect(data.afterData.__audit.approvalFlow).toBe('4-eyes');
    expect(data.afterData.__audit.requestId).toBe(res.body.data.requestId);
  });

  it('7. monthly unlock approval works with different approver', async () => {
    monthlyCloseState = {
      ...monthlyCloseState,
      status: 'closed',
      closedBy: 'admin-001',
      closedAt: new Date('2026-03-31T23:59:00Z'),
    };
    const requesterToken = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const requestRes = await request(app)
      .post('/reports/close/monthly/unlock/request')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        month: '2026-03',
        reason: 'Unlock month for correction after reconciliation',
      });

    const approveToken = makeToken('SystemAdmin', 'tenant-root', 'sys-002');
    const approveRes = await request(app)
      .post('/reports/close/monthly/unlock/approve')
      .set('Authorization', `Bearer ${approveToken}`)
      .send({
        tenantId: 'tenant-aaa',
        requestId: requestRes.body.data.requestId,
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.data.status).toBe('open');
    expect(approveRes.body.data.unlockRequestStatus).toBe('APPROVED');
    expect(monthlyCloseState.status).toBe('open');

    const auditCalls = prismaMock.auditLog.create.mock.calls.map((call: any) => call[0].data.actionType);
    expect(auditCalls).toContain('REQUEST_MONTHLY_UNLOCK');
    expect(auditCalls).toContain('APPROVE_MONTHLY_UNLOCK');
  });

  it('8. same user cannot approve own monthly unlock request', async () => {
    monthlyCloseState = {
      ...monthlyCloseState,
      status: 'closed',
      closedBy: 'admin-001',
      closedAt: new Date('2026-03-31T23:59:00Z'),
    };
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const requestRes = await request(app)
      .post('/reports/close/monthly/unlock/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        month: '2026-03',
        reason: 'Unlock month for correcting locked financial record',
      });

    const approveRes = await request(app)
      .post('/reports/close/monthly/unlock/approve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        requestId: requestRes.body.data.requestId,
      });

    expect(approveRes.status).toBe(409);
    expect(approveRes.body.success).toBe(false);
    expect(approveRes.body.error.code).toBe('CONFLICT');
  });

  it('9. unlock is not executed before approval', async () => {
    monthlyCloseState = {
      ...monthlyCloseState,
      status: 'closed',
      closedBy: 'admin-001',
      closedAt: new Date('2026-03-31T23:59:00Z'),
    };
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .post('/reports/close/monthly/unlock/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        month: '2026-03',
        reason: 'Unlock month request for validated correction path',
      });

    expect(res.status).toBe(200);
    expect(monthlyCloseState.status).toBe('closed');
    expect(prismaMock.monthlyClose.update).not.toHaveBeenCalled();
  });

  it('10. unlock request requires reason with minimum length', async () => {
    const token = makeToken('Admin', 'tenant-aaa', 'admin-001');
    const res = await request(app)
      .post('/reports/close/monthly/unlock/request')
      .set('Authorization', `Bearer ${token}`)
      .send({
        month: '2026-03',
        reason: 'short',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.field).toBe('reason');
  });
});
