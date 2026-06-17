import { Navigate, Outlet } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { PageSpinner } from '@shared/Components/Feedback/Spinner';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';

/** Inverse of ProtectedRoute — keeps signed-in users away from /login & /register. */
export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const status = useAuthStore((s) => s.status);

  // Wait for the boot session check before deciding (avoids showing the login
  // form to a user who turns out to be authenticated).
  if (status === 'initializing') return <PageSpinner />;

  return isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <Outlet />;
}
