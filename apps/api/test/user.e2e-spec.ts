import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('UserModule (e2e)', () => {
    let app: INestApplication;
    let adminToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Adminログインしてトークンを取得
        const authRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                storeCode: 'anim',
                loginId: 'anim-0001',
                password: 'Admin1234!',
            });
        
        adminToken = authRes.body.accessToken;
    });

    afterAll(async () => {
        await app.close();
    });

    it('/api/users (POST) - Admin can create a Cast user', async () => {
        const res = await request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                displayName: 'テスト キャスト1',
                role: 'Cast',
                userType: 'cast',
            })
            .expect(201);

        expect(res.body.loginId).toMatch(/^anim-\d{4}$/); // loginIdの自動採番チェック
        expect(res.body.role).toBe('Cast');
        expect(res.body.displayName).toBe('テスト キャスト1');
    });

    it('/api/users (GET) - Admin can list users', async () => {
        const res = await request(app.getHttpServer())
            .get('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0]).toHaveProperty('loginId');
        expect(res.body[0]).toHaveProperty('displayName');
    });

    it('/api/users (POST) - Unauthorized without token', async () => {
        await request(app.getHttpServer())
            .post('/users')
            .send({
                displayName: 'ハッカー',
                role: 'Admin',
                userType: 'staff',
            })
            .expect(401);
    });
});
