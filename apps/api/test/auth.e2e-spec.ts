import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AuthModule (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('/api/auth/login (POST) - should login admin successfully', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                storeCode: 'anim',
                loginId: 'anim-0001',
                password: 'Admin1234!',
            });
        
        console.log(res.body);
        expect(res.status).toBe(200);

        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('role', 'Admin');
        expect(res.body).toHaveProperty('displayName', '管理者');
    });

    it('/api/auth/login (POST) - should fail with wrong password', async () => {
        const res = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                storeCode: 'anim',
                loginId: 'anim-0001',
                password: 'WrongPassword!',
            })
            .expect(401);
            
        expect(res.body.error.code).toBe('AUTH_001');
    });
});
