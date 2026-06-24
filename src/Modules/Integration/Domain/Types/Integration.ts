import type {
  INTEGRATION_FAILURE_CATEGORIES,
  OUTBOX_MESSAGE_STATUSES,
} from '@modules/Integration/Domain/Constants/IntegrationConstants';

export type OutboxMessageStatus = (typeof OUTBOX_MESSAGE_STATUSES)[number];
export type IntegrationFailureCategory = (typeof INTEGRATION_FAILURE_CATEGORIES)[number];
export type DeadLetterActionType = 'Retry' | 'ManualFix' | 'Acknowledge' | 'Ignore';

export interface OutboxMessage {
  id: string;
  sourceMessageId: string | null;
  messageId: string;
  eventType: string;
  version: string;
  businessReference: string;
  sourceSystem: string;
  targetSystem: string;
  warehouseContext: string;
  ownerContext: string | null;
  eventTime: string;
  correlationId: string | null;
  causationId: string | null;
  payload: Record<string, unknown>;
  status: OutboxMessageStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  failureCategory: IntegrationFailureCategory | null;
  deadLetterReason: string | null;
  deadLetteredAt: string | null;
  resolutionAction: DeadLetterActionType | null;
  actionIdempotencyKey: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  isDuplicate: boolean;
}
