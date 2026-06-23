import { describe, expect, it } from 'vitest';
import { ReplenishmentMapper } from '@modules/Replenishment/Infrastructure/Mappers/ReplenishmentMapper';
import type {
  InventoryReconciliationFailureResultDto,
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
  WarehouseCode: 'WH-A',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  SkuId: 'sku-1',
  SkuCode: 'SKU-A',
  UomId: 'uom-1',
  UomCode: 'EA',
  Quantity: 12,
  ShortPickReference: null,
  Priority: null,
  WorkPoolCode: null,
  AssignedUserId: null,
  EligibilityDecisionJson: { Rule: 'PickSequenceOrPickFacePolicy' },
  OutboxMessageId: 'outbox-release',
  ConfirmTransactionId: null,
  ConfirmMovementId: null,
  ConfirmOutboxMessageId: null,
  ReasonCode: 'RC-V1-REPLENISHMENT',
  ReasonCodeId: 'reason-repl',
  ReasonNote: null,
  EvidenceRefs: ['PF-MIN-001'],
  ReleasedAt: '2026-06-23T07:00:00.000Z',
  ConfirmedAt: null,
  CancelledAt: null,
  CreatedAt: '2026-06-23T07:00:00.000Z',
  UpdatedAt: '2026-06-23T07:00:00.000Z',
  CreatedBy: 'operator-1',
  UpdatedBy: 'operator-1',
};

describe('ReplenishmentMapper', () => {
  it('maps replenishment mutation result without treating task status as InventoryStatus', () => {
    const dto: ReplenishmentMutationResultDto = {
      ReplenishmentTask: taskDto,
      InventoryControl: null,
      OutboxMessageId: 'outbox-release',
      EventType: 'ReplenishmentTaskReleased',
      IsDuplicate: false,
    };

    expect(ReplenishmentMapper.toMutationResult(dto)).toMatchObject({
      replenishmentTask: {
        id: 'task-1',
        taskStatus: 'Released',
        sourceInventoryStatusCode: 'AVAILABLE',
        targetLocationCode: 'PF-01',
      },
      eventType: 'ReplenishmentTaskReleased',
      outboxMessageId: 'outbox-release',
    });
  });

  it('maps release and reasoned requests to backend PascalCase payloads', () => {
    expect(
      ReplenishmentMapper.toReleaseRequest({
        triggerType: 'EmergencyShortPick',
        sourceBalanceId: 'balance-source',
        targetLocationId: 'pick-face-1',
        quantity: 12,
        shortPickReference: 'SHORT-001',
        reasonCode: 'RC-V1-REPLENISHMENT',
        reasonNote: '',
        evidenceRefs: ['SHORT-001'],
        idempotencyKey: 'repl-release-1',
      }),
    ).toEqual({
      TriggerType: 'EmergencyShortPick',
      SourceBalanceId: 'balance-source',
      TargetLocationId: 'pick-face-1',
      Quantity: 12,
      ShortPickReference: 'SHORT-001',
      ReasonCode: 'RC-V1-REPLENISHMENT',
      EvidenceRefs: ['SHORT-001'],
      IdempotencyKey: 'repl-release-1',
    });

    expect(
      ReplenishmentMapper.toReasonedRequest({
        reasonCode: 'RC-V1-ADJUSTMENT',
        evidenceRefs: ['RF-001'],
        idempotencyKey: 'repl-confirm-1',
      }),
    ).toEqual({
      ReasonCode: 'RC-V1-ADJUSTMENT',
      EvidenceRefs: ['RF-001'],
      IdempotencyKey: 'repl-confirm-1',
    });
  });

  it('maps reconciliation failure result as event hook output', () => {
    const dto: InventoryReconciliationFailureResultDto = {
      BusinessReference: 'ITX-001',
      EventType: 'InventoryReconciliationFailed',
      ErrorMessage: 'ERP mismatch',
      RetryStatus: 'PendingRetry',
      WarehouseId: 'warehouse-1',
      OwnerId: 'owner-1',
      OutboxMessageId: 'outbox-recon',
      ExceptionCaseId: 'exception-1',
      IsDuplicate: false,
    };

    expect(ReplenishmentMapper.toReconciliationFailureResult(dto)).toEqual({
      businessReference: 'ITX-001',
      eventType: 'InventoryReconciliationFailed',
      errorMessage: 'ERP mismatch',
      retryStatus: 'PendingRetry',
      warehouseId: 'warehouse-1',
      ownerId: 'owner-1',
      outboxMessageId: 'outbox-recon',
      exceptionCaseId: 'exception-1',
      isDuplicate: false,
    });
  });
});
