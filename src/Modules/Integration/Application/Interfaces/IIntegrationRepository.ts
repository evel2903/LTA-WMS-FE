import type { PaginatedResponse } from '@shared/Types/Api';
import type { OutboxMessage, ReconciliationItem, ReconciliationRun } from '@modules/Integration/Domain/Types/Integration';
import type {
  CreateReconciliationRunInput,
  DeadLetterActionInput,
  IntegrationListFilter,
  ReconciliationItemFilter,
  ReconciliationRunFilter,
  RecordOutboxFailureInput,
  ResolveReconciliationItemInput,
} from '@modules/Integration/Domain/Types/IntegrationQuery';

export interface IIntegrationRepository {
  listDeadLetters(filter?: IntegrationListFilter): Promise<PaginatedResponse<OutboxMessage>>;
  getDeadLetter(id: string): Promise<OutboxMessage>;
  retryDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage>;
  manualFixDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage>;
  acknowledgeDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage>;
  ignoreDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage>;
  recordFailure(input: RecordOutboxFailureInput): Promise<OutboxMessage>;
  listReconciliationRuns(filter?: ReconciliationRunFilter): Promise<PaginatedResponse<ReconciliationRun>>;
  getReconciliationRun(id: string): Promise<ReconciliationRun>;
  listReconciliationItems(
    runId: string,
    filter?: ReconciliationItemFilter,
  ): Promise<PaginatedResponse<ReconciliationItem>>;
  createReconciliationRun(
    input: CreateReconciliationRunInput,
  ): Promise<{ run: ReconciliationRun; items: ReconciliationItem[] }>;
  resolveReconciliationItem(id: string, input: ResolveReconciliationItemInput): Promise<ReconciliationItem>;
}
