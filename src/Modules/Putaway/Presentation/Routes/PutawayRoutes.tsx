import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const PutawayPage = lazy(() =>
  import('@modules/Putaway/Presentation/Pages/PutawayPage').then((module) => ({
    default: module.PutawayPage,
  })),
);

export const putawayRoutes: RouteObject[] = [{ path: ROUTES.PUTAWAY.ROOT, element: <PutawayPage /> }];
