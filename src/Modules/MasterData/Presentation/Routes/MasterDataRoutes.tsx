import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const SiteLocationTreePage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/SiteLocationTreePage').then((module) => ({
    default: module.SiteLocationTreePage,
  })),
);

export const masterDataRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.LOCATIONS, element: <SiteLocationTreePage /> },
];
