import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * ロール制限デコレータ
 * @example @Roles('Admin', 'Manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
