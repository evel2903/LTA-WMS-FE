import { describe, expect, it } from 'vitest';

import { InventoryMapper } from '@modules/Inventory/Infrastructure/Mappers/InventoryMapper';
import type { InventoryControlResultDto } from '@modules/Inventory/Infrastructure/Dtos/InventoryDtos';

const controlDto: InventoryControlResultDto = {
  InventoryTransaction: {
    Id: 'transaction-1',
    TransactionCode: 'ITX-001',
    TransactionType: 'StatusChange',
    TransactionStatus: 'Posted',
    PutawayTaskId: null,
    PutawayTaskCode: null,
    InventoryMovementId: 'movement-1',
    OwnerId: 'owner-1',
    OwnerCode: null,
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-A',
    SkuId: 'sku-1',
    SkuCode: 'SKU-A',
    UomId: null,
    UomCode: null,
    Quantity: 2,
    FromInventoryStatusCode: 'HOLD',
    ToInventoryStatusCode: 'AVAILABLE',
    FromLocationId: 'loc-1',
    FromLocationCode: 'A-01',
    ToLocationId: 'loc-1',
    ToLocationCode: 'A-01',
    LpnCode: 'LPN-001',
    SsccCode: null,
    IdempotencyKey: 'status-key-1',
    OutboxMessageId: 'outbox-1',
    ReasonCode: 'INV_RELEASE',
    ReasonCodeId: 'reason-1',
    ReasonNote: 'Release sau QC',
    EvidenceRefs: ['qc://result-1'],
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
    SkuCode: 'SKU-A',
    UomId: null,
    UomCode: null,
    Quantity: 2,
    FromDimensionId: 'dimension-source',
    FromBalanceId: 'balance-source',
    FromLocationId: 'loc-1',
    FromLocationCode: 'A-01',
    FromInventoryStatusCode: 'HOLD',
    ToDimensionId: 'dimension-target',
    ToBalanceId: 'balance-target',
    ToLocationId: 'loc-1',
    ToLocationCode: 'A-01',
    ToInventoryStatusCode: 'AVAILABLE',
    LpnCode: 'LPN-001',
    SsccCode: null,
    ScanEvidenceJson: { Operation: 'StatusChange' },
    CreatedAt: '2026-06-23T05:00:00.000Z',
    CreatedBy: 'operator-1',
  },
  SourceBalance: {
    BalanceId: 'balance-source',
    DimensionId: 'dimension-source',
    QtyOnHand: 8,
    QtyReserved: 1,
    QtyAvailable: 7,
  },
  TargetBalance: {
    BalanceId: 'balance-target',
    DimensionId: 'dimension-target',
    QtyOnHand: 2,
    QtyReserved: 0,
    QtyAvailable: 2,
  },
  OutboxMessageId: 'outbox-1',
  EventType: 'InventoryStatusChanged',
  IsDuplicate: false,
};

describe('InventoryMapper inventory control', () => {
  it('maps status/movement control result from BE PascalCase DTO', () => {
    const result = InventoryMapper.toControlResult(controlDto);

    expect(result).toMatchObject({
      eventType: 'InventoryStatusChanged',
      inventoryTransaction: {
        transactionCode: 'ITX-001',
        putawayTaskId: null,
        uomId: null,
        fromInventoryStatusCode: 'HOLD',
        toInventoryStatusCode: 'AVAILABLE',
      },
      inventoryMovement: {
        movementCode: 'IMV-001',
        scanEvidenceJson: { Operation: 'StatusChange' },
      },
      sourceBalance: { qtyOnHand: 8 },
      targetBalance: { qtyOnHand: 2 },
    });
  });

  it('maps status and movement requests while removing empty optional fields', () => {
    expect(
      InventoryMapper.toChangeStatusRequest({
        sourceBalanceId: 'balance-source',
        targetInventoryStatusCode: 'AVAILABLE',
        quantity: 2,
        reasonCode: 'INV_RELEASE',
        reasonNote: '',
        evidenceRefs: [],
        idempotencyKey: 'status-key-1',
      }),
    ).toEqual({
      SourceBalanceId: 'balance-source',
      TargetInventoryStatusCode: 'AVAILABLE',
      Quantity: 2,
      ReasonCode: 'INV_RELEASE',
      EvidenceRefs: [],
      IdempotencyKey: 'status-key-1',
    });
    expect(
      InventoryMapper.toMoveInternalRequest({
        sourceBalanceId: 'balance-source',
        targetLocationId: 'loc-target',
        quantity: 1,
        reasonCode: 'INTERNAL_MOVE',
        reasonNote: null,
        idempotencyKey: 'move-key-1',
      }),
    ).toEqual({
      SourceBalanceId: 'balance-source',
      TargetLocationId: 'loc-target',
      Quantity: 1,
      ReasonCode: 'INTERNAL_MOVE',
      IdempotencyKey: 'move-key-1',
    });
  });
});
