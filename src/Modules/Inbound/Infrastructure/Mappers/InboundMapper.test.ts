import { describe, expect, it } from 'vitest';

import type {
  InboundDiscrepancyDto,
  InboundLpnDto,
  InboundPlanDto,
  InboundPutawayReleaseDto,
  PagedInboundPlanDto,
  QcResultDto,
  QcTaskDto,
  ReceiptLineDto,
  ReceivingReadinessDto,
  ReceivingSessionDto,
} from '@modules/Inbound/Infrastructure/Dtos/InboundDtos';
import { InboundMapper } from '@modules/Inbound/Infrastructure/Mappers/InboundMapper';

const inboundPlanDto: InboundPlanDto = {
  Id: 'inbound-plan-1',
  SourceSystem: 'ERP',
  SourceDocumentType: 'ASN',
  SourceDocumentNumber: 'ASN-10001',
  BusinessReference: 'ERP:ASN:ASN-10001',
  SupplierId: 'supplier-1',
  SupplierCode: 'SUP-A',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  WarehouseProfileId: 'profile-1',
  ExpectedArrivalAt: '2026-06-22T08:00:00.000Z',
  Status: 'Planned',
  GateInStatus: 'NotRecorded',
  GateInAt: null,
  GateReference: null,
  VehicleNumber: null,
  DriverName: null,
  EvidenceRefs: [],
  CoreFlowInstanceId: 'core-flow-1',
  IsDuplicate: false,
  Lines: [
    {
      Id: 'line-1',
      LineNumber: 1,
      SkuId: 'sku-1',
      SkuCode: 'SKU-A',
      UomId: 'uom-1',
      UomCode: 'EA',
      ExpectedQuantity: 12,
      ExternalLineReference: '10',
    },
  ],
  CreatedAt: '2026-06-22T08:00:00.000Z',
  UpdatedAt: '2026-06-22T08:00:00.000Z',
  CreatedBy: 'admin',
  UpdatedBy: null,
};

const receivingSessionDto: ReceivingSessionDto = {
  Id: 'session-1',
  InboundPlanId: 'inbound-plan-1',
  ReceiptId: 'receipt-1',
  ReceiptNumber: 'ASN-10001-RCPT',
  SessionKey: 'dock-1:user-1',
  DeviceCode: 'rf-01',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  Status: 'Open',
  StartedAt: '2026-06-22T09:05:00.000Z',
  ClosedAt: null,
  IsDuplicate: false,
  CreatedAt: '2026-06-22T09:05:00.000Z',
  UpdatedAt: '2026-06-22T09:05:00.000Z',
  StartedBy: 'user-1',
  UpdatedBy: null,
};

const receiptLineDto: ReceiptLineDto = {
  Id: 'receipt-line-1',
  ReceiptId: 'receipt-1',
  InboundPlanId: 'inbound-plan-1',
  InboundPlanLineId: 'line-1',
  LineNumber: 1,
  SkuId: 'sku-1',
  SkuCode: 'SKU-A',
  UomId: 'uom-1',
  UomCode: 'EA',
  ExpectedQuantity: 12,
  ActualQuantity: 10,
  Status: 'Discrepancy',
  ManualConfirm: true,
  ReasonCode: 'RC-V1-MANUAL-SCAN',
  ReasonCodeId: 'reason-1',
  ReasonNote: 'Barcode unreadable',
  ScanEvidenceJson: null,
  DiscrepancySignals: ['QuantityVariance'],
  IdempotencyKey: 'receipt-line-1',
  ReceivedAt: '2026-06-22T09:10:00.000Z',
  ReceivedBy: 'user-1',
  IsDuplicate: false,
  CreatedAt: '2026-06-22T09:10:00.000Z',
  UpdatedAt: '2026-06-22T09:10:00.000Z',
};

const inboundLpnDto: InboundLpnDto = {
  Id: 'lpn-1',
  ReceiptId: 'receipt-1',
  ReceiptLineId: 'receipt-line-1',
  InboundPlanId: 'inbound-plan-1',
  InboundPlanLineId: 'line-1',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  SkuId: 'sku-1',
  SkuCode: 'SKU-A',
  UomId: 'uom-1',
  UomCode: 'EA',
  Quantity: 12,
  LpnCode: 'LPN-0001',
  SsccCode: '003456789012345678',
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  IdempotencyKey: 'lpn-1',
  ConfirmedAt: '2026-06-22T09:16:00.000Z',
  ConfirmedBy: 'user-1',
  IsDuplicate: false,
  CreatedAt: '2026-06-22T09:16:00.000Z',
  UpdatedAt: '2026-06-22T09:16:00.000Z',
};

