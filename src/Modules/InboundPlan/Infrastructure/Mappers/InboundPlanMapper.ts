import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InboundLineImportPreview,
  InboundPlan,
} from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type {
  CreateInboundPlanInput,
  RecordGateInInput,
  UpdateInboundPlanInput,
} from '@modules/InboundPlan/Domain/Types/InboundPlanQuery';
import type {
  CreateInboundPlanRequestDto,
  InboundLineImportPreviewDto,
  InboundPlanDto,
  PagedInboundPlanDto,
  RecordGateInRequestDto,
  UpdateInboundPlanRequestDto,
} from '@modules/InboundPlan/Infrastructure/Dtos/InboundPlanDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>;
}

export const InboundPlanMapper = {
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
      items: items.map((item) => InboundPlanMapper.toInboundPlan(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toLineImportPreview(dto: InboundLineImportPreviewDto): InboundLineImportPreview {
    return {
      fileName: dto.FileName,
      rows: (dto.Rows ?? []).map((row) => ({
        rowNumber: row.RowNumber,
        skuCode: row.SkuCode,
        uomCode: row.UomCode,
        expectedQuantity: row.ExpectedQuantity,
        externalLineReference: row.ExternalLineReference,
        skuId: row.SkuId,
        uomId: row.UomId,
        errors: row.Errors ?? [],
      })),
      summary: {
        total: dto.Summary?.Total ?? 0,
        valid: dto.Summary?.Valid ?? 0,
        invalid: dto.Summary?.Invalid ?? 0,
      },
      headerError: dto.HeaderError ?? null,
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

  toUpdateRequest(input: UpdateInboundPlanInput): UpdateInboundPlanRequestDto {
    return removeEmpty({
      SourceSystem: input.sourceSystem,
      SourceDocumentType: input.sourceDocumentType,
      SourceDocumentNumber: input.sourceDocumentNumber,
      SupplierId: input.supplierId,
      OwnerId: input.ownerId,
      WarehouseId: input.warehouseId,
      WarehouseProfileId: input.warehouseProfileId,
      ExpectedArrivalAt: input.expectedArrivalAt,
      ExpectedUpdatedAt: input.expectedUpdatedAt,
      Lines: input.lines.map((line) =>
        removeEmpty({
          LineNumber: line.lineNumber,
          SkuId: line.skuId,
          UomId: line.uomId,
          ExpectedQuantity: line.expectedQuantity,
          ExternalLineReference: line.externalLineReference,
        }),
      ),
    }) as UpdateInboundPlanRequestDto;
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
};
