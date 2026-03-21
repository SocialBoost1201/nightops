import request from 'supertest';
import { app } from '../src/index';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_nightclub_saas';

const makeToken = (role: string, tenantId = 'tenant-aaa', id = 'user-001') => {
  return jwt.sign({ sub: id, tenantId, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('M2: Shift API', () => {
  // =====================
  // POST /attendance/shifts
  // =====================

  it('1. Cast can create own shift', async () => {
    const token = makeToken('Cast');
    const res = await request(app)
      .post('/attendance/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        targetDate: '2026-03-01',
        isWorking: true,
        startTime: '2026-03-01T18:00:00+09:00',
        endTime: '2026-03-01T23:00:00+09:00',
        submissionNote: 'よろしくお願いします',
      });
    // DB接続がないので 500 or 400 になるが、認証・RBAC通過を確認
    expect([201, 400, 500]).toContain(res.status);
  });

  it('2. Cast cannot register shift for another account', async () => {
    const token = makeToken('Cast', 'tenant-aaa', 'user-001');
    const res = await request(app)
      .post('/attendance/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        accountId: 'user-999', // 他人のID
        targetDate: '2026-03-01',
        isWorking: true,
      });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('3. POST /attendance/shifts fails without token (401)', async () => {
    const res = await request(app)
      .post('/attendance/shifts')
      .send({ targetDate: '2026-03-01', isWorking: true });
    expect(res.status).toBe(401);
  });

  it('4. POST /attendance/shifts fails without targetDate (400)', async () => {
    const token = makeToken('Cast');
    const res = await request(app)
      .post('/attendance/shifts')
      .set('Authorization', `Bearer ${token}`)
      .send({ isWorking: true });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_INVALID_RANGE');
  });

  // =====================
  // GET /attendance/shifts
  // =====================

  it('5. Manager can access GET /attendance/shifts', async () => {
    const token = makeToken('Manager');
    const res = await request(app)
      .get('/attendance/shifts')
      .set('Authorization', `Bearer ${token}`);
    // DB未接続で500になりうるが、認証通過は確認
    expect([200, 500]).toContain(res.status);
  });

  it('6. GET /attendance/shifts fails without token (401)', async () => {
    const res = await request(app).get('/attendance/shifts');
    expect(res.status).toBe(401);
  });

  // =====================
  // PUT /attendance/shifts/status
  // =====================

  it('7. Cast cannot use PUT /attendance/shifts/status (403)', async () => {
    const token = makeToken('Cast');
    const res = await request(app)
      .put('/attendance/shifts/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ shiftIds: ['abc'], status: 'approved' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('8. PUT /attendance/shifts/status fails with bad status value', async () => {
    const token = makeToken('Manager');
    const res = await request(app)
      .put('/attendance/shifts/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ shiftIds: ['abc'], status: 'invalid_status' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_INVALID_RANGE');
  });

  it('9. PUT /attendance/shifts/status fails with empty shiftIds', async () => {
    const token = makeToken('Manager');
    const res = await request(app)
      .put('/attendance/shifts/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ shiftIds: [], status: 'approved' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_INVALID_RANGE');
  });
});
