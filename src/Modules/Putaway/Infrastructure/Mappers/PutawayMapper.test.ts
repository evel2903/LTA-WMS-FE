import { describe, expect, it } from 'vitest';

import { PutawayMapper } from '@modules/Putaway/Infrastructure/Mappers/PutawayMapper';
import type {
  ConfirmPutawayTaskResultDto,
  PutawayTaskDto,
} from '@modules/Putaway/Infrastructure/Dtos/PutawayDtos';

const dto: PutawayTaskDto = {
  Id: 'putaway-1',
  TaskCode: 'PUT-001',
  TaskStatus: 'Released',
  InboundPutawayReleaseId: 'release-1',
  ReceiptId: 'receipt-1',
  ReceiptLineId: 'receipt-line-1',
  InboundPlanId: 'plan-1',
  InboundPlanLineId: 'plan-line-1',
  InboundLpnId: 'lpn-1',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WH-A',
  SkuId: 'sku-1',
  SkuCode: 'SKU-A',
  UomId: 'uom-1',
  UomCode: 'EA',
  Quantity: 5,
  LpnCode: 'LPN-001',
  SsccCode: '000000000000000001',
  InventoryStatusCode: 'READY_FOR_PUTAWAY',
  SourceLocationId: 'staging-1',
  SourceLocationCode: 'RCV-STG-01',
  TargetLocationId: 'loc-1',
  TargetLocationCode: 'A-01',
  TargetLocationProfileId: 'profile-1',
  Priority: 50,
  WorkPoolCode: 'PUTAWAY-WT01',
  AssignedUserId: null,
  ConstraintJson: { SelectedBy: 'suggested_target' },
  EligibilityDecisionJson: { Decision: 'Released' },
  OutboxMessageId: 'outbox-1',
  MobileTaskId: 'mobile-1',
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: ['scan://rf/lpn-001'],
  IdempotencyKey: 'putaway-key-1',
  ReleasedAt: '2026-06-23T03:00:00.000Z',
  ReleasedBy: 'operator-1',
  IsDuplicate: false,
  CreatedAt: '2026-06-23T03:00:00.000Z',
  UpdatedAt: '2026-06-23T03:00:00.000Z',
};

const confirmDto: ConfirmPutawayTaskResultDto = {
  PutawayTask: { ...dto, TaskStatus: 'Confirmed' },
  InventoryTransaction: {
    Id: 'transaction-1',
    TransactionCode: 'ITX-001',
    TransactionType: 'PutawayConfirm',
    TransactionStatus: 'Posted',
    PutawayTaskId: 'putaway-1',
    PutawayTaskCode: 'PUT-001',
    InventoryMovementId: 'movement-1',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN-A',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-A',
    SkuId: 'sku-1',
    SkuCode: 'SKU-A',
    UomId: 'uom-1',
    UomCode: 'EA',
    Quantity: 5,
    FromInventoryStatusCode: 'READY_FOR_PUTAWAY',
    ToInventoryStatusCode: 'AVAILABLE',
    FromLocationId: 'staging-1',
    FromLocationCode: 'RCV-STG-01',
    ToLocationId: 'loc-1',
    ToLocationCode: 'A-01',
    LpnCode: 'LPN-001',
    SsccCode: null,
    IdempotencyKey: 'confirm-key-1',
    OutboxMessageId: 'outbox-confirm-1',
    ReasonCode: null,
    ReasonCodeId: null,
    ReasonNote: null,
    EvidenceRefs: [],
    PostedAt: '2026-06-23T04:00:00.000Z',
    PostedBy: 'operator-1',
    CreatedAt: '2026-06-23T04:00:00.000Z',
    UpdatedAt: '2026-06-23T04:00:00.000Z',
  },
  InventoryMovement: {
    Id: 'movement-1',
    MovementCode: 'IMV-001',
    MovementStatus: 'Posted',
    InventoryTransactionId: 'transaction-1',
    PutawayTaskId: 'putaway-1',
    PutawayTaskCode: 'PUT-001',
    OwnerId: 'owner-1',
    OwnerCode: 'OWN-A',
    WarehouseId: 'warehouse-1',
    WarehouseCode: 'WH-A',
    SkuId: 'sku-1',
    SkuCode: 'SKU-A',
    UomId: 'uom-1',
    UomCode: 'EA',
    Quantity: 5,
    FromDimensionId: 'dimension-source',
    FromBalanceId: 'balance-source',
    FromLocationId: 'staging-1',
    FromLocationCode: 'RCV-STG-01',
    FromInventoryStatusCode: 'READY_FOR_PUTAWAY',
    ToDimensionId: 'dimension-target',
    ToBalanceId: 'balance-target',
    ToLocationId: 'loc-1',
    ToLocationCode: 'A-01',
    ToInventoryStatusCode: 'AVAILABLE',
    LpnCode: 'LPN-001',
    SsccCode: null,
    ScanEvidenceJson: { StorageMilestone: 'Stored' },
    CreatedAt: '2026-06-23T04:00:00.000Z',
    CreatedBy: 'operator-1',
  },
  SourceBalance: {
    BalanceId: 'balance-source',
    DimensionId: 'dimension-source',
    QtyOnHand: 0,
    QtyReserved: 0,
    QtyAvailable: 0,
  },
  TargetBalance: {
    BalanceId: 'balance-target',
    DimensionId: 'dimension-target',
    QtyOnHand: 5,
    QtyReserved: 0,
    QtyAvailable: 5,
  },
  ScanResults: [
    {
      ScanType: 'SourceLocation',
      RawValue: 'RCV-STG-01',
      ExpectedValue: 'RCV-STG-01',
      Result: 'Accepted',
    },
    { ScanType: 'TargetLocation', RawValue: 'A-01', ExpectedValue: 'A-01', Result: 'Accepted' },
  ],
  OutboxMessageId: 'outbox-confirm-1',
  IsDuplicate: false,
};

