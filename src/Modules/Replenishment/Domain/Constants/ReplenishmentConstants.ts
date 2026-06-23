export const REPLENISHMENT_DEFAULT_PAGE_SIZE = 50;
export const REPLENISHMENT_MAX_PAGE_SIZE = 100;

export const REPLENISHMENT_TASK_STATUSES = [
  'Released',
  'Confirmed',
  'Cancelled',
] as const;

export const REPLENISHMENT_TRIGGER_TYPES = ['MinMax', 'Demand', 'EmergencyShortPick'] as const;

export const INVENTORY_RECONCILIATION_RETRY_STATUSES = [
  'PendingRetry',
  'Retrying',
  'DeadLetter',
] as const;
