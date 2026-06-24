export const INTEGRATION_DEFAULT_PAGE_SIZE = 50;
export const INTEGRATION_MAX_PAGE_SIZE = 100;

export const OUTBOX_MESSAGE_STATUSES = [
  'Pending',
  'Retrying',
  'Dispatched',
  'Failed',
  'DeadLetter',
  'ManualFixed',
  'Acknowledged',
  'Ignored',
] as const;

export const DEAD_LETTER_READABLE_STATUSES = ['DeadLetter', 'ManualFixed', 'Acknowledged', 'Ignored'] as const;

export const DEAD_LETTER_ACTIONABLE_STATUSES = ['DeadLetter'] as const;

export const INTEGRATION_FAILURE_CATEGORIES = [
  'Transient',
  'Validation',
  'Permanent',
  'DuplicateConflict',
  'RetryExhausted',
] as const;
