import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import { ReplenishmentPage } from '@modules/Replenishment/Presentation/Pages/ReplenishmentPage';

export const replenishmentRoutes: RouteObject[] = [
  { path: ROUTES.REPLENISHMENT.ROOT, element: <ReplenishmentPage /> },
];