const inboundPutawayReleaseDto: InboundPutawayReleaseDto = {
  Id: 'release-1',
  InboundLpnId: 'lpn-1',
  ReceiptId: 'receipt-1',
  ReceiptLineId: 'receipt-line-1',
  InboundPlanId: 'inbound-plan-1',
  InboundPlanLineId: 'line-1',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  SkuId: 'sku-1',
  SkuCode: 'SKU-A',
  UomId: 'uom-1',
  UomCode: 'EA',
  Quantity: 12,
  LpnCode: 'LPN-0001',
  SsccCode: '003456789012345678',
  InventoryStatusCode: 'READY_FOR_PUTAWAY',
  CurrentLocationId: null,
  CurrentLocationCode: 'RCV-01',
  WarehouseProfileId: 'profile-1',
  LabelDecision: 'NotRequired',
  LabelReason: 'No label blocking rule required for this action.',
  MatchedPrintJobId: null,
  ConstraintJson: { ReadinessSourceType: 'QcTask' },
  OutboxMessageId: 'outbox-1',
  CoreFlowMilestoneId: 'milestone-1',
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  IdempotencyKey: 'release-1',
  ReleasedAt: '2026-06-22T09:25:00.000Z',
  ReleasedBy: 'user-1',
  IsDuplicate: false,
  CreatedAt: '2026-06-22T09:25:00.000Z',
  UpdatedAt: '2026-06-22T09:25:00.000Z',
};

const inboundDiscrepancyDto: InboundDiscrepancyDto = {
  Id: 'discrepancy-1',
  ReceiptId: 'receipt-1',
  ReceiptLineId: 'receipt-line-1',
  InboundPlanId: 'inbound-plan-1',
  InboundPlanLineId: 'line-1',
  DiscrepancyType: 'QuantityVariance',
  Status: 'PendingApproval',
  ToleranceDecision: 'OverTolerancePendingApproval',
  ExpectedQuantity: 12,
  ActualQuantity: 14,
  ReasonCode: 'RC-V1-DISCREPANCY',
  ReasonCodeId: 'reason-1',
  ReasonNote: 'Over ASN quantity',
  EvidenceRefs: ['photo://dock/over-qty-1'],
  EvidenceJson: { station: 'dock-1' },
  ExceptionCaseId: 'exception-1',
  ExceptionState: 'DETECTED',
  Severity: 'MEDIUM',
  IdempotencyKey: 'discrepancy-1',
  RecordedAt: '2026-06-22T09:12:00.000Z',
  RecordedBy: 'user-1',
  IsDuplicate: false,
  CreatedAt: '2026-06-22T09:12:00.000Z',
  UpdatedAt: '2026-06-22T09:12:00.000Z',
};

const qcTaskDto: QcTaskDto = {
  Id: 'qc-task-1',
  ReceiptId: 'receipt-1',
  ReceiptLineId: 'receipt-line-1',
  InboundPlanId: 'inbound-plan-1',
  InboundPlanLineId: 'line-1',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  SkuId: 'sku-1',
  SkuCode: 'SKU-A',
  UomId: 'uom-1',
  UomCode: 'EA',
  ActualQuantity: 12,
  TaskStatus: 'PendingQc',
  Required: true,
  TriggerReason: 'WarehouseProfile',
  TriggerPolicyJson: { InboundQcRequired: true },
  InventoryStatusCode: 'PENDING_QC',
  TargetInventoryStatusCode: null,
  ReasonCode: 'RC-V1-DISCREPANCY',
  ReasonCodeId: 'reason-1',
  ReasonNote: 'QC required by profile',
  EvidenceRefs: ['photo://dock/qc-trigger-1'],
  IdempotencyKey: 'qc-task-1',
  IsDuplicate: false,
  CreatedBy: 'user-1',
  UpdatedBy: 'user-1',
  CreatedAt: '2026-06-22T09:15:00.000Z',
  UpdatedAt: '2026-06-22T09:15:00.000Z',
};

