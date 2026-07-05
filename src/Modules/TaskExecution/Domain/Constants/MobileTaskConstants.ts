export const MOBILE_TASK_DEFAULT_PAGE_SIZE = 50;
export const MOBILE_TASK_MAX_PAGE_SIZE = 100;

export const MOBILE_TASK_TYPES = ['Receive', 'Qc', 'Putaway', 'Pick', 'Pack', 'Load'] as const;
export const MOBILE_TASK_STATUSES = [
  'Released',
  'Claimed',
  'InProgress',
  'Blocked',
  'Completed',
  'Cancelled',
] as const;

export const MOBILE_SCAN_TYPES = [
  'Document',
  'Location',
  'Item',
  'Quantity',
  'Lpn',
  'Package',
  'Load',
  'ManualEntry',
  'Lot',
  'Serial',
  'ExpiryDate',
] as const;

// Subset of MOBILE_SCAN_TYPES that get their own dedicated input on
// TaskExecutionDetailPage instead of the generic scan-type dropdown (IDC-06).
export const DEDICATED_IDENTITY_SCAN_TYPES = ['Lot', 'Serial', 'ExpiryDate'] as const;
export const MOBILE_SCAN_RESULTS = ['Accepted', 'Rejected', 'ManualOverrideAccepted'] as const;
