import type {
  AllocationPolicy,
  AllocationStatus,
  OutboundOrderStatus,
} from '@modules/Outbound/Domain/Types/OutboundOrder';

export interface OutboundOrderListFilter {
  page?: number;
  pageSize?: number;
  sourceSystem?: string;
  sourceReference?: string;
  ownerId?: string;
  warehouseId?: string;
  customerId?: string;
  documentStatus?: OutboundOrderStatus;
}

export interface ImportOutboundOrderLineInput {
  lineNumber: number;
  skuId: string;
  uomId: string;
  orderedQuantity: number;
  externalLineReference?: string;
}

export interface ImportOutboundOrderInput {
  sourceSystem: string;
  sourceReference: string;
  customerId?: string;
  customerSourceSystem?: string;
  customerExternalReference?: string;
  shipToReference?: string;
  ownerId: string;
  warehouseId: string;
  priority?: number;
  cutoffAt?: string;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
  lines: ImportOutboundOrderLineInput[];
}

export interface ReasonOutboundOrderInput {
  reasonCode: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface AllocationListFilter {
  page?: number;
  pageSize?: number;
  status?: AllocationStatus;
}

export interface AllocateOutboundOrderInput {
  policy?: AllocationPolicy;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}