describe('PutawayMapper', () => {
  it('maps putaway task DTO into domain object', () => {
    expect(PutawayMapper.toTask(dto)).toMatchObject({
      id: 'putaway-1',
      taskCode: 'PUT-001',
      taskStatus: 'Released',
      inventoryStatusCode: 'READY_FOR_PUTAWAY',
      targetLocationCode: 'A-01',
      outboxMessageId: 'outbox-1',
      mobileTaskId: 'mobile-1',
    });
  });

  it('maps paged DTOs with response metadata', () => {
    expect(
      PutawayMapper.toPaged({
        Items: [dto],
        Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
      }),
    ).toMatchObject({
      items: [expect.objectContaining({ id: 'putaway-1' })],
      pageSize: 50,
      totalItems: 1,
    });
  });

  it('maps release request and removes empty optional values', () => {
    expect(
      PutawayMapper.toReleaseRequest({
        inboundPutawayReleaseId: 'release-1',
        sourceLocationCode: '',
        targetLocationId: null,
        priority: 50,
        reasonCode: undefined,
        evidenceRefs: ['scan://rf/lpn-001'],
        idempotencyKey: 'putaway-key-1',
      }),
    ).toEqual({
      InboundPutawayReleaseId: 'release-1',
      Priority: 50,
      EvidenceRefs: ['scan://rf/lpn-001'],
      IdempotencyKey: 'putaway-key-1',
    });
  });

  it('maps confirm request and removes empty optional values', () => {
    expect(
      PutawayMapper.toConfirmRequest({
        sourceLocationScan: 'RCV-STG-01',
        targetLocationScan: 'A-01',
        lpnScan: '',
        confirmedQuantity: 5,
        reasonCode: undefined,
        evidenceRefs: ['scan://confirm-1'],
        idempotencyKey: 'confirm-key-1',
      }),
    ).toEqual({
      SourceLocationScan: 'RCV-STG-01',
      TargetLocationScan: 'A-01',
      ConfirmedQuantity: 5,
      EvidenceRefs: ['scan://confirm-1'],
      IdempotencyKey: 'confirm-key-1',
    });
  });

  it('maps confirm result with transaction, movement and balances', () => {
    const result = PutawayMapper.toConfirmResult(confirmDto);

    expect(result).toMatchObject({
      putawayTask: { id: 'putaway-1', taskStatus: 'Confirmed' },
      inventoryTransaction: {
        transactionCode: 'ITX-001',
        fromInventoryStatusCode: 'READY_FOR_PUTAWAY',
        toInventoryStatusCode: 'AVAILABLE',
      },
      inventoryMovement: {
        movementCode: 'IMV-001',
        scanEvidenceJson: { StorageMilestone: 'Stored' },
      },
      sourceBalance: { qtyOnHand: 0 },
      targetBalance: { qtyOnHand: 5 },
    });
    expect(
      result.scanResults.some(
        (scan) => scan.scanType === 'SourceLocation' && scan.result === 'Accepted',
      ),
    ).toBe(true);
  });
});
