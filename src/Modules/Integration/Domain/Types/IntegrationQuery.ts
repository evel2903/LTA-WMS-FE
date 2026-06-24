import type { IntegrationFailureCategory, OutboxMessageStatus } from '@modules/Integration/Domain/Types/Integration';

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