const qcResultDto: QcResultDto = {
  Id: 'qc-result-1',
  QcTaskId: 'qc-task-1',
  ReceiptId: 'receipt-1',
  ReceiptLineId: 'receipt-line-1',
  InboundPlanId: 'inbound-plan-1',
  InboundPlanLineId: 'line-1',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  ResultStatus: 'Failed',
  DispositionCode: 'Quarantine',
  TaskStatus: 'Dispositioned',
  InspectedQuantity: 12,
  AcceptedQuantity: 8,
  RejectedQuantity: 4,
  AcceptedInventoryStatusCode: 'READY_FOR_PUTAWAY',
  RejectedInventoryStatusCode: 'QUARANTINE',
  TargetInventoryStatusCode: 'QUARANTINE',
  ReasonCode: 'RC-V1-DISCREPANCY',
  ReasonCodeId: 'reason-1',
  ReasonNote: 'Four units damaged',
  EvidenceRefs: ['photo://qc/damaged-4'],
  EvidenceJson: { rejectedQuantity: 4 },
  IdempotencyKey: 'qc-result-1',
  RecordedAt: '2026-06-22T09:20:00.000Z',
  RecordedBy: 'user-1',
  IsDuplicate: false,
  CreatedAt: '2026-06-22T09:20:00.000Z',
  UpdatedAt: '2026-06-22T09:20:00.000Z',
};

