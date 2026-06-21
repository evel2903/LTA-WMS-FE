import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const FoundationOverviewPage = lazy(() =>
  import('@modules/FoundationOverview/Presentation/Pages/FoundationOverviewPage').then(
    (module) => ({
      default: module.FoundationOverviewPage,
    }),
  ),
);

export const foundationOverviewRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.ROOT, element: <FoundationOverviewPage /> },
];
