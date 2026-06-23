export const REPLENISHMENT_ENDPOINTS = {
  TASKS: '/replenishment/tasks',
  TASK_BY_ID: (id: string) => `/replenishment/tasks/${id}`,
  RELEASE: '/replenishment/tasks/release',
  CONFIRM: (id: string) => `/replenishment/tasks/${id}/confirm`,
  CANCEL: (id: string) => `/replenishment/tasks/${id}/cancel`,
  RECONCILIATION_FAILURES: '/replenishment/reconciliation-failures',
} as const;
