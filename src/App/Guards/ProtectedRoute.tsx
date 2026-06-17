import { type PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { PageSpinner } from '@shared/Components/Feedback/Spinner';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';

/**
 * Gate for authenticated routes. Redirects unauthenticated users to /login and
 * preserves the intended destination so they return there after signing in.
 *
 * Usage: as a layout route element (`<ProtectedRoute />` wrapping `<Outlet />`)
 * or wrapping children directly.
 */
export function ProtectedRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  // Hold rendering while the boot `GET /auth/me` resolves — no login flash.
  if (status === 'initializing') return <PageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
