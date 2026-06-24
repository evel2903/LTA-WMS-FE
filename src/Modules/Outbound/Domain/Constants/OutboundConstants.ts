export const OUTBOUND_DEFAULT_PAGE_SIZE = 50;
export const OUTBOUND_MAX_PAGE_SIZE = 100;

export const OUTBOUND_ORDER_STATUSES = [
  'Imported',
  'Validated',
  'Held',
  'Rejected',
  'Cancelled',
] as const;

export const OUTBOUND_ALLOCATION_POLICIES = ['FullOnly', 'PartialBackorder'] as const;

export const OUTBOUND_ALLOCATION_STATUSES = [
  'Allocated',
  'PartiallyAllocated',
  'Backordered',
  'Failed',
] as const;

export const OUTBOUND_PICK_RELEASE_MODES = ['Discrete', 'Batch'] as const;

export const OUTBOUND_PICK_RELEASE_STATUSES = ['Released', 'Blocked', 'Cancelled'] as const;

export const OUTBOUND_PICK_TASK_STATUSES = ['Released', 'Cancelled', 'Completed'] as const;
