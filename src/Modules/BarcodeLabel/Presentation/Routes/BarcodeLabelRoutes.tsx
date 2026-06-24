import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';

const BarcodeLabelPage = lazy(() =>
  import('@modules/BarcodeLabel/Presentation/Pages/BarcodeLabelPage').then((m) => ({
    default: m.BarcodeLabelPage,
  })),
);
const BarcodeLabelCreatePage = lazy(() =>
  import('@modules/BarcodeLabel/Presentation/Pages/BarcodeLabelDetailPage').then((m) => ({
    default: m.BarcodeLabelCreatePage,
  })),
);
const BarcodeLabelTemplateDetailPage = lazy(() =>
  import('@modules/BarcodeLabel/Presentation/Pages/BarcodeLabelDetailPage').then((m) => ({
    default: m.BarcodeLabelTemplateDetailPage,
  })),
);
const BarcodeLabelPrintJobDetailPage = lazy(() =>
  import('@modules/BarcodeLabel/Presentation/Pages/BarcodeLabelDetailPage').then((m) => ({
    default: m.BarcodeLabelPrintJobDetailPage,
  })),
);

export const barcodeLabelRoutes: RouteObject[] = [
  { path: ROUTES.LABELS.ROOT, element: <BarcodeLabelPage /> },
  { path: ROUTES.LABELS.NEW, element: <BarcodeLabelCreatePage /> },
  { path: ROUTES.LABELS.TEMPLATE_DETAIL(), element: <BarcodeLabelTemplateDetailPage /> },
  { path: ROUTES.LABELS.TEMPLATE_ACTION(), element: <BarcodeLabelTemplateDetailPage /> },
  { path: ROUTES.LABELS.PRINT_JOB_DETAIL(), element: <BarcodeLabelPrintJobDetailPage /> },
  { path: ROUTES.LABELS.PRINT_JOB_ACTION(), element: <BarcodeLabelPrintJobDetailPage /> },
];
