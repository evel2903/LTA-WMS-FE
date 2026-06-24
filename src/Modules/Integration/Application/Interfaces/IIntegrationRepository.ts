import type { PaginatedResponse } from '@shared/Types/Api';
import type { OutboxMessage } from '@modules/Integration/Domain/Types/Integration';
import type {
  DeadLetterActionInput,
  IntegrationListFilter,
  RecordOutboxFailureInput,
} from '@modules/Integration/Domain/Types/IntegrationQuery';

export interface IIntegrationRepository {
  listDeadLetters(filter?: IntegrationListFilter): Promise<PaginatedResponse<OutboxMessage>>;
  getDeadLetter(id: string): Promise<OutboxMessage>;
  retryDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage>;
  manualFixDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage>;
  acknowledgeDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage>;
  ignoreDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage>;
  recordFailure(input: RecordOutboxFailureInput): Promise<OutboxMessage>;
}
