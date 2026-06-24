import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import {
  CycleCountCreatePage,
  CycleCountDetailPage,
} from '@modules/CycleCount/Presentation/Pages/CycleCountDetailPage';
import { CycleCountPage } from '@modules/CycleCount/Presentation/Pages/CycleCountPage';

export const cycleCountRoutes: RouteObject[] = [
  { path: ROUTES.CYCLE_COUNT.ROOT, element: <CycleCountPage /> },
  { path: ROUTES.CYCLE_COUNT.NEW, element: <CycleCountCreatePage /> },
  { path: ROUTES.CYCLE_COUNT.DETAIL(), element: <CycleCountDetailPage /> },
  { path: ROUTES.CYCLE_COUNT.ACTION(), element: <CycleCountDetailPage /> },
];
