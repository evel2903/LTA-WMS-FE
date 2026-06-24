import { describe, expect, it } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { taskExecutionRoutes } from '@modules/TaskExecution/Presentation/Routes/TaskExecutionRoutes';

describe('taskExecutionRoutes', () => {
  it('registers list, detail, and action routes for mobile task execution', () => {
    expect(taskExecutionRoutes.map((route) => route.path)).toEqual([
      ROUTES.MOBILE.TASKS,
      ROUTES.MOBILE.TASK_DETAIL(),
      ROUTES.MOBILE.TASK_ACTION(),
    ]);
  });
});
