import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const TaskExecutionPage = lazy(() =>
  import('@modules/TaskExecution/Presentation/Pages/TaskExecutionPage').then((module) => ({
    default: module.TaskExecutionPage,
  })),
);

export const taskExecutionRoutes: RouteObject[] = [
  { path: ROUTES.MOBILE.TASKS, element: <TaskExecutionPage /> },
];
