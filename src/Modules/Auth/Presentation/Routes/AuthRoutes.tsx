import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const LoginPage = lazy(() =>
  import('@modules/Auth/Presentation/Pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);

const RegisterPage = lazy(() =>
  import('@modules/Auth/Presentation/Pages/RegisterPage').then((m) => ({
    default: m.RegisterPage,
  })),
);

/**
 * Route definitions owned by the Auth module. Aggregated by the App router.
 * The module exports routes; it does not know how they are mounted.
 */
export const authRoutes: RouteObject[] = [
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  { path: ROUTES.REGISTER, element: <RegisterPage /> },
];
