import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InventoryStatusCatalogPage = lazy(() =>
  import('@modules/InventoryStatus/Presentation/Pages/InventoryStatusCatalogPage').then((module) => ({
    default: module.InventoryStatusCatalogPage,
  })),
);

export const inventoryStatusRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.INVENTORY_STATUS, element: <InventoryStatusCatalogPage /> },
];
