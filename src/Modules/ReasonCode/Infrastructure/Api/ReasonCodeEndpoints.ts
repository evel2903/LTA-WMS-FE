/** Root-path endpoint constants for the reason-code catalog (no /api/v1 prefix). */
export const REASON_CODE_ENDPOINTS = {
  REASON_CODES: '/reason-codes',
  REASON_CODE_BY_ID: (id: string) => `/reason-codes/${id}`,
} as const;