describe('InboundMapper', () => {
  it('maps PascalCase inbound plan DTOs into camelCase domain objects', () => {
    expect(InboundMapper.toInboundPlan(inboundPlanDto)).toMatchObject({
      id: 'inbound-plan-1',
      sourceSystem: 'ERP',
      sourceDocumentType: 'ASN',
      sourceDocumentNumber: 'ASN-10001',
      businessReference: 'ERP:ASN:ASN-10001',
      supplierCode: 'SUP-A',
      ownerCode: 'OWN-A',
      warehouseCode: 'WT-01',
      status: 'Planned',
      gateInStatus: 'NotRecorded',
      lines: [expect.objectContaining({ lineNumber: 1, skuCode: 'SKU-A', expectedQuantity: 12 })],
    });
  });

  it('maps paged envelopes and tolerates null list payloads', () => {
    const page: PagedInboundPlanDto = {
      Items: [inboundPlanDto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    };

    expect(InboundMapper.toPaged(page)).toEqual({
      items: [expect.objectContaining({ id: 'inbound-plan-1' })],
      page: 1,
      pageSize: 50,
      totalItems: 1,
      totalPages: 1,
    });
    expect(InboundMapper.toPaged(null as unknown as PagedInboundPlanDto)).toEqual({
      items: [],
      page: 1,
      pageSize: 0,
      totalItems: 0,
      totalPages: 0,
    });
  });

  it('builds PascalCase create, gate-in and readiness payloads', () => {
    expect(
      InboundMapper.toCreateRequest({
        sourceSystem: 'ERP',
        sourceDocumentType: 'ASN',
        sourceDocumentNumber: 'ASN-10001',
        supplierId: 'supplier-1',
        ownerId: 'owner-1',
        warehouseId: 'warehouse-1',
        warehouseProfileId: 'profile-1',
        expectedArrivalAt: '2026-06-22T08:00:00.000Z',
        lines: [{ lineNumber: 1, skuId: 'sku-1', uomId: 'uom-1', expectedQuantity: 12 }],
      }),
    ).toEqual({
      SourceSystem: 'ERP',
      SourceDocumentType: 'ASN',
      SourceDocumentNumber: 'ASN-10001',
      SupplierId: 'supplier-1',
      OwnerId: 'owner-1',
      WarehouseId: 'warehouse-1',
      WarehouseProfileId: 'profile-1',
      ExpectedArrivalAt: '2026-06-22T08:00:00.000Z',
      Lines: [{ LineNumber: 1, SkuId: 'sku-1', UomId: 'uom-1', ExpectedQuantity: 12 }],
    });

    expect(
      InboundMapper.toGateInRequest({
        gateInAt: '2026-06-22T09:00:00.000Z',
        gateReference: 'GATE-A-001',
        vehicleNumber: '51C-12345',
        evidenceRefs: ['photo://gate-a-001'],
      }),
    ).toEqual({
      GateInAt: '2026-06-22T09:00:00.000Z',
      GateReference: 'GATE-A-001',
      VehicleNumber: '51C-12345',
      EvidenceRefs: ['photo://gate-a-001'],
    });

    expect(
      InboundMapper.toReadinessRequest({ attemptOverride: true, reasonCode: 'RC-V1-HANDOFF' }),
    ).toEqual({
      AttemptOverride: true,
      ReasonCode: 'RC-V1-HANDOFF',
    });
  });

  it('maps an ApprovalRequired readiness decision and its ruleCode into the domain object (IFB-05)', () => {
    const approvalRequiredDto: ReceivingReadinessDto = {
      Allowed: false,
      Blocked: true,
      Decision: 'ApprovalRequired',
      GateInRequired: true,
      GateInRecorded: false,
      OverrideAccepted: false,
      Reason: 'Gate-in requires approval before receiving.',
      RuleCode: 'RULE-IN-GATE-01',
      InboundPlanId: 'inbound-plan-1',
      BusinessReference: 'ERP:ASN:ASN-10001',
    };

    expect(InboundMapper.toReadiness(approvalRequiredDto)).toEqual({
      allowed: false,
      blocked: true,
      decision: 'ApprovalRequired',
      gateInRequired: true,
      gateInRecorded: false,
      overrideAccepted: false,
      reason: 'Gate-in requires approval before receiving.',
      ruleCode: 'RULE-IN-GATE-01',
      inboundPlanId: 'inbound-plan-1',
      businessReference: 'ERP:ASN:ASN-10001',
    });
  });

  it('defaults ruleCode to null when the backend omits it', () => {
    const blockedDto: ReceivingReadinessDto = {
      Allowed: false,
      Blocked: true,
      Decision: 'Blocked',
      GateInRequired: true,
      GateInRecorded: false,
      OverrideAccepted: false,
      Reason: 'Gate-in is required before receiving.',
    };

    expect(InboundMapper.toReadiness(blockedDto).ruleCode).toBeNull();
  });

  it('maps receiving session and receipt line DTOs into domain objects', () => {
    expect(InboundMapper.toReceivingSession(receivingSessionDto)).toMatchObject({
      id: 'session-1',
      receiptId: 'receipt-1',
      receiptNumber: 'ASN-10001-RCPT',
      status: 'Open',
    });
    expect(InboundMapper.toReceiptLine(receiptLineDto)).toMatchObject({
      id: 'receipt-line-1',
      receiptId: 'receipt-1',
      actualQuantity: 10,
      status: 'Discrepancy',
      discrepancySignals: ['QuantityVariance'],
      manualConfirm: true,
    });
  });

  it('maps inbound discrepancy DTOs into domain objects', () => {
    expect(InboundMapper.toInboundDiscrepancy(inboundDiscrepancyDto)).toMatchObject({
      id: 'discrepancy-1',
      receiptLineId: 'receipt-line-1',
      discrepancyType: 'QuantityVariance',
      status: 'PendingApproval',
      toleranceDecision: 'OverTolerancePendingApproval',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['photo://dock/over-qty-1'],
      exceptionCaseId: 'exception-1',
      exceptionState: 'DETECTED',
      severity: 'MEDIUM',
      recordedBy: 'user-1',
    });
  });

  it('maps inbound LPN and putaway release DTOs into domain objects', () => {
    expect(InboundMapper.toInboundLpn(inboundLpnDto)).toMatchObject({
      id: 'lpn-1',
      receiptLineId: 'receipt-line-1',
      lpnCode: 'LPN-0001',
      ssccCode: '003456789012345678',
      quantity: 12,
      isDuplicate: false,
    });
    expect(InboundMapper.toInboundPutawayRelease(inboundPutawayReleaseDto)).toMatchObject({
      id: 'release-1',
      inboundLpnId: 'lpn-1',
      receiptLineId: 'receipt-line-1',
      lpnCode: 'LPN-0001',
      inventoryStatusCode: 'READY_FOR_PUTAWAY',
      currentLocationCode: 'RCV-01',
      labelDecision: 'NotRequired',
    });
  });

  it('maps QC task and result DTOs into domain objects', () => {
    expect(InboundMapper.toQcTask(qcTaskDto)).toMatchObject({
      id: 'qc-task-1',
      receiptLineId: 'receipt-line-1',
      taskStatus: 'PendingQc',
      required: true,
      triggerReason: 'WarehouseProfile',
      inventoryStatusCode: 'PENDING_QC',
    });
    expect(InboundMapper.toQcTask(qcTaskDto).inventoryStatusCode).not.toBe('AVAILABLE');
    expect(InboundMapper.toQcResult(qcResultDto)).toMatchObject({
      id: 'qc-result-1',
      qcTaskId: 'qc-task-1',
      resultStatus: 'Failed',
      dispositionCode: 'Quarantine',
      taskStatus: 'Dispositioned',
      acceptedInventoryStatusCode: 'READY_FOR_PUTAWAY',
      rejectedInventoryStatusCode: 'QUARANTINE',
      targetInventoryStatusCode: 'QUARANTINE',
    });
  });

  it('builds PascalCase receiving session and receipt line payloads', () => {
    expect(
      InboundMapper.toStartReceivingRequest({
        sessionKey: 'dock-1:user-1',
        deviceCode: 'rf-01',
      }),
    ).toEqual({
      SessionKey: 'dock-1:user-1',
      DeviceCode: 'rf-01',
    });

    expect(
      InboundMapper.toConfirmReceiptLineRequest({
        inboundPlanLineId: 'line-1',
        actualQuantity: 12,
        idempotencyKey: 'receipt-line-1',
        scanEvidence: {
          rawValue: 'barcode-1',
          scanResult: 'Accepted',
          resolvedSkuId: 'sku-1',
          resolvedUomId: 'uom-1',
        },
      }),
    ).toEqual({
      InboundPlanLineId: 'line-1',
      ActualQuantity: 12,
      IdempotencyKey: 'receipt-line-1',
      ScanEvidence: {
        RawValue: 'barcode-1',
        ScanResult: 'Accepted',
        ResolvedSkuId: 'sku-1',
        ResolvedUomId: 'uom-1',
      },
    });

    expect(
      InboundMapper.toCaptureDiscrepancyRequest({
        receiptLineId: 'receipt-line-1',
        discrepancyType: 'QuantityVariance',
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: 'Over ASN quantity',
        evidenceRefs: ['photo://dock/over-qty-1'],
        evidenceJson: { station: 'dock-1' },
        idempotencyKey: 'discrepancy-1',
      }),
    ).toEqual({
      ReceiptLineId: 'receipt-line-1',
      DiscrepancyType: 'QuantityVariance',
      ReasonCode: 'RC-V1-DISCREPANCY',
      ReasonNote: 'Over ASN quantity',
      EvidenceRefs: ['photo://dock/over-qty-1'],
      EvidenceJson: { station: 'dock-1' },
      IdempotencyKey: 'discrepancy-1',
    });
    expect(
      InboundMapper.toConfirmInboundLpnRequest({
        lpnCode: 'LPN-0001',
        ssccCode: '003456789012345678',
        idempotencyKey: 'lpn-1',
      }),
    ).toEqual({
      LpnCode: 'LPN-0001',
      SsccCode: '003456789012345678',
      IdempotencyKey: 'lpn-1',
    });
    expect(
      InboundMapper.toReleaseInboundToPutawayRequest({
        currentLocationCode: 'RCV-01',
        requireLpn: true,
        attemptLabelOverride: true,
        reasonCode: 'RC-V1-LABEL-OVERRIDE',
        evidenceRefs: ['photo://label/override-1'],
        idempotencyKey: 'release-1',
      }),
    ).toEqual({
      CurrentLocationCode: 'RCV-01',
      RequireLpn: true,
      AttemptLabelOverride: true,
      ReasonCode: 'RC-V1-LABEL-OVERRIDE',
      EvidenceRefs: ['photo://label/override-1'],
      IdempotencyKey: 'release-1',
    });
    expect(
      InboundMapper.toEvaluateQcTaskRequest({
        receiptLineId: 'receipt-line-1',
        idempotencyKey: 'qc-task-1',
        forceRequired: true,
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: 'QC required by discrepancy',
        evidenceRefs: ['photo://dock/qc-trigger-1'],
      }),
    ).toEqual({
      ReceiptLineId: 'receipt-line-1',
      IdempotencyKey: 'qc-task-1',
      ForceRequired: true,
      ReasonCode: 'RC-V1-DISCREPANCY',
      ReasonNote: 'QC required by discrepancy',
      EvidenceRefs: ['photo://dock/qc-trigger-1'],
    });
    expect(
      InboundMapper.toRecordQcResultRequest({
        idempotencyKey: 'qc-result-1',
        resultStatus: 'Failed',
        dispositionCode: 'Quarantine',
        inspectedQuantity: 12,
        acceptedQuantity: 8,
        rejectedQuantity: 4,
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: 'Four units damaged',
        evidenceRefs: ['photo://qc/damaged-4'],
        evidenceJson: { rejectedQuantity: 4 },
      }),
    ).toEqual({
      IdempotencyKey: 'qc-result-1',
      ResultStatus: 'Failed',
      DispositionCode: 'Quarantine',
      InspectedQuantity: 12,
      AcceptedQuantity: 8,
      RejectedQuantity: 4,
      ReasonCode: 'RC-V1-DISCREPANCY',
      ReasonNote: 'Four units damaged',
      EvidenceRefs: ['photo://qc/damaged-4'],
      EvidenceJson: { rejectedQuantity: 4 },
    });
  });
});
