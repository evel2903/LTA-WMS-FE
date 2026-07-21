export const INBOUND_RECEIVING_ENDPOINTS = {
  RECEIPTS: '/receipts',
  RECEIPT_BY_ID: (receiptId: string) => `/receipts/${receiptId}`,
  RECEIPT_OPERATIONAL_STATE: (receiptId: string) => `/receipts/${receiptId}/operational-state`,
  PLAN_OPERATIONAL_STATE: (planId: string) => `/inbound-plans/${planId}/operational-state`,
  RECEIVING_READINESS: (planId: string) => `/inbound-plans/${planId}/receiving-readiness`,
  RECEIVING_SESSIONS: (planId: string) => `/inbound-plans/${planId}/receiving-sessions`,
  RECEIPT_LINES: (receiptId: string) => `/receipts/${receiptId}/lines`,
  RECEIPT_LINE_LPN: (receiptId: string, receiptLineId: string) =>
    `/receipts/${receiptId}/lines/${receiptLineId}/lpn`,
  RECEIPT_LINE_RELEASE_TO_PUTAWAY: (receiptId: string, receiptLineId: string) =>
    `/receipts/${receiptId}/lines/${receiptLineId}/release-to-putaway`,
  RECEIPT_DISCREPANCIES: (receiptId: string) => `/receipts/${receiptId}/discrepancies`,
  RECEIPT_QC_TASKS: (receiptId: string) => `/receipts/${receiptId}/qc-tasks`,
  QC_TASK_RESULTS: (qcTaskId: string) => `/qc-tasks/${qcTaskId}/results`,
} as const;
