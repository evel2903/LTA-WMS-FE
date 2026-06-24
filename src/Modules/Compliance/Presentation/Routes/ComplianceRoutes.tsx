import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const AuditLogPage = lazy(() =>
  import('@modules/Compliance/Presentation/Pages/AuditLogPage').then((module) => ({
    default: module.AuditLogPage,
  })),
);

const AuditLogDetailPage = lazy(() =>
  import('@modules/Compliance/Presentation/Pages/AuditLogDetailPage').then((module) => ({
    default: module.AuditLogDetailPage,
  })),
);

const ExceptionQueuePage = lazy(() =>
  import('@modules/Compliance/Presentation/Pages/ExceptionQueuePage').then((module) => ({
    default: module.ExceptionQueuePage,
  })),
);

const ExceptionDetailPage = lazy(() =>
  import('@modules/Compliance/Presentation/Pages/ExceptionDetailPage').then((module) => ({
    default: module.ExceptionDetailPage,
  })),
);

export const complianceRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.AUDIT, element: <AuditLogPage /> },
  { path: ROUTES.FOUNDATION.AUDIT_DETAIL(), element: <AuditLogDetailPage /> },
  { path: ROUTES.FOUNDATION.EXCEPTIONS, element: <ExceptionQueuePage /> },
  {
    path: ROUTES.FOUNDATION.EXCEPTION_DETAIL(),
    element: <ExceptionDetailPage mode="detail" />,
  },
  {
    path: ROUTES.FOUNDATION.EXCEPTION_ACTION(),
    element: <ExceptionDetailPage mode="action" />,
  },
];
