import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import {
  INTEGRATION_DEFAULT_PAGE_SIZE,
  INTEGRATION_MAX_PAGE_SIZE,
} from '@modules/Integration/Domain/Constants/IntegrationConstants';
import type { OutboxMessage } from '@modules/Integration/Domain/Types/Integration';
import type {
  DeadLetterActionInput,
  IntegrationListFilter,
  RecordOutboxFailureInput,
} from '@modules/Integration/Domain/Types/IntegrationQuery';
import { INTEGRATION_ENDPOINTS } from '@modules/Integration/Infrastructure/Api/IntegrationEndpoints';
import type { OutboxMessageDto, PagedOutboxMessageDto } from '@modules/Integration/Infrastructure/Dtos/IntegrationDtos';
import { IntegrationMapper } from '@modules/Integration/Infrastructure/Mappers/IntegrationMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return INTEGRATION_DEFAULT_PAGE_SIZE;
  return Math.min(value, INTEGRATION_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class IntegrationRepository implements IIntegrationRepository {
  constructor(private readonly http: HttpClient) {}

  async listDeadLetters(filter: IntegrationListFilter = {}): Promise<PaginatedResponse<OutboxMessage>> {
    const dto = await this.http.get<PagedOutboxMessageDto>(INTEGRATION_ENDPOINTS.DEAD_LETTERS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        SourceSystem: filter.sourceSystem,
        Status: filter.status,
        EventType: filter.eventType,
        BusinessReference: filter.businessReference,
        WarehouseContext: filter.warehouseContext,
        OwnerContext: filter.ownerContext,
        CreatedFrom: filter.createdFrom,
        CreatedTo: filter.createdTo,
        UpdatedFrom: filter.updatedFrom,
        UpdatedTo: filter.updatedTo,
      }),
    });
    return IntegrationMapper.toPaged(dto);
  }

  async getDeadLetter(id: string): Promise<OutboxMessage> {
    const dto = await this.http.get<OutboxMessageDto>(INTEGRATION_ENDPOINTS.DEAD_LETTER_BY_ID(id));
    return IntegrationMapper.toOutboxMessage(dto);
  }

  async retryDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage> {
    return this.postAction(INTEGRATION_ENDPOINTS.DEAD_LETTER_RETRY(id), input);
  }

  async manualFixDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage> {
    return this.postAction(INTEGRATION_ENDPOINTS.DEAD_LETTER_MANUAL_FIX(id), input);
  }

  async acknowledgeDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage> {
    return this.postAction(INTEGRATION_ENDPOINTS.DEAD_LETTER_ACK(id), input);
  }

  async ignoreDeadLetter(id: string, input: DeadLetterActionInput): Promise<OutboxMessage> {
    return this.postAction(INTEGRATION_ENDPOINTS.DEAD_LETTER_IGNORE(id), input);
  }

  async recordFailure(input: RecordOutboxFailureInput): Promise<OutboxMessage> {
    const dto = await this.http.post<OutboxMessageDto>(
      INTEGRATION_ENDPOINTS.OUTBOX_FAILURE(input.id),
      IntegrationMapper.toFailureRequest(input),
    );
    return IntegrationMapper.toOutboxMessage(dto);
  }

  private async postAction(url: string, input: DeadLetterActionInput): Promise<OutboxMessage> {
    const dto = await this.http.post<OutboxMessageDto>(url, IntegrationMapper.toDeadLetterActionRequest(input));
    return IntegrationMapper.toOutboxMessage(dto);
  }
}
