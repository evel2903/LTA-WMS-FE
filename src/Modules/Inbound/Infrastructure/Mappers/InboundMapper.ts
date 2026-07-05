import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  InboundDiscrepancy,
  InboundLineImportPreview,
  InboundLpn,
  InboundOperationalState,
  InboundPlan,
  InboundPutawayRelease,
  QcResult,
  QcTask,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  EvaluateQcTaskInput,
  RecordQcResultInput,
  RecordGateInInput,
  ReleaseInboundToPutawayInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';
import type {
  CaptureInboundDiscrepancyRequestDto,
  ConfirmInboundLpnRequestDto,
  ConfirmReceiptLineRequestDto,
  CreateInboundPlanRequestDto,
  EvaluateQcTaskRequestDto,
  InboundDiscrepancyDto,
  InboundLineImportPreviewDto,
  InboundLpnDto,
  InboundOperationalStateDto,
  InboundPlanDto,
  InboundPutawayReleaseDto,
  PagedInboundPlanDto,
  QcResultDto,
  QcTaskDto,
  RecordQcResultRequestDto,
  ReceiptLineDto,
  ReceivingReadinessDto,
  ReceivingSessionDto,
  RecordGateInRequestDto,
  ReleaseInboundToPutawayRequestDto,
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

  toReadiness(dto: ReceivingReadinessDto): ReceivingReadiness {
    return {
      allowed: dto.Allowed,
      blocked: dto.Blocked,
      decision: dto.Decision,
      gateInRequired: dto.GateInRequired,
      gateInRecorded: dto.GateInRecorded,
      overrideAccepted: dto.OverrideAccepted,
      reason: dto.Reason,
      ruleCode: dto.RuleCode ?? null,
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
      lotNumber: dto.LotNumber,
      expiryDate: dto.ExpiryDate,
      serialNumber: dto.SerialNumber,
      idempotencyKey: dto.IdempotencyKey,
      receivedAt: dto.ReceivedAt,
      receivedBy: dto.ReceivedBy,
      isDuplicate: dto.IsDuplicate,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toInboundLpn(dto: InboundLpnDto): InboundLpn {
    return {
      id: dto.Id,
      receiptId: dto.ReceiptId,
      receiptLineId: dto.ReceiptLineId,
      inboundPlanId: dto.InboundPlanId,
      inboundPlanLineId: dto.InboundPlanLineId,
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
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      idempotencyKey: dto.IdempotencyKey,
      confirmedAt: dto.ConfirmedAt,
      confirmedBy: dto.ConfirmedBy,
      isDuplicate: dto.IsDuplicate,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toInboundPutawayRelease(dto: InboundPutawayReleaseDto): InboundPutawayRelease {
    return {
      id: dto.Id,
      inboundLpnId: dto.InboundLpnId,
      receiptId: dto.ReceiptId,
      receiptLineId: dto.ReceiptLineId,
      inboundPlanId: dto.InboundPlanId,
      inboundPlanLineId: dto.InboundPlanLineId,
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
      currentLocationId: dto.CurrentLocationId,
      currentLocationCode: dto.CurrentLocationCode,
      warehouseProfileId: dto.WarehouseProfileId,
      labelDecision: dto.LabelDecision,
      labelReason: dto.LabelReason,
      matchedPrintJobId: dto.MatchedPrintJobId,
      constraintJson: dto.ConstraintJson,
      outboxMessageId: dto.OutboxMessageId,
      coreFlowMilestoneId: dto.CoreFlowMilestoneId,
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

  toQcTask(dto: QcTaskDto): QcTask {
    return {
      id: dto.Id,
      receiptId: dto.ReceiptId,
      receiptLineId: dto.ReceiptLineId,
      inboundPlanId: dto.InboundPlanId,
      inboundPlanLineId: dto.InboundPlanLineId,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      skuId: dto.SkuId,
      skuCode: dto.SkuCode,
      uomId: dto.UomId,
      uomCode: dto.UomCode,
      actualQuantity: dto.ActualQuantity,
      taskStatus: dto.TaskStatus,
      required: dto.Required,
      triggerReason: dto.TriggerReason,
      triggerPolicyJson: dto.TriggerPolicyJson,
      inventoryStatusCode: dto.InventoryStatusCode,
      targetInventoryStatusCode: dto.TargetInventoryStatusCode,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      idempotencyKey: dto.IdempotencyKey,
      isDuplicate: dto.IsDuplicate,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toQcResult(dto: QcResultDto): QcResult {
    return {
      id: dto.Id,
      qcTaskId: dto.QcTaskId,
      receiptId: dto.ReceiptId,
      receiptLineId: dto.ReceiptLineId,
      inboundPlanId: dto.InboundPlanId,
      inboundPlanLineId: dto.InboundPlanLineId,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      resultStatus: dto.ResultStatus,
      dispositionCode: dto.DispositionCode,
      taskStatus: dto.TaskStatus,
      inspectedQuantity: dto.InspectedQuantity,
      acceptedQuantity: dto.AcceptedQuantity,
      rejectedQuantity: dto.RejectedQuantity,
      acceptedInventoryStatusCode: dto.AcceptedInventoryStatusCode,
      rejectedInventoryStatusCode: dto.RejectedInventoryStatusCode,
      targetInventoryStatusCode: dto.TargetInventoryStatusCode,
      reasonCode: dto.ReasonCode,
      reasonCodeId: dto.ReasonCodeId,
      reasonNote: dto.ReasonNote,
      evidenceRefs: dto.EvidenceRefs ?? [],
      evidenceJson: dto.EvidenceJson,
      idempotencyKey: dto.IdempotencyKey,
      recordedAt: dto.RecordedAt,
      recordedBy: dto.RecordedBy,
      isDuplicate: dto.IsDuplicate,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
    };
  },

  toOperationalState(dto: InboundOperationalStateDto): InboundOperationalState {
    return {
      inboundPlanId: dto.InboundPlanId,
      receivingSessions: (dto.ReceivingSessions ?? []).map((item) => InboundMapper.toReceivingSession(item)),
      receiptLines: (dto.ReceiptLines ?? []).map((item) => InboundMapper.toReceiptLine(item)),
      qcTasks: (dto.QcTasks ?? []).map((item) => InboundMapper.toQcTask(item)),
      qcResults: (dto.QcResults ?? []).map((item) => InboundMapper.toQcResult(item)),
      lpns: (dto.Lpns ?? []).map((item) => InboundMapper.toInboundLpn(item)),
      releases: (dto.Releases ?? []).map((item) => InboundMapper.toInboundPutawayRelease(item)),
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
      LotNumber: input.lotNumber,
      ExpiryDate: input.expiryDate,
      SerialNumber: input.serialNumber,
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

  toConfirmInboundLpnRequest(input: ConfirmInboundLpnInput): ConfirmInboundLpnRequestDto {
    return removeEmpty({
      LpnCode: input.lpnCode,
      SsccCode: input.ssccCode,
      Quantity: input.quantity,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    }) as ConfirmInboundLpnRequestDto;
  },

  toReleaseInboundToPutawayRequest(
    input: ReleaseInboundToPutawayInput,
  ): ReleaseInboundToPutawayRequestDto {
    return removeEmpty({
      CurrentLocationId: input.currentLocationId,
      CurrentLocationCode: input.currentLocationCode,
      RequireLpn: input.requireLpn,
      AttemptLabelOverride: input.attemptLabelOverride,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      IdempotencyKey: input.idempotencyKey,
    }) as ReleaseInboundToPutawayRequestDto;
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

  toEvaluateQcTaskRequest(input: EvaluateQcTaskInput): EvaluateQcTaskRequestDto {
    return removeEmpty({
      ReceiptLineId: input.receiptLineId,
      IdempotencyKey: input.idempotencyKey,
      ForceRequired: input.forceRequired,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
    }) as EvaluateQcTaskRequestDto;
  },

  toRecordQcResultRequest(input: RecordQcResultInput): RecordQcResultRequestDto {
    return removeEmpty({
      IdempotencyKey: input.idempotencyKey,
      ResultStatus: input.resultStatus,
      DispositionCode: input.dispositionCode,
      InspectedQuantity: input.inspectedQuantity,
      AcceptedQuantity: input.acceptedQuantity,
      RejectedQuantity: input.rejectedQuantity,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
      EvidenceJson: input.evidenceJson,
    }) as RecordQcResultRequestDto;
  },
};
