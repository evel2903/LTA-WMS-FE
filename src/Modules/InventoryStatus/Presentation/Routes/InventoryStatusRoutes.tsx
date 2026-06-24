import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InventoryStatusCatalogPage = lazy(() =>
  import('@modules/InventoryStatus/Presentation/Pages/InventoryStatusCatalogPage').then((module) => ({
    default: module.InventoryStatusCatalogPage,
  })),
);

const InventoryStatusDetailPage = lazy(() =>
  import('@modules/InventoryStatus/Presentation/Pages/InventoryStatusDetailPage').then((module) => ({
    default: module.InventoryStatusDetailPage,
  })),
);

export const inventoryStatusRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.INVENTORY_STATUS, element: <InventoryStatusCatalogPage /> },
  { path: ROUTES.FOUNDATION.INVENTORY_STATUS_DETAIL(), element: <InventoryStatusDetailPage mode="detail" /> },
  { path: ROUTES.FOUNDATION.INVENTORY_STATUS_EDIT(), element: <InventoryStatusDetailPage mode="edit" /> },
];
