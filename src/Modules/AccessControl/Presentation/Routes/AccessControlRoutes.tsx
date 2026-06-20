import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const RolePermissionMatrixPage = lazy(() =>
  import('@modules/AccessControl/Presentation/Pages/RolePermissionMatrixPage').then((module) => ({
    default: module.RolePermissionMatrixPage,
  })),
);

const UsersAssignmentsPage = lazy(() =>
  import('@modules/AccessControl/Presentation/Pages/UsersAssignmentsPage').then((module) => ({
    default: module.UsersAssignmentsPage,
  })),
);

export const accessControlRoutes: RouteObject[] = [
  { path: ROUTES.FOUNDATION.ACCESS.ROLES, element: <RolePermissionMatrixPage /> },
  { path: ROUTES.FOUNDATION.ACCESS.USERS, element: <UsersAssignmentsPage /> },
];
