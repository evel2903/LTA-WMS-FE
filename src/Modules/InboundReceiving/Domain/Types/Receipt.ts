import type {
  INBOUND_DISCREPANCY_STATUSES,
  INBOUND_DISCREPANCY_TOLERANCE_DECISIONS,
  INBOUND_DISCREPANCY_TYPES,
  RECEIPT_DOCUMENT_STATUSES,
  RECEIPT_LINE_DISCREPANCY_SIGNALS,
  RECEIPT_LINE_STATUSES,
  QC_DISPOSITION_CODES,
  QC_RESULT_STATUSES,
  QC_TASK_STATUSES,
  RECEIVING_SESSION_STATUSES,
} from '@modules/InboundReceiving/Domain/Constants/InboundReceivingConstants';

export type InboundDiscrepancyType = (typeof INBOUND_DISCREPANCY_TYPES)[number];
export type InboundDiscrepancyStatus = (typeof INBOUND_DISCREPANCY_STATUSES)[number];
export type InboundDiscrepancyToleranceDecision =
  (typeof INBOUND_DISCREPANCY_TOLERANCE_DECISIONS)[number];
export type ReceivingSessionStatus = (typeof RECEIVING_SESSION_STATUSES)[number];
export type ReceiptDocumentStatus = (typeof RECEIPT_DOCUMENT_STATUSES)[number];
export type ReceiptLineStatus = (typeof RECEIPT_LINE_STATUSES)[number];
export type ReceiptLineDiscrepancySignal = (typeof RECEIPT_LINE_DISCREPANCY_SIGNALS)[number];
export type QcTaskStatus = (typeof QC_TASK_STATUSES)[number];
export type QcResultStatus = (typeof QC_RESULT_STATUSES)[number];
export type QcDispositionCode = (typeof QC_DISPOSITION_CODES)[number];
export type ExceptionState =
  | 'DETECTED'
  | 'LOGGED'
  | 'ASSIGNED'
  | 'IN_REVIEW_PENDING_APPROVAL'
  | 'RESOLVED'
  | 'CLOSED';
export type ControlExceptionSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReceivingReadiness {
  allowed: boolean;
  blocked: boolean;
  decision: 'Allowed' | 'Blocked' | 'ApprovalRequired' | 'OverrideAccepted';
  gateInRequired: boolean;
  gateInRecorded: boolean;
  overrideAccepted: boolean;
  reason: string;
  ruleCode?: string | null;
  inboundPlanId?: string;
  businessReference?: string;
}

export interface ReceivingSession {
  id: string;
  inboundPlanId: string | null;
  receiptId: string;
  receiptNumber: string;
  sessionKey: string;
  deviceCode: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  status: ReceivingSessionStatus;
  startedAt: string;
  closedAt: string | null;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
  startedBy: string | null;
  updatedBy: string | null;
}

export interface Receipt {
  id: string;
  inboundPlanId: string | null;
  receiptNumber: string;
  businessReference: string;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  warehouseProfileId: string | null;
  supplierId: string;
  supplierCode: string | null;
  supplierName: string | null;
  status: ReceiptDocumentStatus;
  coreFlowInstanceId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface ReceiptLineScanEvidence {
  rawValue?: string | null;
  parsedValue?: Record<string, unknown> | null;
  scanEventId?: string | null;
  scanType?: string | null;
  scanResult?: string | null;
  resolvedSkuId?: string | null;
  resolvedUomId?: string | null;
  resolvedPackId?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  serialNumber?: string | null;
  lpn?: string | null;
}

export interface ReceiptLine {
  id: string;
  receiptId: string;
  inboundPlanId: string | null;
  inboundPlanLineId: string | null;
  lineNumber: number;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  expectedQuantity: number | null;
  actualQuantity: number;
  status: ReceiptLineStatus;
  manualConfirm: boolean;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  scanEvidenceJson: Record<string, unknown> | null;
  discrepancySignals: ReceiptLineDiscrepancySignal[];
  lotNumber: string | null;
  expiryDate: string | null;
  serialNumber: string | null;
  idempotencyKey: string;
  receivedAt: string;
  receivedBy: string | null;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InboundLpn {
  id: string;
  receiptId: string;
  receiptLineId: string;
  inboundPlanId: string | null;
  inboundPlanLineId: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  quantity: number;
  lpnCode: string;
  ssccCode: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  idempotencyKey: string;
  confirmedAt: string;
  confirmedBy: string | null;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InboundPutawayRelease {
  id: string;
  inboundLpnId: string | null;
  receiptId: string;
  receiptLineId: string;
  inboundPlanId: string | null;
  inboundPlanLineId: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  quantity: number;
  lpnCode: string | null;
  ssccCode: string | null;
  inventoryStatusCode: string;
  currentLocationId: string | null;
  currentLocationCode: string | null;
  warehouseProfileId: string | null;
  labelDecision: string | null;
  labelReason: string | null;
  matchedPrintJobId: string | null;
  constraintJson: Record<string, unknown> | null;
  outboxMessageId: string | null;
  coreFlowMilestoneId: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  idempotencyKey: string;
  releasedAt: string;
  releasedBy: string | null;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InboundDiscrepancy {
  id: string;
  receiptId: string;
  receiptLineId: string;
  inboundPlanId: string | null;
  inboundPlanLineId: string | null;
  discrepancyType: InboundDiscrepancyType;
  status: InboundDiscrepancyStatus;
  toleranceDecision: InboundDiscrepancyToleranceDecision;
  expectedQuantity: number | null;
  actualQuantity: number | null;
  reasonCode: string;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  evidenceJson: Record<string, unknown> | null;
  exceptionCaseId: string;
  exceptionState: ExceptionState;
  severity: ControlExceptionSeverity;
  idempotencyKey: string;
  isDuplicate: boolean;
  recordedAt: string;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QcTask {
  id: string;
  receiptId: string;
  receiptLineId: string;
  inboundPlanId: string | null;
  inboundPlanLineId: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  actualQuantity: number;
  taskStatus: QcTaskStatus;
  required: boolean;
  triggerReason: string;
  triggerPolicyJson: Record<string, unknown> | null;
  inventoryStatusCode: string;
  targetInventoryStatusCode: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  idempotencyKey: string;
  isDuplicate: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QcResult {
  id: string;
  qcTaskId: string;
  receiptId: string;
  receiptLineId: string;
  inboundPlanId: string | null;
  inboundPlanLineId: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  resultStatus: QcResultStatus;
  dispositionCode: QcDispositionCode;
  taskStatus: QcTaskStatus;
  inspectedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  acceptedInventoryStatusCode: string | null;
  rejectedInventoryStatusCode: string | null;
  targetInventoryStatusCode: string;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  evidenceJson: Record<string, unknown> | null;
  idempotencyKey: string;
  recordedAt: string;
  recordedBy: string | null;
  isDuplicate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InboundOperationalState {
  inboundPlanId: string;
  receivingSessions: ReceivingSession[];
  receiptLines: ReceiptLine[];
  qcTasks: QcTask[];
  qcResults: QcResult[];
  lpns: InboundLpn[];
  releases: InboundPutawayRelease[];
  discrepancies: InboundDiscrepancy[];
}

export interface ReceiptOperationalState {
  receiptId: string;
  inboundPlanId: string | null;
  receipt: Receipt;
  receivingSessions: ReceivingSession[];
  receiptLines: ReceiptLine[];
  qcTasks: QcTask[];
  qcResults: QcResult[];
  lpns: InboundLpn[];
  releases: InboundPutawayRelease[];
  discrepancies: InboundDiscrepancy[];
}
