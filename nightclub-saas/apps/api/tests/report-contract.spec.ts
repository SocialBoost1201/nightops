import request from 'supertest';
import jwt from 'jsonwebtoken';
import { getTodayBusinessDateString, parseDateOnlyString } from '../src/utils/business-date';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';

const prismaMock = {
  account: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
  },
  salesSlip: {
    findMany: jest.fn(),
  },
  drinkCount: {
    findMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  compensationPlan: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../prisma/generated/client', () => ({
  PrismaClient: jest.fn(() => prismaMock),
}));

import { app } from '../src/index';

const makeToken = (role = 'Manager', tenantId = 'tenant-aaa', id = 'manager-001') =>
  jwt.sign({ sub: id, tenantId, role }, JWT_SECRET, { expiresIn: '1h' });

describe('Report API Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue({ status: 'active' });
    prismaMock.salesSlip.findMany.mockResolvedValue([]);
    prismaMock.drinkCount.findMany.mockResolvedValue([]);
  });

  it('1. rejects non-existent businessDate', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/reports/daily?businessDate=2026-99-99')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('REPORT_INVALID_BUSINESS_DATE');
    expect(res.body.error.field).toBe('businessDate');
    expect(res.body.error.correlationId).toBeDefined();
    expect(res.headers['x-correlation-id']).toBe(res.body.error.correlationId);
    expect(prismaMock.salesSlip.findMany).not.toHaveBeenCalled();
  });

  it('2. rejects range when from > to', async () => {
    const token = makeToken();
    const res = await request(app)
      .get('/reports/ranking/sales?from=2026-12-31&to=2026-01-01')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('REPORT_INVALID_RANGE');
    expect(res.body.error.field).toBe('from');
    expect(res.body.error.correlationId).toBeDefined();
  });

  it('3. applies default businessDate when omitted', async () => {
    const token = makeToken();
    const expectedDateString = getTodayBusinessDateString();
    const expectedDate = parseDateOnlyString(expectedDateString);

    const res = await request(app)
      .get('/reports/daily')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.businessDate).toBe(expectedDateString);
    expect(res.body.meta.correlationId).toBeDefined();
    expect(prismaMock.salesSlip.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-aaa',
        businessDate: expectedDate,
      },
    });
  });

  it('4. enforces tenant boundary for non-system-admin', async () => {
    const token = makeToken('Manager', 'tenant-aaa');
    const res = await request(app)
      .get('/reports/daily?tenantId=tenant-bbb')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TENANT_MISMATCH');
    expect(res.body.error.correlationId).toBeDefined();
  });
});
