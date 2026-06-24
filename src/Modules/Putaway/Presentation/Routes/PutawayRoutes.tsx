import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const PutawayPage = lazy(() =>
  import('@modules/Putaway/Presentation/Pages/PutawayPage').then((module) => ({
    default: module.PutawayPage,
  })),
);

const PutawayDetailPage = lazy(() =>
  import('@modules/Putaway/Presentation/Pages/PutawayDetailPage').then((module) => ({
    default: module.PutawayDetailPage,
  })),
);

export const putawayRoutes: RouteObject[] = [
  { path: ROUTES.PUTAWAY.ROOT, element: <PutawayPage /> },
  { path: ROUTES.PUTAWAY.DETAIL(), element: <PutawayDetailPage /> },
  { path: ROUTES.PUTAWAY.ACTION(), element: <PutawayDetailPage /> },
];
