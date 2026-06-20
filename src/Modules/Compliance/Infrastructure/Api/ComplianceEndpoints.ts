/** Root-path endpoint constants for Audit Log + Exception Case (no /api/v1 prefix). */
export const COMPLIANCE_ENDPOINTS = {
  AUDIT_LOGS: '/audit-logs',
  AUDIT_LOG_BY_ID: (id: string) => `/audit-logs/${id}`,
  EXCEPTIONS: '/exceptions',
  EXCEPTION_BY_ID: (id: string) => `/exceptions/${id}`,
  EXCEPTION_LOG: (id: string) => `/exceptions/${id}/log`,
  EXCEPTION_ASSIGN: (id: string) => `/exceptions/${id}/assign`,
  EXCEPTION_SUBMIT: (id: string) => `/exceptions/${id}/submit`,
  EXCEPTION_RESOLVE: (id: string) => `/exceptions/${id}/resolve`,
  EXCEPTION_CLOSE: (id: string) => `/exceptions/${id}/close`,
} as const;
