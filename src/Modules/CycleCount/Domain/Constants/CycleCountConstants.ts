export const CYCLE_COUNT_DEFAULT_PAGE_SIZE = 50;
export const CYCLE_COUNT_MAX_PAGE_SIZE = 100;

export const CYCLE_COUNT_WORK_STATUSES = [
  'CountingLocked',
  'Submitted',
  'PendingReview',
  'RecountRequired',
  'Accepted',
  'AdjustmentPosted',
  'Unlocked',
  'Cancelled',
] as const;
