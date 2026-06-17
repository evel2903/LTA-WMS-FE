import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InventoryPage = lazy(() =>
  import('@modules/Inventory/Presentation/Pages/InventoryPage').then((m) => ({
    default: m.InventoryPage,
  })),
);

const InventoryDetailPage = lazy(() =>
  import('@modules/Inventory/Presentation/Pages/InventoryDetailPage').then((m) => ({
    default: m.InventoryDetailPage,
  })),
);

/** Inventory module routes, aggregated by the App router under the dashboard shell. */
export const inventoryRoutes: RouteObject[] = [
  { path: ROUTES.INVENTORY.ROOT, element: <InventoryPage /> },
  { path: ROUTES.INVENTORY.DETAIL(), element: <InventoryDetailPage /> },
];
