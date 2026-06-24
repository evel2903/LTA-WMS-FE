import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  LabelBlockingValidation,
  PackSession,
  Package,
  PackageContent,
  ReadyForStagingResult,
} from '@modules/Packing/Domain/Types/Packing';
import type {
  ClosePackageInput,
  CreatePackageInput,
  ReadyForStagingInput,
  RecordPackCheckInput,
  StartPackSessionInput,
} from '@modules/Packing/Domain/Types/PackingQuery';
import type {
  ClosePackageRequestDto,
  CreatePackageRequestDto,
  LabelBlockingValidationResultDto,
  PackSessionDto,
  PackageContentDto,
  PackageDto,
  PagedPackageDto,
  ReadyForStagingRequestDto,
  ReadyForStagingResultDto,
  RecordPackCheckRequestDto,
  StartPackSessionRequestDto,
} from '@modules/Packing/Infrastructure/Dtos/PackingDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as T;
}

export class PackingMapper {
  static toSession(dto: PackSessionDto): PackSession {
    return {
      id: dto.Id,
      sessionNumber: dto.SessionNumber,
      pickTaskId: dto.PickTaskId,
      mobileTaskId: dto.MobileTaskId,
      outboundOrderId: dto.OutboundOrderId,
      warehouseProfileId: dto.WarehouseProfileId,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      status: dto.Status,
      checkRequired: dto.CheckRequired,
      checkResult: dto.CheckResult,
      checkExceptionCaseId: dto.CheckExceptionCaseId,
      startedAt: dto.StartedAt,
      startedBy: dto.StartedBy,
      checkedAt: dto.CheckedAt,
      checkedBy: dto.CheckedBy,
    };
  }

  static toContent(dto: PackageContentDto): PackageContent {
    return {
      id: dto.Id,
      packageId: dto.PackageId,
      pickTaskId: dto.PickTaskId,
      outboundOrderLineId: dto.OutboundOrderLineId,
      sourceBalanceId: dto.SourceBalanceId,
      sourceDimensionId: dto.SourceDimensionId,
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

  static toPackage(dto: PackageDto): Package {
    return {
      id: dto.Id,
      packageCode: dto.PackageCode,
      packSessionId: dto.PackSessionId,
      pickTaskId: dto.PickTaskId,
      outboundOrderId: dto.OutboundOrderId,
      warehouseProfileId: dto.WarehouseProfileId,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      status: dto.Status,
      checkRequired: dto.CheckRequired,
      checkResult: dto.CheckResult,
      cartonType: dto.CartonType,
      weight: dto.Weight,
      length: dto.Length,
      width: dto.Width,
      height: dto.Height,
      labelBlockingDecision: dto.LabelBlockingDecision,
      labelPrintJobId: dto.LabelPrintJobId,
      labelPrintJobCode: dto.LabelPrintJobCode,
      closedAt: dto.ClosedAt,
      closedBy: dto.ClosedBy,
      readyForStagingAt: dto.ReadyForStagingAt,
      readyForStagingBy: dto.ReadyForStagingBy,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      contents: dto.Contents.map((item) => PackingMapper.toContent(item)),
    };
  }

  static toPaged(dto: PagedPackageDto): PaginatedResponse<Package> {
    return {
      items: dto.Items.map((item) => PackingMapper.toPackage(item)),
      page: dto.Meta?.Page ?? dto.Page ?? 1,
      pageSize: dto.Meta?.PageSize ?? dto.PageSize ?? 50,
      totalItems: dto.Meta?.TotalItems ?? dto.TotalItems ?? dto.Items.length,
      totalPages: dto.Meta?.TotalPages ?? dto.TotalPages ?? 1,
    };
  }

  static toLabelValidation(dto: LabelBlockingValidationResultDto): LabelBlockingValidation {
    return {
      allowed: dto.Allowed,
      blocked: dto.Blocked,
      decision: dto.Decision,
      requiredLabelType: dto.RequiredLabelType,
      policyMode: dto.PolicyMode,
      overrideAllowed: dto.OverrideAllowed,
      overrideAccepted: dto.OverrideAccepted,
      reason: dto.Reason,
      matchedPrintJobId: dto.MatchedPrintJobId,
      matchedPrintJobCode: dto.MatchedPrintJobCode,
      validationDetails: dto.ValidationDetails,
    };
  }

  static toReadyResult(dto: ReadyForStagingResultDto): ReadyForStagingResult {
    return {
      package: PackingMapper.toPackage(dto.Package),
      labelValidation: PackingMapper.toLabelValidation(dto.LabelValidation),
      isDuplicate: dto.IsDuplicate,
    };
  }

  static toStartSessionRequest(input: StartPackSessionInput): StartPackSessionRequestDto {
    return removeEmpty({
      PickTaskId: input.pickTaskId,
      MobileTaskId: input.mobileTaskId,
      WarehouseProfileId: input.warehouseProfileId,
      CheckRequired: input.checkRequired,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toRecordCheckRequest(input: RecordPackCheckInput): RecordPackCheckRequestDto {
    return removeEmpty({
      CheckResult: input.checkResult,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      ObservedQuantity: input.observedQuantity,
      ObservedSkuId: input.observedSkuId,
      ObservedSkuCode: input.observedSkuCode,
      Weight: input.weight,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toCreatePackageRequest(input: CreatePackageInput): CreatePackageRequestDto {
    return removeEmpty({
      PackSessionId: input.packSessionId,
      CartonType: input.cartonType,
      Weight: input.weight,
      Length: input.length,
      Width: input.width,
      Height: input.height,
      Contents: input.contents?.map((item) =>
        removeEmpty({
          PickTaskId: item.pickTaskId,
          Quantity: item.quantity,
        }),
      ),
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toClosePackageRequest(input: ClosePackageInput): ClosePackageRequestDto {
    return removeEmpty({
      CartonType: input.cartonType,
      Weight: input.weight,
      Length: input.length,
      Width: input.width,
      Height: input.height,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    });
  }

  static toReadyForStagingRequest(input: ReadyForStagingInput): ReadyForStagingRequestDto {
    return removeEmpty({
      AttemptOverride: input.attemptOverride,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      LabelType: input.labelType,
      IdempotencyKey: input.idempotencyKey,
    });
  }
}
