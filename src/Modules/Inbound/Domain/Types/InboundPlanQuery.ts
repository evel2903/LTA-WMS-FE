import type { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Types/InboundPlan';

export interface InboundPlanFilter {
  page?: number;
  pageSize?: number;
  sourceSystem?: string;
  sourceDocumentNumber?: string;
  ownerId?: string;
  warehouseId?: string;
  status?: InboundPlanDocumentStatus;
}

export interface CreateInboundPlanLineInput {
  lineNumber: number;
  skuId: string;
  uomId: string;
  expectedQuantity: number;
  externalLineReference?: string | null;
}

export interface CreateInboundPlanInput {
  sourceSystem: string;
  sourceDocumentType: string;
  sourceDocumentNumber: string;
  supplierId: string;
  ownerId: string;
  warehouseId: string;
  warehouseProfileId?: string | null;
  expectedArrivalAt?: string | null;
  lines: CreateInboundPlanLineInput[];
}

export interface RecordGateInInput {
  gateInAt: string;
  gateReference: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  evidenceRefs?: string[];
}

export interface ValidateReceivingReadinessInput {
  attemptOverride?: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[];
}
