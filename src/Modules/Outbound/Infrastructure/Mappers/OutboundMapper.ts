import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  Allocation,
  AllocationLine,
  OutboundOrder,
  OutboundOrderLine,
} from '@modules/Outbound/Domain/Types/OutboundOrder';
import type {
  AllocateOutboundOrderInput,
  ImportOutboundOrderInput,
  ReasonOutboundOrderInput,
} from '@modules/Outbound/Domain/Types/OutboundOrderQuery';
import type {
  AllocationDto,
  AllocationLineDto,
  OutboundOrderDto,
  OutboundOrderLineDto,
  PagedAllocationDto,
  PagedOutboundOrderDto,
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
}
