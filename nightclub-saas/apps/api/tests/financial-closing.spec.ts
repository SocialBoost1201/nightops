import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';

const prismaMock = {
  $transaction: jest.fn(),
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

    prismaMock.dailyClose.findUnique.mockResolvedValue(null);
    prismaMock.dailyClose.upsert.mockResolvedValue({
      id: 'dclose-001',
      tenantId: 'tenant-aaa',
      businessDate: new Date('2026-03-10'),
      status: 'closed',
      closedBy: 'manager-001',
      closedAt: new Date('2026-03-10T23:59:00Z'),
    });

    prismaMock.monthlyClose.findUnique.mockResolvedValue(null);
    prismaMock.monthlyClose.upsert.mockResolvedValue({
      id: 'mclose-001',
      tenantId: 'tenant-aaa',
      month: '2026-03',
      status: 'closed',
      closedBy: 'admin-001',
      closedAt: new Date('2026-03-31T23:59:00Z'),
    });
    prismaMock.monthlyClose.update.mockResolvedValue({
      id: 'mclose-001',
      tenantId: 'tenant-aaa',
      month: '2026-03',
      status: 'open',
      closedBy: null,
      closedAt: null,
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
});
