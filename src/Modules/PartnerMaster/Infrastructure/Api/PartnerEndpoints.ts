export const PARTNER_ENDPOINTS = {
  PARTNERS: '/partners',
  PARTNER_BY_ID: (id: string) => `/partners/${id}`,
  RESOLVE: '/partners/resolve',
  DEACTIVATE: (id: string) => `/partners/${id}/deactivate`,
} as const;
