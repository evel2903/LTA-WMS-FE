import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const InboundReceivingPage = lazy(() =>
  import('@modules/InboundReceiving/Presentation/Pages/InboundReceivingPage').then((module) => ({
    default: module.InboundReceivingPage,
  })),
);

const ManualReceiptCreatePage = lazy(() =>
  import('@modules/InboundReceiving/Presentation/Pages/ManualReceiptCreatePage').then((module) => ({
    default: module.ManualReceiptCreatePage,
  })),
);

const ManualReceiptDetailPage = lazy(() =>
  import('@modules/InboundReceiving/Presentation/Pages/ManualReceiptDetailPage').then((module) => ({
    default: module.ManualReceiptDetailPage,
  })),
);

const InboundReceivingDetailPage = lazy(() =>
  import('@modules/InboundReceiving/Presentation/Pages/InboundReceivingDetailPage').then(
    (module) => ({
      default: module.InboundReceivingDetailPage,
    }),
  ),
);

export const inboundReceivingRoutes: RouteObject[] = [
  { path: ROUTES.INBOUND_RECEIVING.ROOT, element: <InboundReceivingPage /> },
  { path: ROUTES.INBOUND_RECEIVING.NEW, element: <ManualReceiptCreatePage /> },
  { path: ROUTES.INBOUND_RECEIVING.RECEIPT_DETAIL(), element: <ManualReceiptDetailPage /> },
  { path: ROUTES.INBOUND_RECEIVING.RECEIPT_ACTION(), element: <ManualReceiptDetailPage /> },
  { path: ROUTES.INBOUND_RECEIVING.DETAIL(), element: <InboundReceivingDetailPage /> },
  { path: ROUTES.INBOUND_RECEIVING.DISCREPANCY(), element: <InboundReceivingDetailPage /> },
  { path: ROUTES.INBOUND_RECEIVING.ACTION(), element: <InboundReceivingDetailPage /> },
];
