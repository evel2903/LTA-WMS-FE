import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { CycleCountRepository } from '@modules/CycleCount/Infrastructure/Repositories/CycleCountRepository';
import type {
  CycleCountMutationResultDto,
  CycleCountWorkDto,
  PagedCycleCountWorkDto,
} from '@modules/CycleCount/Infrastructure/Dtos/CycleCountDtos';

const workDto: CycleCountWorkDto = {
  Id: 'work-1',
  CountCode: 'CC-001',
  WorkStatus: 'CountingLocked',
  SourceBalanceId: 'balance-source',
  LockedBalanceId: 'balance-locked',
  OriginalInventoryStatusCode: 'AVAILABLE',
  WarehouseId: 'warehouse-1',
  WarehouseCode: null,
  OwnerId: 'owner-1',
  OwnerCode: null,
  SkuId: 'sku-1',
  SkuCode: null,
  LocationId: 'loc-1',
  LocationCode: 'A-01',
  UomId: 'uom-1',
  UomCode: 'EA',
  LpnCode: null,
  ExpectedQuantity: 4,
  CountedQuantity: null,
  VarianceQuantity: null,
  ToleranceQuantity: 1,
  ApprovalRequestId: null,
  LockTransactionId: null,
  AdjustmentTransactionId: null,
  UnlockTransactionId: null,
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  CreatedAt: '2026-06-23T06:00:00.000Z',
  UpdatedAt: '2026-06-23T06:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const mutationDto: CycleCountMutationResultDto = {
  CycleCountWork: workDto,
  InventoryControl: null,
  IsDuplicate: false,
};

function httpMock(response: PagedCycleCountWorkDto | CycleCountMutationResultDto) {
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

describe('CycleCountRepository', () => {
  it('lists cycle count works with PageSize clamped to 100', async () => {
    const http = httpMock({ Items: [workDto], Page: 1, PageSize: 100, TotalItems: 1, TotalPages: 1 });
    const repo = new CycleCountRepository(http.client);

    const result = await repo.list({ pageSize: 250, warehouseId: 'warehouse-1', workStatus: 'CountingLocked' });

    expect(result.items[0].id).toBe('work-1');
    expect(http.get).toHaveBeenCalledWith('/cycle-count/works', {
      params: {
        Page: 1,
        PageSize: 100,
        WarehouseId: 'warehouse-1',
        WorkStatus: 'CountingLocked',
      },
    });
  });

  it('creates, submits and unlocks via backend contract endpoints', async () => {
    const http = httpMock(mutationDto);
    const repo = new CycleCountRepository(http.client);

    await repo.create({
      sourceBalanceId: 'balance-source',
      quantity: 4,
      reasonCode: 'RC-V1-HOLD-RELEASE',
      idempotencyKey: 'cc-lock-1',
    });
    await repo.submit('work-1', {
      countedQuantity: 4,
      reasonCode: 'RC-V1-HOLD-RELEASE',
      idempotencyKey: 'cc-submit-1',
    });
    await repo.unlock('work-1', {
      reasonCode: 'RC-V1-HOLD-RELEASE',
      idempotencyKey: 'cc-unlock-1',
    });

    expect(http.post).toHaveBeenNthCalledWith(1, '/cycle-count/works', {
      SourceBalanceId: 'balance-source',
      Quantity: 4,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      IdempotencyKey: 'cc-lock-1',
    });
    expect(http.post).toHaveBeenNthCalledWith(2, '/cycle-count/works/work-1/submit', {
      CountedQuantity: 4,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      IdempotencyKey: 'cc-submit-1',
    });
    expect(http.post).toHaveBeenNthCalledWith(3, '/cycle-count/works/work-1/unlock', {
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      IdempotencyKey: 'cc-unlock-1',
    });
  });
});
