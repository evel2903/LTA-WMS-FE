import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const RolesMasterPage = lazy(() =>
  import('@modules/AccessControl/Presentation/Pages/RolesMasterPage').then((module) => ({
    default: module.RolesMasterPage,
  })),
);

const RoleDetailPage = lazy(() =>
  import('@modules/AccessControl/Presentation/Pages/RoleDetailPage').then((module) => ({
    default: module.RoleDetailPage,
  })),
);

const UsersAssignmentsPage = lazy(() =>
  import('@modules/AccessControl/Presentation/Pages/UsersAssignmentsPage').then((module) => ({
    default: module.UsersAssignmentsPage,
  })),
);

const UserAssignmentDetailPage = lazy(() =>
  import('@modules/AccessControl/Presentation/Pages/UserAssignmentDetailPage').then((module) => ({
    default: module.UserAssignmentDetailPage,
  })),
);

export const accessControlRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.ACCESS.ROLES, element: <RolesMasterPage /> },
  { path: ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(), element: <RoleDetailPage /> },
  { path: ROUTES.FOUNDATION.ACCESS.USERS, element: <UsersAssignmentsPage /> },
  {
    path: ROUTES.FOUNDATION.ACCESS.USER_DETAIL(),
    element: <UserAssignmentDetailPage mode="detail" />,
  },
  {
    path: ROUTES.FOUNDATION.ACCESS.USER_EDIT(),
    element: <UserAssignmentDetailPage mode="edit" />,
  },
];
