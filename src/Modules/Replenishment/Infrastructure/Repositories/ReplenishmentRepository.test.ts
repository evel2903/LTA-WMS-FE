import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { ReplenishmentRepository } from '@modules/Replenishment/Infrastructure/Repositories/ReplenishmentRepository';
import type {
  InventoryReconciliationFailureResultDto,
  PagedReplenishmentTaskDto,
  ReplenishmentMutationResultDto,
  ReplenishmentTaskDto,
} from '@modules/Replenishment/Infrastructure/Dtos/ReplenishmentDtos';

const taskDto: ReplenishmentTaskDto = {
  Id: 'task-1',
  TaskCode: 'RPL-001',
  TaskStatus: 'Released',
  TriggerType: 'MinMax',
  SourceBalanceId: 'balance-source',
  SourceDimensionId: 'dimension-source',
  SourceLocationId: 'reserve-1',
  SourceLocationCode: 'RSV-01',
  SourceInventoryStatusCode: 'AVAILABLE',
  TargetLocationId: 'pick-face-1',
  TargetLocationCode: 'PF-01',
  TargetLocationProfileId: 'profile-pick',
  WarehouseId: 'warehouse-1',
  WarehouseCode: null,
  OwnerId: 'owner-1',
  OwnerCode: null,
  SkuId: 'sku-1',
  SkuCode: null,
  UomId: 'uom-1',
  UomCode: 'EA',
  Quantity: 12,
  ShortPickReference: null,
  Priority: null,
  WorkPoolCode: null,
  AssignedUserId: null,
  EligibilityDecisionJson: null,
  OutboxMessageId: 'outbox-release',
  ConfirmTransactionId: null,
  ConfirmMovementId: null,
  ConfirmOutboxMessageId: null,
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  ReleasedAt: '2026-06-23T07:00:00.000Z',
  ConfirmedAt: null,
  CancelledAt: null,
  CreatedAt: '2026-06-23T07:00:00.000Z',
  UpdatedAt: '2026-06-23T07:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const mutationDto: ReplenishmentMutationResultDto = {
  ReplenishmentTask: taskDto,
  InventoryControl: null,
  OutboxMessageId: 'outbox-release',
  EventType: 'ReplenishmentTaskReleased',
  IsDuplicate: false,
};

function httpMock(response: PagedReplenishmentTaskDto | ReplenishmentMutationResultDto | InventoryReconciliationFailureResultDto) {
  const get = vi.fn(() => Promise.resolve(response));
  const post = vi.fn(() => Promise.resolve(response));
  return {
    client: {
      get,
      post,
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient,
    get,
    post,
  };
}

describe('ReplenishmentRepository', () => {
  it('lists replenishment tasks with PageSize clamped to 100', async () => {
    const http = httpMock({ Items: [taskDto], Page: 1, PageSize: 100, TotalItems: 1, TotalPages: 1 });
    const repo = new ReplenishmentRepository(http.client);

    const result = await repo.list({ pageSize: 250, warehouseId: 'warehouse-1', taskStatus: 'Released' });

    expect(result.items[0].id).toBe('task-1');
    expect(http.get).toHaveBeenCalledWith('/replenishment/tasks', {
      params: {
        Page: 1,
        PageSize: 100,
        WarehouseId: 'warehouse-1',
        TaskStatus: 'Released',
      },
    });
  });

  it('calls release, confirm and cancel endpoints using backend contract', async () => {
    const http = httpMock(mutationDto);
    const repo = new ReplenishmentRepository(http.client);

    await repo.release({
      triggerType: 'MinMax',
      sourceBalanceId: 'balance-source',
      targetLocationId: 'pick-face-1',
      quantity: 12,
      reasonCode: 'RC-V1-REPLENISHMENT',
      idempotencyKey: 'repl-release-1',
    });
    await repo.confirm('task-1', {
      reasonCode: 'RC-V1-ADJUSTMENT',
      evidenceRefs: ['RF-1'],
      idempotencyKey: 'repl-confirm-1',
    });
    await repo.cancel('task-1', {
      reasonCode: 'RC-V1-REPLENISHMENT',
      idempotencyKey: 'repl-cancel-1',
    });

    expect(http.post).toHaveBeenNthCalledWith(1, '/replenishment/tasks/release', {
      TriggerType: 'MinMax',
      SourceBalanceId: 'balance-source',
      TargetLocationId: 'pick-face-1',
      Quantity: 12,
      ReasonCode: 'RC-V1-REPLENISHMENT',
      IdempotencyKey: 'repl-release-1',
    });
    expect(http.post).toHaveBeenNthCalledWith(2, '/replenishment/tasks/task-1/confirm', {
      ReasonCode: 'RC-V1-ADJUSTMENT',
      EvidenceRefs: ['RF-1'],
      IdempotencyKey: 'repl-confirm-1',
    });
    expect(http.post).toHaveBeenNthCalledWith(3, '/replenishment/tasks/task-1/cancel', {
      ReasonCode: 'RC-V1-REPLENISHMENT',
      IdempotencyKey: 'repl-cancel-1',
    });
  });

  it('records reconciliation failure through the hook endpoint', async () => {
    const http = httpMock({
      BusinessReference: 'ITX-001',
      EventType: 'InventoryReconciliationFailed',
      ErrorMessage: 'ERP mismatch',
      RetryStatus: 'PendingRetry',
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
      OutboxMessageId: 'outbox-recon',
      ExceptionCaseId: 'exception-1',
      IsDuplicate: false,
    });
    const repo = new ReplenishmentRepository(http.client);

    await repo.recordReconciliationFailure({
      businessReference: 'ITX-001',
      eventType: 'InventoryReconciliationFailed',
      warehouseId: 'warehouse-1',
      ownerId: 'owner-1',
      errorMessage: 'ERP mismatch',
      retryStatus: 'PendingRetry',
      reasonCode: 'RC-V1-DEAD-LETTER-FIX',
      evidenceRefs: ['SYNC-1'],
      idempotencyKey: 'recon-fail-1',
      payload: { ExpectedQty: 12, ActualQty: 10 },
    });

    expect(http.post).toHaveBeenCalledWith('/replenishment/reconciliation-failures', {
      BusinessReference: 'ITX-001',
      EventType: 'InventoryReconciliationFailed',
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
      ErrorMessage: 'ERP mismatch',
      RetryStatus: 'PendingRetry',
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['SYNC-1'],
      IdempotencyKey: 'recon-fail-1',
      Payload: { ExpectedQty: 12, ActualQty: 10 },
    });
  });
});
