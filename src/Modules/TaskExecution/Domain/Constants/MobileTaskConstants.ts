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
] as const;
export const MOBILE_SCAN_RESULTS = ['Accepted', 'Rejected', 'ManualOverrideAccepted'] as const;
