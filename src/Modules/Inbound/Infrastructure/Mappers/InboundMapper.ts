import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InboundDiscrepancy,
  InboundPlan,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  RecordGateInInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';
import type {
  CaptureInboundDiscrepancyRequestDto,
  ConfirmReceiptLineRequestDto,
  CreateInboundPlanRequestDto,
  InboundDiscrepancyDto,
  InboundPlanDto,
  PagedInboundPlanDto,
  ReceiptLineDto,
  ReceivingReadinessDto,
  ReceivingSessionDto,
  RecordGateInRequestDto,
  StartReceivingSessionRequestDto,
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

  toReceivingSession(dto: ReceivingSessionDto): ReceivingSession {
    return {
      id: dto.Id,
      inboundPlanId: dto.InboundPlanId,
      receiptId: dto.ReceiptId,
      receiptNumber: dto.ReceiptNumber,
      sessionKey: dto.SessionKey,
      deviceCode: dto.DeviceCode,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      status: dto.Status,
      startedAt: dto.StartedAt,
      closedAt: dto.ClosedAt,
      isDuplicate: dto.IsDuplicate,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      startedBy: dto.StartedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toReceiptLine(dto: ReceiptLineDto): ReceiptLine {
    return {
      id: dto.Id,
      receiptId: dto.ReceiptId,
      inboundPlanId: dto.InboundPlanId,
      inboundPlanLineId: dto.InboundPlanLineId,
      lineNumber: dto.LineNumber,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      expectedQuantity: dto.ExpectedQuantity,
      actualQuantity: dto.ActualQuantity,
      status: dto.Status,
      manualConfirm: dto.ManualConfirm,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      scanEvidenceJson: dto.ScanEvidenceJson,
      discrepancySignals: dto.DiscrepancySignals ?? [],
      idempotencyKey: dto.IdempotencyKey,
      receivedAt: dto.ReceivedAt,
      receivedBy: dto.ReceivedBy,
      isDuplicate: dto.IsDuplicate,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toInboundDiscrepancy(dto: InboundDiscrepancyDto): InboundDiscrepancy {
    return {
      id: dto.Id,
      receiptId: dto.ReceiptId,
      receiptLineId: dto.ReceiptLineId,
      inboundPlanId: dto.InboundPlanId,
      inboundPlanLineId: dto.InboundPlanLineId,
      discrepancyType: dto.DiscrepancyType,
      status: dto.Status,
      toleranceDecision: dto.ToleranceDecision,
      expectedQuantity: dto.ExpectedQuantity,
      actualQuantity: dto.ActualQuantity,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      evidenceJson: dto.EvidenceJson,
      exceptionCaseId: dto.ExceptionCaseId,
      exceptionState: dto.ExceptionState,
      severity: dto.Severity,
      idempotencyKey: dto.IdempotencyKey,
      isDuplicate: dto.IsDuplicate,
      recordedAt: dto.RecordedAt,
      recordedBy: dto.RecordedBy,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
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

  toStartReceivingRequest(input: StartReceivingSessionInput = {}): StartReceivingSessionRequestDto {
    return removeEmpty({
      SessionKey: input.sessionKey,
      DeviceCode: input.deviceCode,
      AttemptOverride: input.attemptOverride,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
    });
  },

  toConfirmReceiptLineRequest(input: ConfirmReceiptLineInput): ConfirmReceiptLineRequestDto {
    return removeEmpty({
      InboundPlanLineId: input.inboundPlanLineId,
      ActualQuantity: input.actualQuantity,
      SkuId: input.skuId,
      UomId: input.uomId,
      ManualConfirm: input.manualConfirm,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      IdempotencyKey: input.idempotencyKey,
      ScanEvidence: input.scanEvidence
        ? removeEmpty({
            RawValue: input.scanEvidence.rawValue,
            ParsedValue: input.scanEvidence.parsedValue,
            ScanEventId: input.scanEvidence.scanEventId,
            ScanType: input.scanEvidence.scanType,
            ScanResult: input.scanEvidence.scanResult,
            ResolvedSkuId: input.scanEvidence.resolvedSkuId,
            ResolvedUomId: input.scanEvidence.resolvedUomId,
            ResolvedPackId: input.scanEvidence.resolvedPackId,
            LotNumber: input.scanEvidence.lotNumber,
            ExpiryDate: input.scanEvidence.expiryDate,
            SerialNumber: input.scanEvidence.serialNumber,
            Lpn: input.scanEvidence.lpn,
          })
        : null,
    }) as ConfirmReceiptLineRequestDto;
  },

  toCaptureDiscrepancyRequest(
    input: CaptureInboundDiscrepancyInput,
  ): CaptureInboundDiscrepancyRequestDto {
    return removeEmpty({
      ReceiptLineId: input.receiptLineId,
      DiscrepancyType: input.discrepancyType,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      EvidenceJson: input.evidenceJson,
      IdempotencyKey: input.idempotencyKey,
    }) as CaptureInboundDiscrepancyRequestDto;
  },
};
