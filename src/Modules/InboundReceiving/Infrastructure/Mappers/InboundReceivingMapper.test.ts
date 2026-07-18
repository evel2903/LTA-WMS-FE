import { describe, expect, it } from 'vitest';

import type {
  InboundDiscrepancyDto,
  InboundLpnDto,
  InboundPutawayReleaseDto,
  QcResultDto,
  QcTaskDto,
  ReceiptLineDto,
  ReceivingReadinessDto,
  ReceivingSessionDto,
} from '@modules/InboundReceiving/Infrastructure/Dtos/InboundReceivingDtos';
import { InboundReceivingMapper } from '@modules/InboundReceiving/Infrastructure/Mappers/InboundReceivingMapper';

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
  LotNumber: 'LOT-A1',
  ExpiryDate: '2027-01-31',
  SerialNumber: 'SN-0001',
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

describe('InboundReceivingMapper', () => {
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

    expect(InboundReceivingMapper.toReadiness(approvalRequiredDto)).toEqual({
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

    expect(InboundReceivingMapper.toReadiness(blockedDto).ruleCode).toBeNull();
  });

  it('maps receiving session and receipt line DTOs into domain objects', () => {
    expect(InboundReceivingMapper.toReceivingSession(receivingSessionDto)).toMatchObject({
      id: 'session-1',
      receiptId: 'receipt-1',
      receiptNumber: 'ASN-10001-RCPT',
      status: 'Open',
    });
    expect(InboundReceivingMapper.toReceiptLine(receiptLineDto)).toMatchObject({
      id: 'receipt-line-1',
      receiptId: 'receipt-1',
      actualQuantity: 10,
      status: 'Discrepancy',
      discrepancySignals: ['QuantityVariance'],
      manualConfirm: true,
      lotNumber: 'LOT-A1',
      expiryDate: '2027-01-31',
      serialNumber: 'SN-0001',
    });
  });

  it('maps inbound discrepancy DTOs into domain objects', () => {
    expect(InboundReceivingMapper.toInboundDiscrepancy(inboundDiscrepancyDto)).toMatchObject({
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
    expect(InboundReceivingMapper.toInboundLpn(inboundLpnDto)).toMatchObject({
      id: 'lpn-1',
      receiptLineId: 'receipt-line-1',
      lpnCode: 'LPN-0001',
      ssccCode: '003456789012345678',
      quantity: 12,
      isDuplicate: false,
    });
    expect(InboundReceivingMapper.toInboundPutawayRelease(inboundPutawayReleaseDto)).toMatchObject({
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
    expect(InboundReceivingMapper.toQcTask(qcTaskDto)).toMatchObject({
      id: 'qc-task-1',
      receiptLineId: 'receipt-line-1',
      taskStatus: 'PendingQc',
      required: true,
      triggerReason: 'WarehouseProfile',
      inventoryStatusCode: 'PENDING_QC',
    });
    expect(InboundReceivingMapper.toQcTask(qcTaskDto).inventoryStatusCode).not.toBe('AVAILABLE');
    expect(InboundReceivingMapper.toQcResult(qcResultDto)).toMatchObject({
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

  it('builds PascalCase readiness, receiving session and receipt line payloads', () => {
    expect(
      InboundReceivingMapper.toReadinessRequest({ attemptOverride: true, reasonCode: 'RC-V1-HANDOFF' }),
    ).toEqual({
      AttemptOverride: true,
      ReasonCode: 'RC-V1-HANDOFF',
    });

    expect(
      InboundReceivingMapper.toStartReceivingRequest({
        sessionKey: 'dock-1:user-1',
        deviceCode: 'rf-01',
      }),
    ).toEqual({
      SessionKey: 'dock-1:user-1',
      DeviceCode: 'rf-01',
    });

    expect(
      InboundReceivingMapper.toConfirmReceiptLineRequest({
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
      InboundReceivingMapper.toCaptureDiscrepancyRequest({
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
      InboundReceivingMapper.toConfirmInboundLpnRequest({
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
      InboundReceivingMapper.toReleaseInboundToPutawayRequest({
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
      InboundReceivingMapper.toEvaluateQcTaskRequest({
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
      InboundReceivingMapper.toRecordQcResultRequest({
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
