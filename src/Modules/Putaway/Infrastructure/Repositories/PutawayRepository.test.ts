import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { PutawayRepository } from '@modules/Putaway/Infrastructure/Repositories/PutawayRepository';
import type { PagedPutawayTaskDto, PutawayTaskDto } from '@modules/Putaway/Infrastructure/Dtos/PutawayDtos';

const taskDto: PutawayTaskDto = {
  Id: 'putaway-1',
  TaskCode: 'PUT-001',
  TaskStatus: 'Released',
  InboundPutawayReleaseId: 'release-1',
  ReceiptId: 'receipt-1',
  ReceiptLineId: 'receipt-line-1',
  InboundPlanId: 'plan-1',
  InboundPlanLineId: 'plan-line-1',
  InboundLpnId: null,
  OwnerId: 'owner-1',
  OwnerCode: null,
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WH-A',
  SkuId: 'sku-1',
  SkuCode: 'SKU-A',
  UomId: 'uom-1',
  UomCode: 'EA',
  Quantity: 5,
  LpnCode: 'LPN-001',
  SsccCode: null,
  InventoryStatusCode: 'READY_FOR_PUTAWAY',
  SourceLocationId: null,
  SourceLocationCode: 'RCV-STG-01',
  TargetLocationId: 'loc-1',
  TargetLocationCode: 'A-01',
  TargetLocationProfileId: 'profile-1',
  Priority: 50,
  WorkPoolCode: null,
  AssignedUserId: null,
  ConstraintJson: null,
  EligibilityDecisionJson: null,
  OutboxMessageId: 'outbox-1',
  MobileTaskId: 'mobile-1',
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  IdempotencyKey: 'putaway-key-1',
  ReleasedAt: '2026-06-23T03:00:00.000Z',
  ReleasedBy: 'operator-1',
  IsDuplicate: false,
  CreatedAt: '2026-06-23T03:00:00.000Z',
  UpdatedAt: '2026-06-23T03:00:00.000Z',
};

function httpMock(response: PutawayTaskDto | PagedPutawayTaskDto): {
  client: HttpClient;
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
} {
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

describe('PutawayRepository', () => {
  it('lists putaway tasks with PageSize clamped to 100', async () => {
    const http = httpMock({
      Items: [taskDto],
      Meta: { Page: 1, PageSize: 100, TotalItems: 1, TotalPages: 1 },
    });
    const repo = new PutawayRepository(http.client);

    const result = await repo.list({ pageSize: 250, warehouseId: 'warehouse-1', taskStatus: 'Released' });

    expect(result.items[0].id).toBe('putaway-1');
    expect(http.get).toHaveBeenCalledWith('/putaway/tasks', {
      params: {
        Page: 1,
        PageSize: 100,
        WarehouseId: 'warehouse-1',
        TaskStatus: 'Released',
      },
    });
  });

  it('releases a putaway task through Infrastructure repository', async () => {
    const http = httpMock(taskDto);
    const repo = new PutawayRepository(http.client);

    const result = await repo.release({
      inboundPutawayReleaseId: 'release-1',
      sourceLocationCode: 'RCV-STG-01',
      idempotencyKey: 'putaway-key-1',
    });

    expect(result.taskCode).toBe('PUT-001');
    expect(http.post).toHaveBeenCalledWith('/putaway/tasks/release', {
      InboundPutawayReleaseId: 'release-1',
      SourceLocationCode: 'RCV-STG-01',
      IdempotencyKey: 'putaway-key-1',
    });
  });
});
