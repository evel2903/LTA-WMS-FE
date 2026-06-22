import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@app/Config/Routes';

const BarcodeLabelPage = lazy(() =>
  import('@modules/BarcodeLabel/Presentation/Pages/BarcodeLabelPage').then((m) => ({
    default: m.BarcodeLabelPage,
  })),
);

export const barcodeLabelRoutes: RouteObject[] = [
  { path: ROUTES.LABELS.ROOT, element: <BarcodeLabelPage /> },
];
