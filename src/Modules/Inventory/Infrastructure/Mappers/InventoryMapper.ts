import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InventoryItem,
  InventoryItemId,
} from '@modules/Inventory/Domain/Entities/InventoryItem';
import type {
  ChangeInventoryStatusInput,
  InventoryBalanceSnapshot,
  InventoryControlResult,
  InventoryMovement,
  InventoryTransaction,
  MoveInventoryInternalInput,
} from '@modules/Inventory/Domain/Types/InventoryControl';
import type { AdjustQuantityInput } from '@modules/Inventory/Domain/Types/InventoryQuery';
import type {
  AdjustQuantityRequestDto,
  ChangeInventoryStatusRequestDto,
  InventoryBalanceSnapshotDto,
  InventoryControlResultDto,
  InventoryItemDto,
  InventoryListResponseDto,
  InventoryMovementDto,
  InventoryTransactionDto,
  MoveInventoryInternalRequestDto,
} from '@modules/Inventory/Infrastructure/Dtos/InventoryDtos';

/**
 * DTO ↔ Domain translation boundary for inventory. The only file aware of both
 * the snake_case wire format and the camelCase Domain entity.
 */
function removeNullish<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>;
}

export const InventoryMapper = {
  toEntity(dto: InventoryItemDto): InventoryItem {
    return {
      id: dto.id as InventoryItemId,
      sku: dto.sku,
      productName: dto.product_name,
      warehouseId: dto.warehouse_id,
      locationCode: dto.location_code,
      quantityOnHand: dto.quantity_on_hand,
      quantityReserved: dto.quantity_reserved,
      reorderPoint: dto.reorder_point,
      unitOfMeasure: dto.unit_of_measure,
      updatedAt: dto.updated_at,
    };
  },

  toPaginated(dto: InventoryListResponseDto): PaginatedResponse<InventoryItem> {
    return {
      items: dto.items.map((item) => InventoryMapper.toEntity(item)),
      page: dto.page,
      pageSize: dto.page_size,
      totalItems: dto.total_items,
      totalPages: dto.total_pages,
    };
  },

  toAdjustRequest(input: AdjustQuantityInput): AdjustQuantityRequestDto {
    return { delta: input.delta, reason: input.reason };
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

  toControlResult(dto: InventoryControlResultDto): InventoryControlResult {
    return {
      inventoryTransaction: InventoryMapper.toInventoryTransaction(dto.InventoryTransaction),
      inventoryMovement: InventoryMapper.toInventoryMovement(dto.InventoryMovement),
      sourceBalance: InventoryMapper.toBalanceSnapshot(dto.SourceBalance),
      targetBalance: InventoryMapper.toBalanceSnapshot(dto.TargetBalance),
      outboxMessageId: dto.OutboxMessageId,
      eventType: dto.EventType,
      isDuplicate: dto.IsDuplicate,
    };
  },

  toChangeStatusRequest(input: ChangeInventoryStatusInput): ChangeInventoryStatusRequestDto {
    return removeNullish({
      SourceBalanceId: input.sourceBalanceId,
      TargetInventoryStatusCode: input.targetInventoryStatusCode,
      Quantity: input.quantity,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    }) as ChangeInventoryStatusRequestDto;
  },

  toMoveInternalRequest(input: MoveInventoryInternalInput): MoveInventoryInternalRequestDto {
    return removeNullish({
      SourceBalanceId: input.sourceBalanceId,
      TargetLocationId: input.targetLocationId,
      Quantity: input.quantity,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    }) as MoveInventoryInternalRequestDto;
  },
};
