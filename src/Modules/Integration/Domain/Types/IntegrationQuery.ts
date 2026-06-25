import type {
  IntegrationFailureCategory,
  OutboxMessageStatus,
  ReconciliationItemStatus,
  ReconciliationRunStatus,
  ReconciliationSeverity,
} from '@modules/Integration/Domain/Types/Integration';

export interface IntegrationListFilter {
  page?: number;
  pageSize?: number;
  sourceSystem?: string;
  status?: OutboxMessageStatus;
  eventType?: string;
  businessReference?: string;
  warehouseContext?: string;
  ownerContext?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

export interface DeadLetterActionInput {
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs: string[];
  idempotencyKey?: string;
  manualFixPayload?: Record<string, unknown> | null;
}

export interface RecordOutboxFailureInput {
  id: string;
  failureCategory: IntegrationFailureCategory;
  errorMessage: string;
}

export interface ReconciliationRunFilter {
  page?: number;
  pageSize?: number;
  businessReference?: string;
  warehouseId?: string;
  ownerId?: string;
  runStatus?: ReconciliationRunStatus;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

export interface ReconciliationItemFilter {
  page?: number;
  pageSize?: number;
  businessReference?: string;
  warehouseId?: string;
  ownerId?: string;
  itemStatus?: ReconciliationItemStatus;
  severity?: ReconciliationSeverity;
  mismatchType?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

export interface CreateReconciliationRunInput {
  businessReference: string;
  warehouseId: string;
  ownerId?: string;
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs: string[];
  idempotencyKey: string;
}

export interface ResolveReconciliationItemInput {
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs: string[];
  idempotencyKey: string;
  resolutionNote: string;
  approvalRequestId?: string;
  impactsInventory?: boolean;
  impactsFinance?: boolean;
}
