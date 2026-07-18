import type {
  INBOUND_DOCUMENT_STATUSES,
  INBOUND_GATE_IN_STATUSES,
} from '@modules/InboundPlan/Domain/Constants/InboundPlanConstants';

export type InboundPlanDocumentStatus = (typeof INBOUND_DOCUMENT_STATUSES)[number];
export type InboundGateInStatus = (typeof INBOUND_GATE_IN_STATUSES)[number];

export interface InboundPlanLine {
  id: string;
  lineNumber: number;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  expectedQuantity: number;
  externalLineReference: string | null;
}

export interface InboundPlan {
  id: string;
  sourceSystem: string;
  sourceDocumentType: string;
  sourceDocumentNumber: string;
  businessReference: string;
  supplierId: string;
  supplierCode: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  warehouseProfileId: string | null;
  expectedArrivalAt: string | null;
  status: InboundPlanDocumentStatus;
  gateInStatus: InboundGateInStatus;
  gateInAt: string | null;
  gateReference: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  evidenceRefs: string[];
  coreFlowInstanceId: string | null;
  isDuplicate: boolean;
  lines: InboundPlanLine[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface InboundLineImportRow {
  rowNumber: number;
  skuCode: string;
  uomCode: string;
  expectedQuantity: string;
  externalLineReference: string;
  skuId?: string;
  uomId?: string;
  errors: string[];
}

export interface InboundLineImportPreview {
  fileName: string;
  rows: InboundLineImportRow[];
  summary: { total: number; valid: number; invalid: number };
  headerError: string | null;
}
