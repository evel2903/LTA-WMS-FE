export const INTEGRATION_ENDPOINTS = {
  DEAD_LETTERS: '/integration/dead-letters',
  DEAD_LETTER_BY_ID: (id: string) => `/integration/dead-letters/${encodeURIComponent(id)}`,
  DEAD_LETTER_RETRY: (id: string) => `/integration/dead-letters/${encodeURIComponent(id)}/retry`,
  DEAD_LETTER_MANUAL_FIX: (id: string) => `/integration/dead-letters/${encodeURIComponent(id)}/manual-fix`,
  DEAD_LETTER_ACK: (id: string) => `/integration/dead-letters/${encodeURIComponent(id)}/ack`,
  DEAD_LETTER_IGNORE: (id: string) => `/integration/dead-letters/${encodeURIComponent(id)}/ignore`,
  OUTBOX_FAILURE: (id: string) => `/integration/events/${encodeURIComponent(id)}/failures`,
  RECONCILIATION_RUNS: '/integration/reconciliation/runs',
  RECONCILIATION_RUN_BY_ID: (id: string) => `/integration/reconciliation/runs/${encodeURIComponent(id)}`,
  RECONCILIATION_RUN_ITEMS: (id: string) => `/integration/reconciliation/runs/${encodeURIComponent(id)}/items`,
  RECONCILIATION_ITEM_RESOLVE: (id: string) =>
    `/integration/reconciliation/items/${encodeURIComponent(id)}/resolve`,
} as const;
