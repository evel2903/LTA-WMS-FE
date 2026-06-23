export const CYCLE_COUNT_ENDPOINTS = {
  WORKS: '/cycle-count/works',
  WORK_BY_ID: (id: string) => `/cycle-count/works/${id}`,
  SUBMIT: (id: string) => `/cycle-count/works/${id}/submit`,
  RECOUNT: (id: string) => `/cycle-count/works/${id}/recount`,
  ADJUSTMENT: (id: string) => `/cycle-count/works/${id}/adjustment`,
  UNLOCK: (id: string) => `/cycle-count/works/${id}/unlock`,
} as const;
