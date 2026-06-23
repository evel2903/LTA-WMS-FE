export const PUTAWAY_ENDPOINTS = {
  TASKS: '/putaway/tasks',
  TASK_BY_ID: (id: string) => `/putaway/tasks/${encodeURIComponent(id)}`,
  CONFIRM_TASK: (id: string) => `/putaway/tasks/${encodeURIComponent(id)}/confirm`,
  RELEASE: '/putaway/tasks/release',
} as const;
