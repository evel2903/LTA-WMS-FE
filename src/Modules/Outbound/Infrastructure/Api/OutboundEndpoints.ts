export const OUTBOUND_ENDPOINTS = {
  ORDERS: '/outbound-orders',
  ORDER_BY_ID: (id: string) => `/outbound-orders/${id}`,
  VALIDATE: (id: string) => `/outbound-orders/${id}/validate`,
  HOLD: (id: string) => `/outbound-orders/${id}/hold`,
  REJECT: (id: string) => `/outbound-orders/${id}/reject`,
  CANCEL: (id: string) => `/outbound-orders/${id}/cancel`,
} as const;
