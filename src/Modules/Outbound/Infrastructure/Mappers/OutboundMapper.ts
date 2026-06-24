import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  Allocation,
  AllocationLine,
  OutboundOrder,
  OutboundOrderLine,
  PickRelease,
  PickTask,
} from '@modules/Outbound/Domain/Types/OutboundOrder';
import type {
  AllocateOutboundOrderInput,
  ImportOutboundOrderInput,
  ReasonOutboundOrderInput,
  ReleaseOutboundOrderInput,
} from '@modules/Outbound/Domain/Types/OutboundOrderQuery';
import type {
  AllocationDto,
  AllocationLineDto,
  OutboundOrderDto,
  OutboundOrderLineDto,
  PagedAllocationDto,
  PagedOutboundOrderDto,
  PagedPickReleaseDto,
  PickReleaseDto,
  PickTaskDto,
} from '@modules/Outbound/Infrastructure/Dtos/OutboundDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as T;
}

export class OutboundMapper {
  static toLine(dto: OutboundOrderLineDto): OutboundOrderLine {
    return {
      id: dto.Id,
      lineNumber: dto.LineNumber,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      orderedQuantity: dto.OrderedQuantity,
      externalLineReference: dto.ExternalLineReference,
      validationErrors: dto.ValidationErrors,
    };
  }

