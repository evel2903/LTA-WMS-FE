import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const ApprovalQueuePage = lazy(() =>
  import('@modules/Approval/Presentation/Pages/ApprovalQueuePage').then((module) => ({
    default: module.ApprovalQueuePage,
  })),
);

const ApprovalRequestDetailPage = lazy(() =>
  import('@modules/Approval/Presentation/Pages/ApprovalRequestDetailPage').then((module) => ({
    default: module.ApprovalRequestDetailPage,
  })),
);

export const approvalRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.APPROVALS, element: <ApprovalQueuePage /> },
  {
    path: ROUTES.FOUNDATION.APPROVAL_DETAIL(),
    element: <ApprovalRequestDetailPage mode="detail" />,
  },
  {
    path: ROUTES.FOUNDATION.APPROVAL_ACTION(),
    element: <ApprovalRequestDetailPage mode="action" />,
  },
];
