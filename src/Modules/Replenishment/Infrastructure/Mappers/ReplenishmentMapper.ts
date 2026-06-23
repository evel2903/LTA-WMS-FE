import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  RecordInventoryReconciliationFailureInput,
  ReleaseReplenishmentTaskInput,
  ReplenishmentReasonedInput,
} from '@modules/Replenishment/Domain/Types/ReplenishmentQuery';
import type {
  InventoryBalanceSnapshot,
  InventoryReconciliationFailureResult,
  InventoryTransactionSummary,
  ReplenishmentMutationResult,
  ReplenishmentTask,
} from '@modules/Replenishment/Domain/Types/ReplenishmentTask';
import type {
  InventoryBalanceSnapshotDto,
  InventoryReconciliationFailureResultDto,
  InventoryTransactionDto,
  PagedReplenishmentTaskDto,
  ReplenishmentMutationResultDto,
  ReplenishmentTaskDto,
} from '@modules/Replenishment/Infrastructure/Dtos/ReplenishmentDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as T;
}

export class ReplenishmentMapper {
  static toTask(dto: ReplenishmentTaskDto): ReplenishmentTask {
    return {
      id: dto.Id,
      taskCode: dto.TaskCode,
      taskStatus: dto.TaskStatus,
      triggerType: dto.TriggerType,
      sourceBalanceId: dto.SourceBalanceId,
      sourceDimensionId: dto.SourceDimensionId,
      sourceLocationId: dto.SourceLocationId,
      sourceLocationCode: dto.SourceLocationCode,
      sourceInventoryStatusCode: dto.SourceInventoryStatusCode,
      targetLocationId: dto.TargetLocationId,
      targetLocationCode: dto.TargetLocationCode,
      targetLocationProfileId: dto.TargetLocationProfileId,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      quantity: dto.Quantity,
      shortPickReference: dto.ShortPickReference,
      priority: dto.Priority,
      workPoolCode: dto.WorkPoolCode,
      assignedUserId: dto.AssignedUserId,
      eligibilityDecision: dto.EligibilityDecisionJson,
      outboxMessageId: dto.OutboxMessageId,
      confirmTransactionId: dto.ConfirmTransactionId,
      confirmMovementId: dto.ConfirmMovementId,
      confirmOutboxMessageId: dto.ConfirmOutboxMessageId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs,
      releasedAt: dto.ReleasedAt,
      confirmedAt: dto.ConfirmedAt,
      cancelledAt: dto.CancelledAt,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  }

  static toPaged(dto: PagedReplenishmentTaskDto): PaginatedResponse<ReplenishmentTask> {
    return {
      items: dto.Items.map((item) => ReplenishmentMapper.toTask(item)),
      page: dto.Page,
      pageSize: dto.PageSize,
      totalItems: dto.TotalItems,
      totalPages: dto.TotalPages,
    };
  }

  static toMutationResult(dto: ReplenishmentMutationResultDto): ReplenishmentMutationResult {
    return {
      replenishmentTask: ReplenishmentMapper.toTask(dto.ReplenishmentTask),
      inventoryControl: dto.InventoryControl
        ? {
            inventoryTransaction: ReplenishmentMapper.toTransaction(dto.InventoryControl.InventoryTransaction),
            sourceBalance: ReplenishmentMapper.toBalance(dto.InventoryControl.SourceBalance),
            targetBalance: ReplenishmentMapper.toBalance(dto.InventoryControl.TargetBalance),
            eventType: dto.InventoryControl.EventType,
            isDuplicate: dto.InventoryControl.IsDuplicate,
          }
        : null,
      outboxMessageId: dto.OutboxMessageId,
      eventType: dto.EventType,
      isDuplicate: dto.IsDuplicate,
    };
  }

  static toReconciliationFailureResult(
    dto: InventoryReconciliationFailureResultDto,
  ): InventoryReconciliationFailureResult {
    return {
      businessReference: dto.BusinessReference,
      eventType: dto.EventType,
      errorMessage: dto.ErrorMessage,
      retryStatus: dto.RetryStatus,
      warehouseId: dto.WarehouseId,
      ownerId: dto.OwnerId,
      outboxMessageId: dto.OutboxMessageId,
      exceptionCaseId: dto.ExceptionCaseId,
      isDuplicate: dto.IsDuplicate,
    };
  }

  static toReleaseRequest(input: ReleaseReplenishmentTaskInput) {
    return removeEmpty({
      TriggerType: input.triggerType,
      SourceBalanceId: input.sourceBalanceId,
      TargetLocationId: input.targetLocationId,
      Quantity: input.quantity,
      ShortPickReference: input.shortPickReference,
      Priority: input.priority,
      WorkPoolCode: input.workPoolCode,
      AssignedUserId: input.assignedUserId,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toReasonedRequest(input: ReplenishmentReasonedInput) {
    return removeEmpty({
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toReconciliationFailureRequest(input: RecordInventoryReconciliationFailureInput) {
    return removeEmpty({
      BusinessReference: input.businessReference,
      EventType: input.eventType,
      WarehouseId: input.warehouseId,
      OwnerId: input.ownerId,
      ErrorMessage: input.errorMessage,
      RetryStatus: input.retryStatus,
      ReasonCode: input.reasonCode,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
      Payload: input.payload,
    });
  }

  private static toTransaction(dto: InventoryTransactionDto): InventoryTransactionSummary {
    return {
      id: dto.Id,
      transactionCode: dto.TransactionCode,
      transactionType: dto.TransactionType,
      transactionStatus: dto.TransactionStatus,
      fromInventoryStatusCode: dto.FromInventoryStatusCode,
      toInventoryStatusCode: dto.ToInventoryStatusCode,
      quantity: dto.Quantity,
      idempotencyKey: dto.IdempotencyKey,
      outboxMessageId: dto.OutboxMessageId,
    };
  }

  private static toBalance(dto: InventoryBalanceSnapshotDto): InventoryBalanceSnapshot {
    return {
      balanceId: dto.BalanceId,
      dimensionId: dto.DimensionId,
      qtyOnHand: dto.QtyOnHand,
      qtyReserved: dto.QtyReserved,
      qtyAvailable: dto.QtyAvailable,
    };
  }
}
