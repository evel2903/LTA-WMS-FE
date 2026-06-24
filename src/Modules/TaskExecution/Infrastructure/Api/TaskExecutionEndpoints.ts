export const TASK_EXECUTION_ENDPOINTS = {
  TASKS: '/mobile/tasks',
  TASK_BY_ID: (id: string) => `/mobile/tasks/${encodeURIComponent(id)}`,
  CLAIM: (id: string) => `/mobile/tasks/${encodeURIComponent(id)}/claim`,
  RELEASE: (id: string) => `/mobile/tasks/${encodeURIComponent(id)}/release`,
  SCANS: (id: string) => `/mobile/tasks/${encodeURIComponent(id)}/scans`,
  CONFIRM_PICK_TASK: (mobileTaskId: string) =>
    `/mobile/tasks/${encodeURIComponent(mobileTaskId)}/confirm`,
} as const;
