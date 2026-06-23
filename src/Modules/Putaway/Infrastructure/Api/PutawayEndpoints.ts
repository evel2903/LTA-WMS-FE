export const PUTAWAY_ENDPOINTS = {
  TASKS: '/putaway/tasks',
  TASK_BY_ID: (id: string) => `/putaway/tasks/${encodeURIComponent(id)}`,
  RELEASE: '/putaway/tasks/release',
} as const;
