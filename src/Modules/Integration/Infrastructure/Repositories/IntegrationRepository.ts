import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import {
  INTEGRATION_DEFAULT_PAGE_SIZE,
  INTEGRATION_MAX_PAGE_SIZE,
} from '@modules/Integration/Domain/Constants/IntegrationConstants';
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
import { INTEGRATION_ENDPOINTS } from '@modules/Integration/Infrastructure/Api/IntegrationEndpoints';
import type {
  OutboxMessageDto,
  PagedOutboxMessageDto,
  PagedReconciliationItemDto,
  PagedReconciliationRunDto,
  ReconciliationItemDto,
  ReconciliationRunCreatedDto,
  ReconciliationRunDto,
} from '@modules/Integration/Infrastructure/Dtos/IntegrationDtos';
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

  async listReconciliationRuns(filter: ReconciliationRunFilter = {}): Promise<PaginatedResponse<ReconciliationRun>> {
    const dto = await this.http.get<PagedReconciliationRunDto>(INTEGRATION_ENDPOINTS.RECONCILIATION_RUNS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        BusinessReference: filter.businessReference,
        WarehouseId: filter.warehouseId,
        OwnerId: filter.ownerId,
        RunStatus: filter.runStatus,
        CreatedFrom: filter.createdFrom,
        CreatedTo: filter.createdTo,
        UpdatedFrom: filter.updatedFrom,
        UpdatedTo: filter.updatedTo,
      }),
    });
    return IntegrationMapper.toReconciliationRunPage(dto);
  }

  async getReconciliationRun(id: string): Promise<ReconciliationRun> {
    const dto = await this.http.get<ReconciliationRunDto>(INTEGRATION_ENDPOINTS.RECONCILIATION_RUN_BY_ID(id));
    return IntegrationMapper.toReconciliationRun(dto);
  }

  async listReconciliationItems(
    runId: string,
    filter: ReconciliationItemFilter = {},
  ): Promise<PaginatedResponse<ReconciliationItem>> {
    const dto = await this.http.get<PagedReconciliationItemDto>(INTEGRATION_ENDPOINTS.RECONCILIATION_RUN_ITEMS(runId), {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        BusinessReference: filter.businessReference,
        WarehouseId: filter.warehouseId,
        OwnerId: filter.ownerId,
        ItemStatus: filter.itemStatus,
        Severity: filter.severity,
        MismatchType: filter.mismatchType,
        CreatedFrom: filter.createdFrom,
        CreatedTo: filter.createdTo,
        UpdatedFrom: filter.updatedFrom,
        UpdatedTo: filter.updatedTo,
      }),
    });
    return IntegrationMapper.toReconciliationItemPage(dto);
  }

  async createReconciliationRun(
    input: CreateReconciliationRunInput,
  ): Promise<{ run: ReconciliationRun; items: ReconciliationItem[] }> {
    const dto = await this.http.post<ReconciliationRunCreatedDto>(
      INTEGRATION_ENDPOINTS.RECONCILIATION_RUNS,
      IntegrationMapper.toCreateReconciliationRunRequest(input),
    );
    return IntegrationMapper.toReconciliationRunCreated(dto);
  }

  async resolveReconciliationItem(
    id: string,
    input: ResolveReconciliationItemInput,
  ): Promise<ReconciliationItem> {
    const dto = await this.http.post<ReconciliationItemDto>(
      INTEGRATION_ENDPOINTS.RECONCILIATION_ITEM_RESOLVE(id),
      IntegrationMapper.toResolveReconciliationItemRequest(input),
    );
    return IntegrationMapper.toReconciliationItem(dto);
  }

  private async postAction(url: string, input: DeadLetterActionInput): Promise<OutboxMessage> {
    const dto = await this.http.post<OutboxMessageDto>(url, IntegrationMapper.toDeadLetterActionRequest(input));
    return IntegrationMapper.toOutboxMessage(dto);
  }
}
