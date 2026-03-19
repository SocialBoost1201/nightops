'use client';

import { useAuth } from '@/contexts/AuthContext';

type Role = 'admin' | 'manager' | 'cast';

interface Props {
  allowedRoles: Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * RoleGuard — wrap any element that should only be visible to certain roles.
 * Usage: <RoleGuard allowedRoles={['admin']}><AdminOnlyComponent /></RoleGuard>
 */
export function RoleGuard({ allowedRoles, fallback = null, children }: Props) {
  const { user } = useAuth();

  if (!user) return null;
  if (!allowedRoles.includes(user.role as Role)) return <>{fallback}</>;

  return <>{children}</>;
}
