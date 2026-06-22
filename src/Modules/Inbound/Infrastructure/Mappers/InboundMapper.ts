import type { PaginatedResponse } from '@shared/Types/Api';
import type { InboundPlan, ReceivingReadiness } from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CreateInboundPlanInput,
  RecordGateInInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';
import type {
  CreateInboundPlanRequestDto,
  InboundPlanDto,
  PagedInboundPlanDto,
  ReceivingReadinessDto,
  RecordGateInRequestDto,
  ValidateReceivingReadinessRequestDto,
} from '@modules/Inbound/Infrastructure/Dtos/InboundDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>;
}

export const InboundMapper = {
  toInboundPlan(dto: InboundPlanDto): InboundPlan {
    return {
      id: dto.Id,
      sourceSystem: dto.SourceSystem,
      sourceDocumentType: dto.SourceDocumentType,
      sourceDocumentNumber: dto.SourceDocumentNumber,
      businessReference: dto.BusinessReference,
      supplierId: dto.SupplierId,
      supplierCode: dto.SupplierCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      warehouseProfileId: dto.WarehouseProfileId,
      expectedArrivalAt: dto.ExpectedArrivalAt,
      status: dto.Status,
      gateInStatus: dto.GateInStatus,
      gateInAt: dto.GateInAt,
      gateReference: dto.GateReference,
      vehicleNumber: dto.VehicleNumber,
      driverName: dto.DriverName,
      evidenceRefs: dto.EvidenceRefs ?? [],
      coreFlowInstanceId: dto.CoreFlowInstanceId,
      isDuplicate: dto.IsDuplicate,
      lines: (dto.Lines ?? []).map((line) => ({
        id: line.Id,
        lineNumber: line.LineNumber,
        skuId: line.SkuId,
        skuCode: line.SkuCode,
        uomId: line.UomId,
        uomCode: line.UomCode,
        expectedQuantity: line.ExpectedQuantity,
        externalLineReference: line.ExternalLineReference,
      })),
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toPaged(dto: PagedInboundPlanDto): PaginatedResponse<InboundPlan> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map((item) => InboundMapper.toInboundPlan(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toReadiness(dto: ReceivingReadinessDto): ReceivingReadiness {
    return {
      allowed: dto.Allowed,
      blocked: dto.Blocked,
      decision: dto.Decision,
      gateInRequired: dto.GateInRequired,
      gateInRecorded: dto.GateInRecorded,
      overrideAccepted: dto.OverrideAccepted,
      reason: dto.Reason,
      inboundPlanId: dto.InboundPlanId,
      businessReference: dto.BusinessReference,
    };
  },

  toCreateRequest(input: CreateInboundPlanInput): CreateInboundPlanRequestDto {
    return removeEmpty({
      SourceSystem: input.sourceSystem,
      SourceDocumentType: input.sourceDocumentType,
      SourceDocumentNumber: input.sourceDocumentNumber,
      SupplierId: input.supplierId,
      OwnerId: input.ownerId,
      WarehouseId: input.warehouseId,
      WarehouseProfileId: input.warehouseProfileId,
      ExpectedArrivalAt: input.expectedArrivalAt,
      Lines: input.lines.map((line) =>
        removeEmpty({
          LineNumber: line.lineNumber,
          SkuId: line.skuId,
          UomId: line.uomId,
          ExpectedQuantity: line.expectedQuantity,
          ExternalLineReference: line.externalLineReference,
        }),
      ),
    }) as CreateInboundPlanRequestDto;
  },

  toGateInRequest(input: RecordGateInInput): RecordGateInRequestDto {
    return removeEmpty({
      GateInAt: input.gateInAt,
      GateReference: input.gateReference,
      VehicleNumber: input.vehicleNumber,
      DriverName: input.driverName,
      EvidenceRefs: input.evidenceRefs,
    }) as RecordGateInRequestDto;
  },

  toReadinessRequest(
    input: ValidateReceivingReadinessInput = {},
  ): ValidateReceivingReadinessRequestDto {
    return removeEmpty({
      AttemptOverride: input.attemptOverride,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
    });
  },
};
