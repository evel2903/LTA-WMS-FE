import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const AuditLogPage = lazy(() =>
  import('@modules/Compliance/Presentation/Pages/AuditLogPage').then((module) => ({
    default: module.AuditLogPage,
  })),
);

const ExceptionQueuePage = lazy(() =>
  import('@modules/Compliance/Presentation/Pages/ExceptionQueuePage').then((module) => ({
    default: module.ExceptionQueuePage,
  })),
);

export const complianceRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.AUDIT, element: <AuditLogPage /> },
  { path: ROUTES.FOUNDATION.EXCEPTIONS, element: <ExceptionQueuePage /> },
];
