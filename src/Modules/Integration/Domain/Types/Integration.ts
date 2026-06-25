import type {
  INTEGRATION_FAILURE_CATEGORIES,
  OUTBOX_MESSAGE_STATUSES,
  RECONCILIATION_ITEM_STATUSES,
  RECONCILIATION_RUN_STATUSES,
  RECONCILIATION_SEVERITIES,
} from '@modules/Integration/Domain/Constants/IntegrationConstants';

export type OutboxMessageStatus = (typeof OUTBOX_MESSAGE_STATUSES)[number];
export type IntegrationFailureCategory = (typeof INTEGRATION_FAILURE_CATEGORIES)[number];
export type DeadLetterActionType = 'Retry' | 'ManualFix' | 'Acknowledge' | 'Ignore';
export type ReconciliationRunStatus = (typeof RECONCILIATION_RUN_STATUSES)[number];
export type ReconciliationItemStatus = (typeof RECONCILIATION_ITEM_STATUSES)[number];
export type ReconciliationSeverity = (typeof RECONCILIATION_SEVERITIES)[number];

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

export interface ReconciliationRun {
  id: string;
  businessReference: string;
  warehouseId: string;
  ownerId: string | null;
  runStatus: ReconciliationRunStatus;
  sourceCounts: Record<string, number>;
  itemCount: number;
  mismatchCount: number;
  exceptionCount: number;
  idempotencyKey: string;
  reasonCode: string;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  isDuplicate: boolean;
}

export interface ReconciliationItem {
  id: string;
  runId: string;
  itemStatus: ReconciliationItemStatus;
  severity: ReconciliationSeverity;
  mismatchType: string;
  sourceType: string;
  sourceId: string | null;
  expectedSummary: Record<string, unknown> | null;
  actualSummary: Record<string, unknown> | null;
  exceptionCaseId: string | null;
  outboxMessageId: string | null;
  deadLetterMessageId: string | null;
  resolutionNote: string | null;
  approvalRequestId: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isDuplicate: boolean;
}
