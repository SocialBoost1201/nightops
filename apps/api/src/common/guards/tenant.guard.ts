import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RequestUser } from '../strategies/jwt.strategy';

/**
 * テナント境界ガード（ABAC）
 *
 * リクエストの body.tenantId / query.tenantId と
 * JWT の tenantId が一致しない場合、SystemAdmin 以外は拒否する。
 */
@Injectable()
export class TenantGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user: RequestUser = request.user;

        if (!user) {
            return false;
        }

        // SystemAdmin はテナント制約を受けない
        if (user.role === 'SystemAdmin') {
            return true;
        }

        const requestedTenantId =
            request.body?.tenantId || request.query?.tenantId;

        if (requestedTenantId && requestedTenantId !== user.tenantId) {
            throw new ForbiddenException({
                error: { code: 'TENANT_001', message: 'アクセス権限がありません' },
            });
        }

        return true;
    }
}
