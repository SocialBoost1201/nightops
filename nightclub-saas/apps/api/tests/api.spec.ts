import request from 'supertest';
import { app } from '../src/index';

// DB初期化はスタブまたはコンテキストで実行(単体テストとして振る舞いを確認)

describe('API Foundation (M1)', () => {

    it('1. GET /health checks basic routing', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('2. POST /auth/login fails without credentials', async () => {
        const res = await request(app).post('/auth/login').send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALID_001'); // Error code uniformity check
    });

    it('3. GET /me fails without Token', async () => {
        const res = await request(app).get('/me');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('AUTH_003');
    });

    it('4. POST /admin/accounts requires Admin role', async () => {
        // Requires token with 'Cast' role injected locally if mock, but without token it should fail
        const res = await request(app).post('/admin/accounts').send({ loginId: 'test' });
        expect(res.status).toBe(401);
    });

});
