import { describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';

vi.mock('@shared/Services/Http/ApiClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { InventoryRepository } from '@modules/Inventory/Infrastructure/Repositories/InventoryRepository';
import type { InventoryControlResultDto } from '@modules/Inventory/Infrastructure/Dtos/InventoryDtos';

const controlDto: InventoryControlResultDto = {
  InventoryTransaction: {
    Id: 'transaction-1',
    TransactionCode: 'ITX-001',
    TransactionType: 'InternalMove',
    TransactionStatus: 'Posted',
    PutawayTaskId: null,
    PutawayTaskCode: null,
    InventoryMovementId: 'movement-1',
    OwnerId: 'owner-1',
    OwnerCode: null,
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-A',
    SkuId: 'sku-1',
    SkuCode: null,
    UomId: null,
    UomCode: null,
    Quantity: 1,
    FromInventoryStatusCode: 'AVAILABLE',
    ToInventoryStatusCode: 'AVAILABLE',
    FromLocationId: 'loc-source',
    FromLocationCode: 'A-01',
    ToLocationId: 'loc-target',
    ToLocationCode: 'B-01',
    LpnCode: null,
    SsccCode: null,
    IdempotencyKey: 'move-key-1',
    OutboxMessageId: 'outbox-1',
    ReasonCode: 'INTERNAL_MOVE',
    ReasonCodeId: 'reason-1',
    ReasonNote: null,
    EvidenceRefs: [],
    PostedAt: '2026-06-23T05:00:00.000Z',
    PostedBy: 'operator-1',
    CreatedAt: '2026-06-23T05:00:00.000Z',
    UpdatedAt: '2026-06-23T05:00:00.000Z',
  },
  InventoryMovement: {
    Id: 'movement-1',
    MovementCode: 'IMV-001',
    MovementStatus: 'Posted',
    InventoryTransactionId: 'transaction-1',
    PutawayTaskId: null,
    PutawayTaskCode: null,
    OwnerId: 'owner-1',
    OwnerCode: null,
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-A',
    SkuId: 'sku-1',
    SkuCode: null,
    UomId: null,
    UomCode: null,
    Quantity: 1,
    FromDimensionId: 'dimension-source',
    FromBalanceId: 'balance-source',
    FromLocationId: 'loc-source',
    FromLocationCode: 'A-01',
    FromInventoryStatusCode: 'AVAILABLE',
    ToDimensionId: 'dimension-target',
    ToBalanceId: 'balance-target',
    ToLocationId: 'loc-target',
    ToLocationCode: 'B-01',
    ToInventoryStatusCode: 'AVAILABLE',
    LpnCode: null,
    SsccCode: null,
    ScanEvidenceJson: {},
    CreatedAt: '2026-06-23T05:00:00.000Z',
    CreatedBy: 'operator-1',
  },
  SourceBalance: {
    BalanceId: 'balance-source',
    DimensionId: 'dimension-source',
    QtyOnHand: 9,
    QtyReserved: 0,
    QtyAvailable: 9,
  },
  TargetBalance: {
    BalanceId: 'balance-target',
    DimensionId: 'dimension-target',
    QtyOnHand: 1,
    QtyReserved: 0,
    QtyAvailable: 1,
  },
  OutboxMessageId: 'outbox-1',
  EventType: 'InventoryMoved',
  IsDuplicate: false,
};

function httpMock(): { client: HttpClient; post: ReturnType<typeof vi.fn> } {
  const post = vi.fn(() => Promise.resolve(controlDto));
  return {
    client: {
      get: vi.fn(),
      post,
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient,
    post,
  };
}

describe('InventoryRepository inventory control', () => {
  it('posts status change to inventory-control endpoint', async () => {
    const http = httpMock();
    const repo = new InventoryRepository(http.client);

    const result = await repo.changeStatus({
      sourceBalanceId: 'balance-source',
      targetInventoryStatusCode: 'AVAILABLE',
      quantity: 2,
      reasonCode: 'INV_RELEASE',
      idempotencyKey: 'status-key-1',
    });

    expect(result.inventoryTransaction.transactionCode).toBe('ITX-001');
    expect(http.post).toHaveBeenCalledWith('/inventory-control/status-changes', {
      SourceBalanceId: 'balance-source',
      TargetInventoryStatusCode: 'AVAILABLE',
      Quantity: 2,
      ReasonCode: 'INV_RELEASE',
      IdempotencyKey: 'status-key-1',
    });
  });

  it('posts internal movement to inventory-control endpoint', async () => {
    const http = httpMock();
    const repo = new InventoryRepository(http.client);

    const result = await repo.moveInternal({
      sourceBalanceId: 'balance-source',
      targetLocationId: 'loc-target',
      quantity: 1,
      reasonCode: 'INTERNAL_MOVE',
      idempotencyKey: 'move-key-1',
    });

    expect(result.eventType).toBe('InventoryMoved');
    expect(http.post).toHaveBeenCalledWith('/inventory-control/movements', {
      SourceBalanceId: 'balance-source',
      TargetLocationId: 'loc-target',
      Quantity: 1,
      ReasonCode: 'INTERNAL_MOVE',
      IdempotencyKey: 'move-key-1',
    });
  });
});
