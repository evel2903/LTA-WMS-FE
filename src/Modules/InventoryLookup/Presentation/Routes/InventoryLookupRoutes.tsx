import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InventoryLookupPage = lazy(() =>
  import('@modules/InventoryLookup/Presentation/Pages/InventoryLookupPage').then((m) => ({
    default: m.InventoryLookupPage,
  })),
);

/** InventoryLookup module routes, aggregated by the App router under the dashboard shell. */
export const inventoryLookupRoutes: RouteObject[] = [
  { path: ROUTES.INVENTORY_LOOKUP.ROOT, element: <InventoryLookupPage /> },
];
