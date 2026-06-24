import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import {
  ReplenishmentCreatePage,
  ReplenishmentDetailPage,
} from '@modules/Replenishment/Presentation/Pages/ReplenishmentDetailPage';
import { ReplenishmentPage } from '@modules/Replenishment/Presentation/Pages/ReplenishmentPage';

export const replenishmentRoutes: RouteObject[] = [
  { path: ROUTES.REPLENISHMENT.ROOT, element: <ReplenishmentPage /> },
  { path: ROUTES.REPLENISHMENT.NEW, element: <ReplenishmentCreatePage /> },
  { path: ROUTES.REPLENISHMENT.DETAIL(), element: <ReplenishmentDetailPage /> },
  { path: ROUTES.REPLENISHMENT.ACTION(), element: <ReplenishmentDetailPage /> },
];