  static toOrder(dto: OutboundOrderDto): OutboundOrder {
    return {
      id: dto.Id,
      orderNumber: dto.OrderNumber,
      sourceSystem: dto.SourceSystem,
      sourceReference: dto.SourceReference,
      businessReference: dto.BusinessReference,
      customerId: dto.CustomerId,
      customerSourceSystem: dto.CustomerSourceSystem,
      customerExternalReference: dto.CustomerExternalReference,
      customerCode: dto.CustomerCode,
      shipToReference: dto.ShipToReference,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      priority: dto.Priority,
      cutoffAt: dto.CutoffAt,
      documentStatus: dto.DocumentStatus,
      validationErrors: dto.ValidationErrors,
      coreFlowInstanceId: dto.CoreFlowInstanceId,
      outboxMessageId: dto.OutboxMessageId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs,
      isDuplicate: dto.IsDuplicate,
      lines: dto.Lines.map((line) => OutboundMapper.toLine(line)),
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  }

  static toPaged(dto: PagedOutboundOrderDto): PaginatedResponse<OutboundOrder> {
    return {
      items: dto.Items.map((item) => OutboundMapper.toOrder(item)),
      page: dto.Meta?.Page ?? dto.Page ?? 1,
      pageSize: dto.Meta?.PageSize ?? dto.PageSize ?? 50,
      totalItems: dto.Meta?.TotalItems ?? dto.TotalItems ?? dto.Items.length,
      totalPages: dto.Meta?.TotalPages ?? dto.TotalPages ?? 1,
    };
  }

  static toAllocationLine(dto: AllocationLineDto): AllocationLine {
    return {
      id: dto.Id,
      outboundOrderLineId: dto.OutboundOrderLineId,
      lineNumber: dto.LineNumber,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      orderedQuantity: dto.OrderedQuantity,
      allocatedQuantity: dto.AllocatedQuantity,
      backorderedQuantity: dto.BackorderedQuantity,
      sourceBalanceId: dto.SourceBalanceId,
      sourceDimensionId: dto.SourceDimensionId,
      sourceLocationId: dto.SourceLocationId,
      inventoryStatusCode: dto.InventoryStatusCode,
      lotNumber: dto.LotNumber,
      serialNumber: dto.SerialNumber,
      expiryDate: dto.ExpiryDate,
      status: dto.Status,
      shortageReason: dto.ShortageReason,
    };
  }

  static toAllocation(dto: AllocationDto): Allocation {
    return {
      id: dto.Id,
      allocationNumber: dto.AllocationNumber,
      outboundOrderId: dto.OutboundOrderId,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      policy: dto.Policy,
      status: dto.Status,
      totalOrderedQuantity: dto.TotalOrderedQuantity,
      totalAllocatedQuantity: dto.TotalAllocatedQuantity,
      totalBackorderedQuantity: dto.TotalBackorderedQuantity,
      shortageReason: dto.ShortageReason,
      outboxMessageId: dto.OutboxMessageId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs,
      isDuplicate: dto.IsDuplicate,
      lines: dto.Lines.map((line) => OutboundMapper.toAllocationLine(line)),
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  }

  static toPagedAllocations(dto: PagedAllocationDto): PaginatedResponse<Allocation> {
    return {
      items: dto.Items.map((item) => OutboundMapper.toAllocation(item)),
      page: dto.Meta?.Page ?? dto.Page ?? 1,
      pageSize: dto.Meta?.PageSize ?? dto.PageSize ?? 50,
      totalItems: dto.Meta?.TotalItems ?? dto.TotalItems ?? dto.Items.length,
      totalPages: dto.Meta?.TotalPages ?? dto.TotalPages ?? 1,
    };
  }

  static toPickTask(dto: PickTaskDto): PickTask {
    return {
      id: dto.Id,
      pickReleaseId: dto.PickReleaseId,
      outboundOrderId: dto.OutboundOrderId,
      allocationId: dto.AllocationId,
      allocationLineId: dto.AllocationLineId,
      outboundOrderLineId: dto.OutboundOrderLineId,
      taskNumber: dto.TaskNumber,
      status: dto.Status,
      sequence: dto.Sequence,
      batchNumber: dto.BatchNumber,
      sourceBalanceId: dto.SourceBalanceId,
      sourceDimensionId: dto.SourceDimensionId,
      sourceLocationId: dto.SourceLocationId,
      targetLocationId: dto.TargetLocationId,
      targetReference: dto.TargetReference,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      quantity: dto.Quantity,
      inventoryStatusCode: dto.InventoryStatusCode,
      lotNumber: dto.LotNumber,
      serialNumber: dto.SerialNumber,
      expiryDate: dto.ExpiryDate,
      createdAt: dto.CreatedAt,
    };
  }

  static toPickRelease(dto: PickReleaseDto): PickRelease {
    return {
      id: dto.Id,
      releaseNumber: dto.ReleaseNumber,
      outboundOrderId: dto.OutboundOrderId,
      allocationId: dto.AllocationId,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      releaseMode: dto.ReleaseMode,
      batchSize: dto.BatchSize,
      status: dto.Status,
      blockReason: dto.BlockReason,
      totalTaskCount: dto.TotalTaskCount,
      totalReleasedQuantity: dto.TotalReleasedQuantity,
      outboxMessageId: dto.OutboxMessageId,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs,
      isDuplicate: dto.IsDuplicate,
      tasks: dto.Tasks.map((task) => OutboundMapper.toPickTask(task)),
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  }

  static toPagedPickReleases(dto: PagedPickReleaseDto): PaginatedResponse<PickRelease> {
    return {
      items: dto.Items.map((item) => OutboundMapper.toPickRelease(item)),
      page: dto.Meta?.Page ?? dto.Page ?? 1,
      pageSize: dto.Meta?.PageSize ?? dto.PageSize ?? 50,
      totalItems: dto.Meta?.TotalItems ?? dto.TotalItems ?? dto.Items.length,
      totalPages: dto.Meta?.TotalPages ?? dto.TotalPages ?? 1,
    };
  }

  static toImportRequest(input: ImportOutboundOrderInput) {
    return removeEmpty({
      SourceSystem: input.sourceSystem,
      SourceReference: input.sourceReference,
      CustomerId: input.customerId,
      CustomerSourceSystem: input.customerSourceSystem,
      CustomerExternalReference: input.customerExternalReference,
      ShipToReference: input.shipToReference,
      OwnerId: input.ownerId,
      WarehouseId: input.warehouseId,
      Priority: input.priority,
      CutoffAt: input.cutoffAt,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
      Lines: input.lines.map((line) =>
        removeEmpty({
          LineNumber: line.lineNumber,
          SkuId: line.skuId,
          UomId: line.uomId,
          OrderedQuantity: line.orderedQuantity,
          ExternalLineReference: line.externalLineReference,
        }),
      ),
    });
  }

  static toReasonRequest(input: ReasonOutboundOrderInput) {
    return removeEmpty({
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toAllocateRequest(input: AllocateOutboundOrderInput) {
    return removeEmpty({
      Policy: input.policy,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toReleaseRequest(input: ReleaseOutboundOrderInput) {
    return removeEmpty({
      ReleaseMode: input.releaseMode,
      BatchSize: input.batchSize,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }
}
