import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // セキュリティ
    app.use(helmet());

    // CORS
    app.enableCors({
        origin: [
            'http://localhost:3001', // Web Admin (dev)
        ],
        credentials: true,
    });

    // グローバルバリデーション
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // APIプレフィックス
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 NightOps API running on http://localhost:${port}`);
}
bootstrap();
