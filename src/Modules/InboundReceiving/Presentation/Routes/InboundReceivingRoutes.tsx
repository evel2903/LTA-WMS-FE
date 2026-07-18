import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InboundReceivingDetailPage = lazy(() =>
  import('@modules/InboundReceiving/Presentation/Pages/InboundReceivingDetailPage').then((module) => ({
    default: module.InboundReceivingDetailPage,
  })),
);

export const inboundReceivingRoutes: RouteObject[] = [
  { path: ROUTES.INBOUND_RECEIVING.DETAIL(), element: <InboundReceivingDetailPage /> },
  { path: ROUTES.INBOUND_RECEIVING.DISCREPANCY(), element: <InboundReceivingDetailPage /> },
  { path: ROUTES.INBOUND_RECEIVING.ACTION(), element: <InboundReceivingDetailPage /> },
];
