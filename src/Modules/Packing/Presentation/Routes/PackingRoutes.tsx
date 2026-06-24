import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import {
  PackingCreatePage,
  PackingDetailPage,
} from '@modules/Packing/Presentation/Pages/PackingDetailPage';
import { PackingPage } from '@modules/Packing/Presentation/Pages/PackingPage';

export const packingRoutes: RouteObject[] = [
  { path: ROUTES.PACKING.ROOT, element: <PackingPage /> },
  { path: ROUTES.PACKING.NEW, element: <PackingCreatePage /> },
  { path: ROUTES.PACKING.DETAIL(), element: <PackingDetailPage /> },
  { path: ROUTES.PACKING.ACTION(), element: <PackingDetailPage /> },
];
