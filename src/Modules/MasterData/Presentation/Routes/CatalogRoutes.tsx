import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const OwnerMasterPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/OwnerMasterPage').then((module) => ({
    default: module.OwnerMasterPage,
  })),
);

const OwnerMasterDetailPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/OwnerMasterDetailPage').then((module) => ({
    default: module.OwnerMasterDetailPage,
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

const SkuMasterDetailPage = lazy(() =>
  import('@modules/MasterData/Presentation/Pages/SkuMasterDetailPage').then((module) => ({
    default: module.SkuMasterDetailPage,
  })),
);

export const catalogRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.MASTER_DATA.OWNERS, element: <OwnerMasterPage /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.OWNER_NEW, element: <OwnerMasterDetailPage mode="create" /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.OWNER_DETAIL(), element: <OwnerMasterDetailPage mode="detail" /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.OWNER_EDIT(), element: <OwnerMasterDetailPage mode="edit" /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.UOMS, element: <UomMasterPage /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.SKUS, element: <SkuMasterPage /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW, element: <SkuMasterDetailPage mode="create" /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(), element: <SkuMasterDetailPage mode="detail" /> },
  { path: ROUTES.FOUNDATION.MASTER_DATA.SKU_EDIT(), element: <SkuMasterDetailPage mode="edit" /> },
];
