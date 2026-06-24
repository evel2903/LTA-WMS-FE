import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const WarehouseProfilesPage = lazy(() =>
  import('@modules/WarehouseProfile/Presentation/Pages/WarehouseProfilesPage').then((module) => ({
    default: module.WarehouseProfilesPage,
  })),
);

const WarehouseProfileDetailPage = lazy(() =>
  import('@modules/WarehouseProfile/Presentation/Pages/WarehouseProfileDetailPage').then((module) => ({
    default: module.WarehouseProfileDetailPage,
  })),
);

const RuleMatrixPage = lazy(() =>
  import('@modules/WarehouseProfile/Presentation/Pages/RuleMatrixPage').then((module) => ({
    default: module.RuleMatrixPage,
  })),
);

const RuleMatrixPreviewPage = lazy(() =>
  import('@modules/WarehouseProfile/Presentation/Pages/RuleMatrixPreviewPage').then((module) => ({
    default: module.RuleMatrixPreviewPage,
  })),
);

export const warehouseProfileRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.WAREHOUSE_PROFILES, element: <WarehouseProfilesPage /> },
  {
    path: ROUTES.FOUNDATION.WAREHOUSE_PROFILE_NEW,
    element: <WarehouseProfileDetailPage mode="create" />,
  },
  {
    path: ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL(),
    element: <WarehouseProfileDetailPage mode="detail" />,
  },
  {
    path: ROUTES.FOUNDATION.WAREHOUSE_PROFILE_EDIT(),
    element: <WarehouseProfileDetailPage mode="edit" />,
  },
  { path: ROUTES.FOUNDATION.RULE_MATRIX, element: <RuleMatrixPage /> },
  { path: ROUTES.FOUNDATION.RULE_MATRIX_PREVIEW, element: <RuleMatrixPreviewPage /> },
];
