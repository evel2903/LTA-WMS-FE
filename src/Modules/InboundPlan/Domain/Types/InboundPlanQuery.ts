import type { InboundPlanDocumentStatus } from '@modules/InboundPlan/Domain/Types/InboundPlan';

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

export interface UpdateInboundPlanLineInput {
  lineNumber: number;
  skuId: string;
  uomId: string;
  expectedQuantity: number;
  externalLineReference?: string | null;
}

export interface UpdateInboundPlanInput {
  sourceSystem: string;
  sourceDocumentType: string;
  sourceDocumentNumber: string;
  supplierId: string;
  ownerId: string;
  warehouseId: string;
  warehouseProfileId?: string | null;
  expectedArrivalAt?: string | null;
  // Re-review fix (P1 decision): optimistic concurrency token -- the updatedAt the
  // caller last saw. Backend 409s if the plan has moved on since then.
  expectedUpdatedAt: string;
  lines: UpdateInboundPlanLineInput[];
}

export interface RecordGateInInput {
  gateInAt: string;
  gateReference: string;
  vehicleNumber?: string | null;
  driverName?: string | null;
  evidenceRefs?: string[];
}
