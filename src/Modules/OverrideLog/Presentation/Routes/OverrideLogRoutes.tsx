import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const OverrideLogPage = lazy(() =>
  import('@modules/OverrideLog/Presentation/Pages/OverrideLogPage').then((module) => ({
    default: module.OverrideLogPage,
  })),
);

const OverrideLogDetailPage = lazy(() =>
  import('@modules/OverrideLog/Presentation/Pages/OverrideLogDetailPage').then((module) => ({
    default: module.OverrideLogDetailPage,
  })),
);

export const overrideLogRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.OVERRIDES, element: <OverrideLogPage /> },
  { path: ROUTES.FOUNDATION.OVERRIDE_DETAIL(), element: <OverrideLogDetailPage /> },
];
