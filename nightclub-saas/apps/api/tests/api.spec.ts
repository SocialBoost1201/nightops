import request from 'supertest';
import { app } from '../src/index';

// DB初期化はスタブまたはコンテキストで実行(単体テストとして振る舞いを確認)

describe('API Foundation (M1)', () => {

    it('1. GET /health checks basic routing', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('ok');
        expect(res.body.meta.correlationId).toBeDefined();
    });

    it('2. POST /auth/login fails without credentials', async () => {
        const res = await request(app).post('/auth/login').send({});
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('VALIDATION_INVALID_RANGE');
        expect(res.body.error.correlationId).toBeDefined();
    });

    it('3. GET /me fails without Token', async () => {
        const res = await request(app).get('/me');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('AUTH_TOKEN_EXPIRED');
        expect(res.body.error.correlationId).toBeDefined();
    });

    it('4. POST /admin/accounts requires Admin role', async () => {
        // Requires token with 'Cast' role injected locally if mock, but without token it should fail
        const res = await request(app).post('/admin/accounts').send({ loginId: 'test' });
        expect(res.status).toBe(401);
    });

});
