import { type PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import type { UserRole } from '@modules/Auth/Domain/Entities/User';

interface RoleGuardProps extends PropsWithChildren {
  allowed: UserRole[];
}

/**
 * Authorization gate. Assumes `ProtectedRoute` already guaranteed a session.
 * Renders the route only if the current user holds one of the allowed roles.
 */
export function RoleGuard({ allowed, children }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const hasAccess = !!user && allowed.includes(user.role);

  if (!hasAccess) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children ?? <Outlet />;
}
