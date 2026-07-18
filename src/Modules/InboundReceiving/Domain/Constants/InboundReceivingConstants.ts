export const RECEIVING_SESSION_STATUSES = ['Open', 'Closed'] as const;
export const RECEIPT_DOCUMENT_STATUSES = ['Open', 'PartiallyReceived', 'Received'] as const;
export const RECEIPT_LINE_STATUSES = ['Received', 'Discrepancy'] as const;
export const RECEIPT_LINE_DISCREPANCY_SIGNALS = [
  'QuantityVariance',
  'WrongSku',
  'WrongUom',
  'UnresolvedBarcode',
] as const;

export const INBOUND_DISCREPANCY_TYPES = [
  'QuantityVariance',
  'WrongSku',
  'WrongUom',
  'UnresolvedBarcode',
  'DamagedGoods',
  'MissingDocument',
] as const;

export const INBOUND_DISCREPANCY_STATUSES = ['Routed', 'PendingApproval', 'Blocked'] as const;

export const INBOUND_DISCREPANCY_TOLERANCE_DECISIONS = [
  'NotApplicable',
  'WithinTolerance',
  'OverTolerancePendingApproval',
  'OverToleranceHardBlocked',
] as const;

export const QC_TASK_STATUSES = [
  'NotRequired',
  'PendingQc',
  'InInspection',
  'Dispositioned',
  'Closed',
] as const;

export const QC_RESULT_STATUSES = ['Passed', 'ConditionalPassed', 'Failed', 'Hold'] as const;
export const QC_DISPOSITION_CODES = ['Release', 'Hold', 'Quarantine', 'Reject', 'Damage'] as const;
