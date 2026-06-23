import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  ConfirmPutawayTaskResult,
  InventoryBalanceSnapshot,
  InventoryMovement,
  InventoryTransaction,
  PutawayConfirmScan,
  PutawayTask,
} from '@modules/Putaway/Domain/Types/PutawayTask';
import type {
  ConfirmPutawayTaskInput,
  ReleasePutawayTaskInput,
} from '@modules/Putaway/Domain/Types/PutawayTaskQuery';
import type {
  ConfirmPutawayTaskRequestDto,
  ConfirmPutawayTaskResultDto,
  InventoryBalanceSnapshotDto,
  InventoryMovementDto,
  InventoryTransactionDto,
  PagedPutawayTaskDto,
  PutawayConfirmScanDto,
  PutawayTaskDto,
  ReleasePutawayTaskRequestDto,
} from '@modules/Putaway/Infrastructure/Dtos/PutawayDtos';

function removeNullish<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>;
}

export const PutawayMapper = {
  toTask(dto: PutawayTaskDto): PutawayTask {
    return {
      id: dto.Id,
      taskCode: dto.TaskCode,
      taskStatus: dto.TaskStatus,
      inboundPutawayReleaseId: dto.InboundPutawayReleaseId,
      receiptId: dto.ReceiptId,
      receiptLineId: dto.ReceiptLineId,
      inboundPlanId: dto.InboundPlanId,
      inboundPlanLineId: dto.InboundPlanLineId,
      inboundLpnId: dto.InboundLpnId,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      quantity: dto.Quantity,
      lpnCode: dto.LpnCode,
      ssccCode: dto.SsccCode,
      inventoryStatusCode: dto.InventoryStatusCode,
      sourceLocationId: dto.SourceLocationId,
      sourceLocationCode: dto.SourceLocationCode,
      targetLocationId: dto.TargetLocationId,
      targetLocationCode: dto.TargetLocationCode,
      targetLocationProfileId: dto.TargetLocationProfileId,
      priority: dto.Priority,
      workPoolCode: dto.WorkPoolCode,
      assignedUserId: dto.AssignedUserId,
      constraintJson: dto.ConstraintJson,
      eligibilityDecisionJson: dto.EligibilityDecisionJson,
      outboxMessageId: dto.OutboxMessageId,
      mobileTaskId: dto.MobileTaskId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      idempotencyKey: dto.IdempotencyKey,
      releasedAt: dto.ReleasedAt,
      releasedBy: dto.ReleasedBy,
      isDuplicate: dto.IsDuplicate,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toPaged(dto: PagedPutawayTaskDto): PaginatedResponse<PutawayTask> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map((item) => PutawayMapper.toTask(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toReleaseRequest(input: ReleasePutawayTaskInput): ReleasePutawayTaskRequestDto {
    return removeNullish({
      InboundPutawayReleaseId: input.inboundPutawayReleaseId,
      SourceLocationId: input.sourceLocationId,
      SourceLocationCode: input.sourceLocationCode,
      TargetLocationId: input.targetLocationId,
      Priority: input.priority,
      WorkPoolCode: input.workPoolCode,
      AssignedUserId: input.assignedUserId,
      AttemptOverride: input.attemptOverride,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    }) as ReleasePutawayTaskRequestDto;
  },

  toInventoryTransaction(dto: InventoryTransactionDto): InventoryTransaction {
    return {
      id: dto.Id,
      transactionCode: dto.TransactionCode,
      transactionType: dto.TransactionType,
      transactionStatus: dto.TransactionStatus,
      putawayTaskId: dto.PutawayTaskId,
      putawayTaskCode: dto.PutawayTaskCode,
      inventoryMovementId: dto.InventoryMovementId,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      quantity: dto.Quantity,
      fromInventoryStatusCode: dto.FromInventoryStatusCode,
      toInventoryStatusCode: dto.ToInventoryStatusCode,
      fromLocationId: dto.FromLocationId,
      fromLocationCode: dto.FromLocationCode,
      toLocationId: dto.ToLocationId,
      toLocationCode: dto.ToLocationCode,
      lpnCode: dto.LpnCode,
      ssccCode: dto.SsccCode,
      idempotencyKey: dto.IdempotencyKey,
      outboxMessageId: dto.OutboxMessageId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      postedAt: dto.PostedAt,
      postedBy: dto.PostedBy,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toInventoryMovement(dto: InventoryMovementDto): InventoryMovement {
    return {
      id: dto.Id,
      movementCode: dto.MovementCode,
      movementStatus: dto.MovementStatus,
      inventoryTransactionId: dto.InventoryTransactionId,
      putawayTaskId: dto.PutawayTaskId,
      putawayTaskCode: dto.PutawayTaskCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      quantity: dto.Quantity,
      fromDimensionId: dto.FromDimensionId,
      fromBalanceId: dto.FromBalanceId,
      fromLocationId: dto.FromLocationId,
      fromLocationCode: dto.FromLocationCode,
      fromInventoryStatusCode: dto.FromInventoryStatusCode,
      toDimensionId: dto.ToDimensionId,
      toBalanceId: dto.ToBalanceId,
      toLocationId: dto.ToLocationId,
      toLocationCode: dto.ToLocationCode,
      toInventoryStatusCode: dto.ToInventoryStatusCode,
      lpnCode: dto.LpnCode,
      ssccCode: dto.SsccCode,
      scanEvidenceJson: dto.ScanEvidenceJson ?? {},
      createdAt: dto.CreatedAt,
      createdBy: dto.CreatedBy,
    };
  },

  toBalanceSnapshot(dto: InventoryBalanceSnapshotDto): InventoryBalanceSnapshot {
    return {
      balanceId: dto.BalanceId,
      dimensionId: dto.DimensionId,
      qtyOnHand: dto.QtyOnHand,
      qtyReserved: dto.QtyReserved,
      qtyAvailable: dto.QtyAvailable,
    };
  },

  toConfirmScan(dto: PutawayConfirmScanDto): PutawayConfirmScan {
    return {
      scanType: dto.ScanType,
      rawValue: dto.RawValue,
      expectedValue: dto.ExpectedValue,
      result: dto.Result,
    };
  },

  toConfirmResult(dto: ConfirmPutawayTaskResultDto): ConfirmPutawayTaskResult {
    return {
      putawayTask: PutawayMapper.toTask(dto.PutawayTask),
      inventoryTransaction: PutawayMapper.toInventoryTransaction(dto.InventoryTransaction),
      inventoryMovement: PutawayMapper.toInventoryMovement(dto.InventoryMovement),
      sourceBalance: PutawayMapper.toBalanceSnapshot(dto.SourceBalance),
      targetBalance: PutawayMapper.toBalanceSnapshot(dto.TargetBalance),
      scanResults: (dto.ScanResults ?? []).map((scan) => PutawayMapper.toConfirmScan(scan)),
      outboxMessageId: dto.OutboxMessageId,
      isDuplicate: dto.IsDuplicate,
    };
  },

  toConfirmRequest(input: ConfirmPutawayTaskInput): ConfirmPutawayTaskRequestDto {
    return removeNullish({
      SourceLocationScan: input.sourceLocationScan,
      TargetLocationScan: input.targetLocationScan,
      LpnScan: input.lpnScan,
      ConfirmedQuantity: input.confirmedQuantity,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      DeviceCode: input.deviceCode,
      SessionId: input.sessionId,
      IdempotencyKey: input.idempotencyKey,
    }) as ConfirmPutawayTaskRequestDto;
  },
};
