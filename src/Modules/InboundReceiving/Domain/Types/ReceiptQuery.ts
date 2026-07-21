import type {
  QcDispositionCode,
  QcResultStatus,
  InboundDiscrepancyType,
} from '@modules/InboundReceiving/Domain/Types/Receipt';

export interface ValidateReceivingReadinessInput {
  attemptOverride?: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
}

export interface StartReceivingSessionInput {
  sessionKey?: string | null;
  deviceCode?: string | null;
  attemptOverride?: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
}

export interface ReceiptLineScanEvidenceInput {
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

export interface ConfirmReceiptLineInput {
  inboundPlanLineId?: string | null;
  actualQuantity: number;
  expectedQuantity?: number | null;
  skuId?: string | null;
  uomId?: string | null;
  manualConfirm?: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  serialNumber?: string | null;
  idempotencyKey: string;
  scanEvidence?: ReceiptLineScanEvidenceInput | null;
}

export interface ReceiptListFilter {
  page?: number;
  pageSize?: number;
  warehouseId?: string;
  ownerId?: string;
  search?: string;
  sortBy?: 'CreatedAt' | 'ReceiptNumber';
  sortDirection?: 'ASC' | 'DESC';
}

export interface CreateManualReceiptInput {
  ownerId: string;
  warehouseId: string;
  warehouseProfileId?: string | null;
  supplierId: string;
  receiptNumber: string;
  businessReference: string;
  sessionKey: string;
  deviceCode?: string | null;
  idempotencyKey: string;
}

export interface ConfirmInboundLpnInput {
  lpnCode: string;
  ssccCode?: string | null;
  quantity?: number | null;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface ReleaseInboundToPutawayInput {
  currentLocationId?: string | null;
  currentLocationCode?: string | null;
  requireLpn?: boolean;
  attemptLabelOverride?: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface CaptureInboundDiscrepancyInput {
  receiptLineId: string;
  discrepancyType: InboundDiscrepancyType;
  reasonCode: string;
  reasonNote?: string | null;
  evidenceRefs?: string[];
  evidenceJson?: Record<string, unknown> | null;
  idempotencyKey: string;
}

export interface EvaluateQcTaskInput {
  receiptLineId: string;
  idempotencyKey: string;
  forceRequired?: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
}

export interface RecordQcResultInput {
  idempotencyKey: string;
  resultStatus: QcResultStatus;
  dispositionCode: QcDispositionCode;
  inspectedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
  evidenceJson?: Record<string, unknown> | null;
}
