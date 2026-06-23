import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';
import { CycleCountPage } from '@modules/CycleCount/Presentation/Pages/CycleCountPage';

export const cycleCountRoutes: RouteObject[] = [{ path: ROUTES.CYCLE_COUNT.ROOT, element: <CycleCountPage /> }];
