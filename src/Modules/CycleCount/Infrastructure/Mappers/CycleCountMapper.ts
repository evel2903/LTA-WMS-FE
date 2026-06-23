import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  CreateCycleCountWorkInput,
  CycleCountReasonedInput,
  PostCycleCountAdjustmentInput,
  SubmitCycleCountWorkInput,
} from '@modules/CycleCount/Domain/Types/CycleCountQuery';
import type {
  CycleCountAdjustmentResult,
  CycleCountMutationResult,
  CycleCountWork,
  InventoryBalanceSnapshot,
  InventoryMovementSummary,
  InventoryTransactionSummary,
} from '@modules/CycleCount/Domain/Types/CycleCountWork';
import type {
  CycleCountAdjustmentResultDto,
  CycleCountMutationResultDto,
  CycleCountWorkDto,
  InventoryBalanceSnapshotDto,
  InventoryMovementDto,
  InventoryTransactionDto,
  PagedCycleCountWorkDto,
} from '@modules/CycleCount/Infrastructure/Dtos/CycleCountDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as T;
}

export class CycleCountMapper {
  static toWork(dto: CycleCountWorkDto): CycleCountWork {
    return {
      id: dto.Id,
      countCode: dto.CountCode,
      workStatus: dto.WorkStatus,
      sourceBalanceId: dto.SourceBalanceId,
      lockedBalanceId: dto.LockedBalanceId,
      originalInventoryStatusCode: dto.OriginalInventoryStatusCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      locationId: dto.LocationId,
      locationCode: dto.LocationCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      lpnCode: dto.LpnCode,
      expectedQuantity: dto.ExpectedQuantity,
      countedQuantity: dto.CountedQuantity,
      varianceQuantity: dto.VarianceQuantity,
      toleranceQuantity: dto.ToleranceQuantity,
      approvalRequestId: dto.ApprovalRequestId,
      lockTransactionId: dto.LockTransactionId,
      adjustmentTransactionId: dto.AdjustmentTransactionId,
      unlockTransactionId: dto.UnlockTransactionId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  }

  static toPaged(dto: PagedCycleCountWorkDto): PaginatedResponse<CycleCountWork> {
    return {
      items: dto.Items.map((item) => CycleCountMapper.toWork(item)),
      page: dto.Page,
      pageSize: dto.PageSize,
      totalItems: dto.TotalItems,
      totalPages: dto.TotalPages,
    };
  }

  static toMutationResult(dto: CycleCountMutationResultDto): CycleCountMutationResult {
    return {
      cycleCountWork: CycleCountMapper.toWork(dto.CycleCountWork),
      inventoryControl: dto.InventoryControl
        ? {
            inventoryTransaction: CycleCountMapper.toTransaction(dto.InventoryControl.InventoryTransaction),
            sourceBalance: CycleCountMapper.toBalance(dto.InventoryControl.SourceBalance),
            targetBalance: CycleCountMapper.toBalance(dto.InventoryControl.TargetBalance),
            eventType: dto.InventoryControl.EventType,
            isDuplicate: dto.InventoryControl.IsDuplicate,
          }
        : null,
      isDuplicate: dto.IsDuplicate,
    };
  }

  static toAdjustmentResult(dto: CycleCountAdjustmentResultDto): CycleCountAdjustmentResult {
    return {
      cycleCountWork: CycleCountMapper.toWork(dto.CycleCountWork),
      inventoryTransaction: CycleCountMapper.toTransaction(dto.InventoryTransaction),
      inventoryMovement: CycleCountMapper.toMovement(dto.InventoryMovement),
      sourceBalance: CycleCountMapper.toBalance(dto.SourceBalance),
      targetBalance: CycleCountMapper.toBalance(dto.TargetBalance),
      outboxMessageId: dto.OutboxMessageId,
      eventType: dto.EventType,
      isDuplicate: dto.IsDuplicate,
    };
  }

  static toCreateRequest(input: CreateCycleCountWorkInput) {
    return removeEmpty({
      SourceBalanceId: input.sourceBalanceId,
      Quantity: input.quantity,
      ToleranceQuantity: input.toleranceQuantity,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toSubmitRequest(input: SubmitCycleCountWorkInput) {
    return removeEmpty({
      CountedQuantity: input.countedQuantity,
      ApprovalRequestId: input.approvalRequestId,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toReasonedRequest(input: CycleCountReasonedInput) {
    return removeEmpty({
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toAdjustmentRequest(input: PostCycleCountAdjustmentInput) {
    return removeEmpty({
      ...CycleCountMapper.toReasonedRequest(input),
      ApprovalRequestId: input.approvalRequestId,
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

  private static toMovement(dto: InventoryMovementDto): InventoryMovementSummary {
    return {
      id: dto.Id,
      movementCode: dto.MovementCode,
      movementStatus: dto.MovementStatus,
      inventoryTransactionId: dto.InventoryTransactionId,
      fromBalanceId: dto.FromBalanceId,
      toBalanceId: dto.ToBalanceId,
      fromInventoryStatusCode: dto.FromInventoryStatusCode,
      toInventoryStatusCode: dto.ToInventoryStatusCode,
      quantity: dto.Quantity,
      scanEvidence: dto.ScanEvidenceJson,
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
