import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';

const TaskExecutionPage = lazy(() =>
  import('@modules/TaskExecution/Presentation/Pages/TaskExecutionPage').then((module) => ({
    default: module.TaskExecutionPage,
  })),
);
const TaskExecutionDetailPage = lazy(() =>
  import('@modules/TaskExecution/Presentation/Pages/TaskExecutionDetailPage').then((module) => ({
    default: module.TaskExecutionDetailPage,
  })),
);

export const taskExecutionRoutes: RouteObject[] = [
  { path: ROUTES.MOBILE.TASKS, element: <TaskExecutionPage /> },
  { path: ROUTES.MOBILE.TASK_DETAIL(), element: <TaskExecutionDetailPage /> },
  { path: ROUTES.MOBILE.TASK_ACTION(), element: <TaskExecutionDetailPage /> },
];
