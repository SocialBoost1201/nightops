import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {}

    /**
     * ログイン: loginId + password → accessToken + refreshToken
     */
    async login(loginId: string, password: string) {
        const account = await this.prisma.account.findUnique({
            where: { loginId },
        });

        if (!account) {
            throw new UnauthorizedException({
                error: { code: 'AUTH_001', message: 'ログインに失敗しました' },
            });
        }

        if (account.status === 'inactive') {
            throw new ForbiddenException({
                error: { code: 'AUTH_003', message: 'このアカウントは無効化されています' },
            });
        }

        if (account.status === 'locked') {
            throw new ForbiddenException({
                error: { code: 'AUTH_003', message: 'このアカウントはロックされています' },
            });
        }

        const isMatch = await bcrypt.compare(password, account.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException({
                error: { code: 'AUTH_001', message: 'ログインに失敗しました' },
            });
        }

        const payload = {
            sub: account.id,
            tenantId: account.tenantId,
            role: account.role,
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        });

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        });

        return {
            accessToken,
            refreshToken,
            role: account.role,
            displayName: account.loginId,
            mustChangePassword: account.passwordChangedAt === null,
        };
    }

    /**
     * パスワード変更
     */
    async changePassword(accountId: string, currentPassword: string, newPassword: string) {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
        });

        if (!account) {
            throw new UnauthorizedException({
                error: { code: 'AUTH_001', message: 'ログインに失敗しました' },
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, account.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException({
                error: { code: 'AUTH_001', message: '現在のパスワードが正しくありません' },
            });
        }

        const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

        await this.prisma.account.update({
            where: { id: accountId },
            data: {
                passwordHash: newHash,
                passwordChangedAt: new Date(),
            },
        });

        return { message: 'パスワードを変更しました' };
    }

    /**
     * トークンリフレッシュ
     */
    async refreshToken(token: string) {
        try {
            const payload = this.jwtService.verify(token);

            // アカウントの有効性を再確認
            const account = await this.prisma.account.findUnique({
                where: { id: payload.sub },
            });

            if (!account || account.status !== 'active') {
                throw new UnauthorizedException({
                    error: { code: 'AUTH_003', message: 'このアカウントは無効化されています' },
                });
            }

            const newPayload = {
                sub: account.id,
                tenantId: account.tenantId,
                role: account.role,
            };

            const accessToken = this.jwtService.sign(newPayload, {
                expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
            });

            return { accessToken };
        } catch {
            throw new UnauthorizedException({
                error: { code: 'AUTH_002', message: 'セッションの有効期限が切れました。再ログインしてください' },
            });
        }
    }
}
