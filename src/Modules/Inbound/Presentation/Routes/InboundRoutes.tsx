import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InboundPage = lazy(() =>
  import('@modules/Inbound/Presentation/Pages/InboundPage').then((module) => ({
    default: module.InboundPage,
  })),
);

const InboundDetailPage = lazy(() =>
  import('@modules/Inbound/Presentation/Pages/InboundDetailPage').then((module) => ({
    default: module.InboundDetailPage,
  })),
);

const InboundCreatePage = lazy(() =>
  import('@modules/Inbound/Presentation/Pages/InboundCreatePage').then((module) => ({
    default: module.InboundCreatePage,
  })),
);

export const inboundRoutes: RouteObject[] = [
  { path: ROUTES.INBOUND.ROOT, element: <InboundPage /> },
  { path: ROUTES.INBOUND.NEW, element: <InboundCreatePage /> },
  { path: ROUTES.INBOUND.DETAIL(), element: <InboundDetailPage /> },
  { path: ROUTES.INBOUND.DISCREPANCY(), element: <InboundDetailPage /> },
  { path: ROUTES.INBOUND.ACTION(), element: <InboundDetailPage /> },
];
