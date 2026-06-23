import { describe, expect, it } from 'vitest';

import { PutawayMapper } from '@modules/Putaway/Infrastructure/Mappers/PutawayMapper';
import type { PutawayTaskDto } from '@modules/Putaway/Infrastructure/Dtos/PutawayDtos';

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
    expect(PutawayMapper.toPaged({ Items: [dto], Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 } })).toMatchObject({
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
});
