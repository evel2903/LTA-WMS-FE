import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InboundPage = lazy(() =>
  import('@modules/Inbound/Presentation/Pages/InboundPage').then((module) => ({
    default: module.InboundPage,
  })),
);

export const inboundRoutes: RouteObject[] = [
  { path: ROUTES.INBOUND.ROOT, element: <InboundPage /> },
];
