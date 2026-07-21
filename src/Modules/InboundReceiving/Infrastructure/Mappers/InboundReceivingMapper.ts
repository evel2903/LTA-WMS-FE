import type {
  InboundDiscrepancy,
  InboundLpn,
  InboundOperationalState,
  InboundPutawayRelease,
  QcResult,
  QcTask,
  Receipt,
  ReceiptLine,
  ReceiptOperationalState,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/InboundReceiving/Domain/Types/Receipt';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  CreateManualReceiptInput,
  EvaluateQcTaskInput,
  RecordQcResultInput,
  ReleaseInboundToPutawayInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/InboundReceiving/Domain/Types/ReceiptQuery';
import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  CaptureInboundDiscrepancyRequestDto,
  ConfirmInboundLpnRequestDto,
  ConfirmReceiptLineRequestDto,
  CreateManualReceiptRequestDto,
  EvaluateQcTaskRequestDto,
  InboundDiscrepancyDto,
  InboundLpnDto,
  InboundOperationalStateDto,
  InboundPutawayReleaseDto,
  QcResultDto,
  QcTaskDto,
  PagedReceiptDto,
  ReceiptDto,
  RecordQcResultRequestDto,
  ReceiptOperationalStateDto,
  ReceiptLineDto,
  ReceivingReadinessDto,
  ReceivingSessionDto,
  ReleaseInboundToPutawayRequestDto,
  StartReceivingSessionRequestDto,
  ValidateReceivingReadinessRequestDto,
} from '@modules/InboundReceiving/Infrastructure/Dtos/InboundReceivingDtos';

function removeEmpty<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>;
}

export const InboundReceivingMapper = {
  toReceipt(dto: ReceiptDto): Receipt {
    return {
      id: dto.Id,
      inboundPlanId: dto.InboundPlanId,
      receiptNumber: dto.ReceiptNumber,
      businessReference: dto.BusinessReference,
      ownerId: dto.OwnerId,
      ownerCode: dto.OwnerCode,
      warehouseId: dto.WarehouseId,
      warehouseCode: dto.WarehouseCode,
      warehouseProfileId: dto.WarehouseProfileId,
      supplierId: dto.SupplierId,
      supplierCode: dto.SupplierCode ?? null,
      supplierName: dto.SupplierName ?? null,
      status: dto.Status,
      coreFlowInstanceId: dto.CoreFlowInstanceId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toPagedReceipts(dto: PagedReceiptDto): PaginatedResponse<Receipt> {
    return {
      items: (dto.Items ?? []).map((item) => InboundReceivingMapper.toReceipt(item)),
      page: dto.Meta.Page,
      pageSize: dto.Meta.PageSize,
      totalItems: dto.Meta.TotalItems,
      totalPages: dto.Meta.TotalPages,
    };
  },

  toCreateManualReceiptRequest(input: CreateManualReceiptInput): CreateManualReceiptRequestDto {
    return removeEmpty({
      OwnerId: input.ownerId,
      WarehouseId: input.warehouseId,
      WarehouseProfileId: input.warehouseProfileId,
      SupplierId: input.supplierId,
      ReceiptNumber: input.receiptNumber,
      BusinessReference: input.businessReference,
      SessionKey: input.sessionKey,
      DeviceCode: input.deviceCode,
      IdempotencyKey: input.idempotencyKey,
    }) as CreateManualReceiptRequestDto;
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
      receivingSessions: (dto.ReceivingSessions ?? []).map((item) =>
        InboundReceivingMapper.toReceivingSession(item),
      ),
      receiptLines: (dto.ReceiptLines ?? []).map((item) =>
        InboundReceivingMapper.toReceiptLine(item),
      ),
      qcTasks: (dto.QcTasks ?? []).map((item) => InboundReceivingMapper.toQcTask(item)),
      qcResults: (dto.QcResults ?? []).map((item) => InboundReceivingMapper.toQcResult(item)),
      lpns: (dto.Lpns ?? []).map((item) => InboundReceivingMapper.toInboundLpn(item)),
      releases: (dto.Releases ?? []).map((item) =>
        InboundReceivingMapper.toInboundPutawayRelease(item),
      ),
      discrepancies: (dto.Discrepancies ?? []).map((item) =>
        InboundReceivingMapper.toInboundDiscrepancy(item),
      ),
    };
  },

  toReceiptOperationalState(dto: ReceiptOperationalStateDto): ReceiptOperationalState {
    return {
      receiptId: dto.ReceiptId,
      inboundPlanId: dto.InboundPlanId,
      receipt: InboundReceivingMapper.toReceipt(dto.Receipt),
      receivingSessions: (dto.ReceivingSessions ?? []).map((item) =>
        InboundReceivingMapper.toReceivingSession(item),
      ),
      receiptLines: (dto.ReceiptLines ?? []).map((item) =>
        InboundReceivingMapper.toReceiptLine(item),
      ),
      qcTasks: (dto.QcTasks ?? []).map((item) => InboundReceivingMapper.toQcTask(item)),
      qcResults: (dto.QcResults ?? []).map((item) => InboundReceivingMapper.toQcResult(item)),
      lpns: (dto.Lpns ?? []).map((item) => InboundReceivingMapper.toInboundLpn(item)),
      releases: (dto.Releases ?? []).map((item) =>
        InboundReceivingMapper.toInboundPutawayRelease(item),
      ),
      discrepancies: (dto.Discrepancies ?? []).map((item) =>
        InboundReceivingMapper.toInboundDiscrepancy(item),
      ),
    };
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
      ExpectedQuantity: input.expectedQuantity,
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
