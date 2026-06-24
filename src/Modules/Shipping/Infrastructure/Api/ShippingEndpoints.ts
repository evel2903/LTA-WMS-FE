export const SHIPPING_ENDPOINTS = {
  STAGING_PACKAGES: '/shipping/staging/packages',
  STAGING_PACKAGE_BY_ID: (id: string) => `/shipping/staging/packages/${id}`,
  ASSIGN_DOCK: (id: string) => `/shipping/staging/packages/${id}/dock`,
  ASSIGN_TRUCK: (id: string) => `/shipping/staging/packages/${id}/truck`,
  SCAN_LOADING: (id: string) => `/shipping/staging/packages/${id}/loading`,
  CONFIRM_SHIPMENT: (id: string) => `/shipping/staging/packages/${id}/confirm`,
  RECORD_GATE_OUT: (id: string) => `/shipping/staging/packages/${id}/gate-out`,
  EVALUATE_GOODS_ISSUE_TRIGGER: (id: string) =>
    `/shipping/staging/packages/${id}/goods-issue-trigger`,
} as const;
