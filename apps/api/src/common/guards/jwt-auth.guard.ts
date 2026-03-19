import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest<T>(err: Error | null, user: T): T {
        if (err || !user) {
            throw new UnauthorizedException({
                error: { code: 'AUTH_002', message: 'セッションの有効期限が切れました。再ログインしてください' },
            });
        }
        return user;
    }
}
