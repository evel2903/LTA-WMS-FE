/** Root-path endpoint constants for the approval queue (no /api/v1 prefix). */
export const APPROVAL_ENDPOINTS = {
  APPROVAL_REQUESTS: '/approval-requests',
  APPROVAL_REQUEST_BY_ID: (id: string) => `/approval-requests/${id}`,
  APPROVE: (id: string) => `/approval-requests/${id}/approve`,
  REJECT: (id: string) => `/approval-requests/${id}/reject`,
} as const;
