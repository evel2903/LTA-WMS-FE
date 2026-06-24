export const PACKING_ENDPOINTS = {
  PACKAGES: '/packing/packages',
  PACKAGE_BY_ID: (id: string) => `/packing/packages/${id}`,
  START_SESSION: '/packing/sessions',
  RECORD_CHECK: (sessionId: string) => `/packing/sessions/${sessionId}/check`,
  CLOSE_PACKAGE: (id: string) => `/packing/packages/${id}/close`,
  READY_FOR_STAGING: (id: string) => `/packing/packages/${id}/ready-for-staging`,
} as const;
