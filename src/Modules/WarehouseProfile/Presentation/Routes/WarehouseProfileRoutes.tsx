import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const WarehouseProfilesPage = lazy(() =>
  import('@modules/WarehouseProfile/Presentation/Pages/WarehouseProfilesPage').then((module) => ({
    default: module.WarehouseProfilesPage,
  })),
);

const RuleMatrixPage = lazy(() =>
  import('@modules/WarehouseProfile/Presentation/Pages/RuleMatrixPage').then((module) => ({
    default: module.RuleMatrixPage,
  })),
);

export const warehouseProfileRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.WAREHOUSE_PROFILES, element: <WarehouseProfilesPage /> },
  { path: ROUTES.FOUNDATION.RULE_MATRIX, element: <RuleMatrixPage /> },
];
