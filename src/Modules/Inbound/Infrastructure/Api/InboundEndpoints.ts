export const INBOUND_ENDPOINTS = {
  PLANS: '/inbound-plans',
  PLAN_BY_ID: (id: string) => `/inbound-plans/${id}`,
  GATE_IN: (id: string) => `/inbound-plans/${id}/gate-in`,
  RECEIVING_READINESS: (id: string) => `/inbound-plans/${id}/receiving-readiness`,
} as const;
