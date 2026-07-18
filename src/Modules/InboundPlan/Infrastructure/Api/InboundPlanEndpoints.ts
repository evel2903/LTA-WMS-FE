export const INBOUND_PLAN_ENDPOINTS = {
  PLANS: '/inbound-plans',
  LINE_IMPORT_TEMPLATE: '/inbound-plans/line-import-template',
  LINE_IMPORT: '/inbound-plans/import',
  PLAN_BY_ID: (id: string) => `/inbound-plans/${id}`,
  PLAN_CONFIRM: (id: string) => `/inbound-plans/${id}/confirm`,
  PLAN_CANCEL: (id: string) => `/inbound-plans/${id}/cancel`,
  GATE_IN: (id: string) => `/inbound-plans/${id}/gate-in`,
} as const;
