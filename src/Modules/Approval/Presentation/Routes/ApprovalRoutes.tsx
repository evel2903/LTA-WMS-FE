import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const ApprovalQueuePage = lazy(() =>
  import('@modules/Approval/Presentation/Pages/ApprovalQueuePage').then((module) => ({
    default: module.ApprovalQueuePage,
  })),
);

export const approvalRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.APPROVALS, element: <ApprovalQueuePage /> },
];
