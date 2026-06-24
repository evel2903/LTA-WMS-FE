export const PACKING_DEFAULT_PAGE_SIZE = 50;
export const PACKING_MAX_PAGE_SIZE = 100;

export const PACKAGE_STATUSES = ['PackingPending', 'Packed', 'ReadyForStaging', 'Blocked'] as const;
export const PACK_SESSION_STATUSES = [
  'Open',
  'CheckingPassed',
  'CheckException',
  'Cancelled',
] as const;
export const PACKAGE_CHECK_RESULTS = ['Pending', 'Passed', 'Mismatch'] as const;

export const DEFAULT_PACKING_REASON_CODE = 'RC-V1-DISCREPANCY';
export const DEFAULT_PACKAGE_CARTON_TYPE = 'CARTON-STD';
