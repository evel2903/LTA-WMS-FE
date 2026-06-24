export const SHIPPING_ENDPOINTS = {
  STAGING_PACKAGES: '/shipping/staging/packages',
  STAGING_PACKAGE_BY_ID: (id: string) => `/shipping/staging/packages/${id}`,
  ASSIGN_DOCK: (id: string) => `/shipping/staging/packages/${id}/dock`,
  ASSIGN_TRUCK: (id: string) => `/shipping/staging/packages/${id}/truck`,
} as const;

