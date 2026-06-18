import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const OwnerMasterPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/OwnerMasterPage').then((module) => ({
    default: module.OwnerMasterPage,
  })),
);

const UomMasterPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/UomMasterPage').then((module) => ({
    default: module.UomMasterPage,
  })),
);

const SkuMasterPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/SkuMasterPage').then((module) => ({
    default: module.SkuMasterPage,
  })),
);

export const catalogRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.MASTER_DATA.OWNERS, element: <OwnerMasterPage /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.UOMS, element: <UomMasterPage /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.SKUS, element: <SkuMasterPage /> },
];
