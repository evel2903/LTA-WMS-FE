export const OUTBOUND_ENDPOINTS = {
  ORDERS: '/outbound-orders',
  ORDER_BY_ID: (id: string) => `/outbound-orders/${id}`,
  VALIDATE: (id: string) => `/outbound-orders/${id}/validate`,
  HOLD: (id: string) => `/outbound-orders/${id}/hold`,
  REJECT: (id: string) => `/outbound-orders/${id}/reject`,
  CANCEL: (id: string) => `/outbound-orders/${id}/cancel`,
  ALLOCATE: (id: string) => `/outbound-orders/${id}/allocate`,
  RELEASE: (id: string) => `/outbound-orders/${id}/release`,
  ALLOCATIONS: (id: string) => `/outbound-orders/${id}/allocations`,
  ALLOCATION_BY_ID: (id: string) => `/outbound-orders/allocations/${id}`,
  RELEASES: (id: string) => `/outbound-orders/${id}/releases`,
  RELEASE_BY_ID: (id: string) => `/outbound-orders/releases/${id}`,
} as const;
