import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const ReasonCodeCatalogPage = lazy(() =>
  import('@modules/ReasonCode/Presentation/Pages/ReasonCodeCatalogPage').then((module) => ({
    default: module.ReasonCodeCatalogPage,
  })),
);

const ReasonCodeDetailPage = lazy(() =>
  import('@modules/ReasonCode/Presentation/Pages/ReasonCodeDetailPage').then((module) => ({
    default: module.ReasonCodeDetailPage,
  })),
);

export const reasonCodeRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.REASON_CODES, element: <ReasonCodeCatalogPage /> },
  { path: ROUTES.FOUNDATION.REASON_CODE_NEW, element: <ReasonCodeDetailPage mode="create" /> },
  { path: ROUTES.FOUNDATION.REASON_CODE_DETAIL(), element: <ReasonCodeDetailPage mode="detail" /> },
  { path: ROUTES.FOUNDATION.REASON_CODE_EDIT(), element: <ReasonCodeDetailPage mode="edit" /> },
];
