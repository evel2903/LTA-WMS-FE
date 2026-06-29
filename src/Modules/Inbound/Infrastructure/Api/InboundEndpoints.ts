export const INBOUND_ENDPOINTS = {
  PLANS: '/inbound-plans',
  LINE_IMPORT_TEMPLATE: '/inbound-plans/line-import-template',
  LINE_IMPORT: '/inbound-plans/import',
  PLAN_BY_ID: (id: string) => `/inbound-plans/${id}`,
  PLAN_OPERATIONAL_STATE: (id: string) => `/inbound-plans/${id}/operational-state`,
  GATE_IN: (id: string) => `/inbound-plans/${id}/gate-in`,
  RECEIVING_READINESS: (id: string) => `/inbound-plans/${id}/receiving-readiness`,
  RECEIVING_SESSIONS: (id: string) => `/inbound-plans/${id}/receiving-sessions`,
  RECEIPT_LINES: (receiptId: string) => `/receipts/${receiptId}/lines`,
  RECEIPT_LINE_LPN: (receiptId: string, receiptLineId: string) =>
    `/receipts/${receiptId}/lines/${receiptLineId}/lpn`,
  RECEIPT_LINE_RELEASE_TO_PUTAWAY: (receiptId: string, receiptLineId: string) =>
    `/receipts/${receiptId}/lines/${receiptLineId}/release-to-putaway`,
  RECEIPT_DISCREPANCIES: (receiptId: string) => `/receipts/${receiptId}/discrepancies`,
  RECEIPT_QC_TASKS: (receiptId: string) => `/receipts/${receiptId}/qc-tasks`,
  QC_TASK_RESULTS: (qcTaskId: string) => `/qc-tasks/${qcTaskId}/results`,
} as const;
