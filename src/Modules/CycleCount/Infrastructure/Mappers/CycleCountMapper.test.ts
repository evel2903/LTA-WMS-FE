import { describe, expect, it } from 'vitest';
import { CycleCountMapper } from '@modules/CycleCount/Infrastructure/Mappers/CycleCountMapper';
import type {
  CycleCountAdjustmentResultDto,
  CycleCountMutationResultDto,
  CycleCountWorkDto,
} from '@modules/CycleCount/Infrastructure/Dtos/CycleCountDtos';

const workDto: CycleCountWorkDto = {
  Id: 'work-1',
  CountCode: 'CC-001',
  WorkStatus: 'CountingLocked',
  SourceBalanceId: 'balance-source',
  LockedBalanceId: 'balance-locked',
  OriginalInventoryStatusCode: 'AVAILABLE',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WH-A',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  SkuId: 'sku-1',
  SkuCode: 'SKU-A',
  LocationId: 'loc-1',
  LocationCode: 'A-01',
  UomId: 'uom-1',
  UomCode: 'EA',
  LpnCode: 'LPN-001',
  ExpectedQuantity: 4,
  CountedQuantity: null,
  VarianceQuantity: null,
  ToleranceQuantity: 1,
  ApprovalRequestId: null,
  LockTransactionId: 'tx-lock',
  AdjustmentTransactionId: null,
  UnlockTransactionId: null,
  ReasonCode: 'RC-V1-HOLD-RELEASE',
  ReasonCodeId: 'reason-1',
  ReasonNote: null,
  EvidenceRefs: [],
  CreatedAt: '2026-06-23T06:00:00.000Z',
  UpdatedAt: '2026-06-23T06:00:00.000Z',
  CreatedBy: 'operator-1',
  UpdatedBy: 'operator-1',
};

const mutationDto: CycleCountMutationResultDto = {
  CycleCountWork: workDto,
  InventoryControl: {
    InventoryTransaction: {
      Id: 'tx-lock',
      TransactionCode: 'ITX-LOCK',
      TransactionType: 'StatusChange',
      TransactionStatus: 'Posted',
      FromInventoryStatusCode: 'AVAILABLE',
      ToInventoryStatusCode: 'COUNTING_LOCKED',
      Quantity: 4,
      IdempotencyKey: 'cc-lock-1',
      OutboxMessageId: 'outbox-lock',
    },
    SourceBalance: {
      BalanceId: 'balance-source',
      DimensionId: 'dimension-source',
      QtyOnHand: 6,
      QtyReserved: 0,
      QtyAvailable: 6,
    },
    TargetBalance: {
      BalanceId: 'balance-locked',
      DimensionId: 'dimension-locked',
      QtyOnHand: 4,
      QtyReserved: 0,
      QtyAvailable: 4,
    },
    EventType: 'InventoryStatusChanged',
    IsDuplicate: false,
  },
  IsDuplicate: false,
};

describe('CycleCountMapper', () => {
  it('maps work and mutation result DTOs into domain objects', () => {
    const result = CycleCountMapper.toMutationResult(mutationDto);

    expect(result).toMatchObject({
      cycleCountWork: {
        id: 'work-1',
        countCode: 'CC-001',
        workStatus: 'CountingLocked',
        lockedBalanceId: 'balance-locked',
      },
      inventoryControl: {
        inventoryTransaction: {
          transactionCode: 'ITX-LOCK',
          toInventoryStatusCode: 'COUNTING_LOCKED',
        },
        targetBalance: { qtyOnHand: 4 },
      },
    });
  });

  it('maps create and adjustment requests to PascalCase payloads', () => {
    expect(
      CycleCountMapper.toCreateRequest({
        sourceBalanceId: 'balance-source',
        quantity: 4,
        toleranceQuantity: 1,
        reasonCode: 'RC-V1-HOLD-RELEASE',
        reasonNote: '',
        evidenceRefs: [],
        idempotencyKey: 'cc-lock-1',
      }),
    ).toEqual({
      SourceBalanceId: 'balance-source',
      Quantity: 4,
      ToleranceQuantity: 1,
      ReasonCode: 'RC-V1-HOLD-RELEASE',
      EvidenceRefs: [],
      IdempotencyKey: 'cc-lock-1',
    });

    expect(
      CycleCountMapper.toAdjustmentRequest({
        reasonCode: 'RC-V1-ADJUSTMENT',
        approvalRequestId: 'approval-1',
        evidenceRefs: ['cc://approval'],
        idempotencyKey: 'cc-adjust-1',
      }),
    ).toEqual({
      ReasonCode: 'RC-V1-ADJUSTMENT',
      EvidenceRefs: ['cc://approval'],
      IdempotencyKey: 'cc-adjust-1',
      ApprovalRequestId: 'approval-1',
    });
  });

  it('maps adjustment result as transaction milestone, not InventoryStatus', () => {
    const dto: CycleCountAdjustmentResultDto = {
      CycleCountWork: { ...workDto, WorkStatus: 'AdjustmentPosted', AdjustmentTransactionId: 'tx-adjust' },
      InventoryTransaction: {
        Id: 'tx-adjust',
        TransactionCode: 'ITX-ADJ',
        TransactionType: 'CycleCountAdjustment',
        TransactionStatus: 'Posted',
        FromInventoryStatusCode: 'COUNTING_LOCKED',
        ToInventoryStatusCode: 'COUNTING_LOCKED',
        Quantity: 2,
        IdempotencyKey: 'cc-adjust-1',
        OutboxMessageId: 'outbox-adjust',
      },
      InventoryMovement: {
        Id: 'mv-adjust',
        MovementCode: 'IMV-ADJ',
        MovementStatus: 'Posted',
        InventoryTransactionId: 'tx-adjust',
        FromBalanceId: 'balance-locked',
        ToBalanceId: 'balance-locked',
        FromInventoryStatusCode: 'COUNTING_LOCKED',
        ToInventoryStatusCode: 'COUNTING_LOCKED',
        Quantity: 2,
        ScanEvidenceJson: { EventType: 'AdjustmentPosted' },
      },
      SourceBalance: mutationDto.InventoryControl!.TargetBalance,
      TargetBalance: { ...mutationDto.InventoryControl!.TargetBalance, QtyOnHand: 2, QtyAvailable: 2 },
      OutboxMessageId: 'outbox-adjust',
      EventType: 'AdjustmentPosted',
      IsDuplicate: false,
    };

    expect(CycleCountMapper.toAdjustmentResult(dto)).toMatchObject({
      eventType: 'AdjustmentPosted',
      cycleCountWork: { workStatus: 'AdjustmentPosted' },
      inventoryTransaction: { transactionType: 'CycleCountAdjustment' },
      inventoryMovement: { movementCode: 'IMV-ADJ', fromBalanceId: 'balance-locked' },
    });
  });
});
