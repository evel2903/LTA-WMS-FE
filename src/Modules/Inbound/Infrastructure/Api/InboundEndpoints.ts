export const INBOUND_ENDPOINTS = {
  PLANS: '/inbound-plans',
  PLAN_BY_ID: (id: string) => `/inbound-plans/${id}`,
  GATE_IN: (id: string) => `/inbound-plans/${id}/gate-in`,
  RECEIVING_READINESS: (id: string) => `/inbound-plans/${id}/receiving-readiness`,
  RECEIVING_SESSIONS: (id: string) => `/inbound-plans/${id}/receiving-sessions`,
  RECEIPT_LINES: (receiptId: string) => `/receipts/${receiptId}/lines`,
} as const;
