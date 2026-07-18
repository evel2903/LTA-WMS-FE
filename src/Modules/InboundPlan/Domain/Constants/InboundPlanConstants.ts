export const INBOUND_DEFAULT_PAGE_SIZE = 50;
export const INBOUND_MAX_PAGE_SIZE = 100;

export const INBOUND_DOCUMENT_STATUSES = [
  'Draft',
  'Planned',
  'Confirmed',
  'Receiving',
  'PartiallyReceived',
  'Received',
  'Closed',
  'Cancelled',
] as const;

export const INBOUND_GATE_IN_STATUSES = ['NotRecorded', 'Recorded', 'OverrideAccepted'] as const;
