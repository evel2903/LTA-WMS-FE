import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const ReasonCodeCatalogPage = lazy(() =>
  import('@modules/ReasonCode/Presentation/Pages/ReasonCodeCatalogPage').then((module) => ({
    default: module.ReasonCodeCatalogPage,
  })),
);

export const reasonCodeRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.REASON_CODES, element: <ReasonCodeCatalogPage /> },
];
