import type {
  OUTBOUND_ALLOCATION_POLICIES,
  OUTBOUND_ALLOCATION_STATUSES,
  OUTBOUND_ORDER_STATUSES,
} from '@modules/Outbound/Domain/Constants/OutboundConstants';

export type OutboundOrderStatus = (typeof OUTBOUND_ORDER_STATUSES)[number];
export type AllocationPolicy = (typeof OUTBOUND_ALLOCATION_POLICIES)[number];
export type AllocationStatus = (typeof OUTBOUND_ALLOCATION_STATUSES)[number];

export interface OutboundOrderLine {
  id: string;
  lineNumber: number;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  orderedQuantity: number;
  externalLineReference: string | null;
  validationErrors: string[];
}

export interface OutboundOrder {
  id: string;
  orderNumber: string;
  sourceSystem: string;
  sourceReference: string;
  businessReference: string;
  customerId: string | null;
  customerSourceSystem: string | null;
  customerExternalReference: string | null;
  customerCode: string | null;
  shipToReference: string | null;
  ownerId: string;
  ownerCode: string | null;
  warehouseId: string;
  warehouseCode: string | null;
  priority: number | null;
  cutoffAt: string | null;
  documentStatus: OutboundOrderStatus;
  validationErrors: string[];
  coreFlowInstanceId: string | null;
  outboxMessageId: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  isDuplicate: boolean;
  lines: OutboundOrderLine[];
  createdAt: string;
  updatedAt: string;
}

export interface AllocationLine {
  id: string;
  outboundOrderLineId: string;
  lineNumber: number;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  orderedQuantity: number;
  allocatedQuantity: number;
  backorderedQuantity: number;
  sourceBalanceId: string | null;
  sourceDimensionId: string | null;
  sourceLocationId: string | null;
  inventoryStatusCode: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expiryDate: string | null;
  status: AllocationStatus;
  shortageReason: string | null;
}

export interface Allocation {
  id: string;
  allocationNumber: string;
  outboundOrderId: string;
  warehouseId: string;
  warehouseCode: string | null;
  ownerId: string;
  ownerCode: string | null;
  policy: AllocationPolicy;
  status: AllocationStatus;
  totalOrderedQuantity: number;
  totalAllocatedQuantity: number;
  totalBackorderedQuantity: number;
  shortageReason: string | null;
  outboxMessageId: string | null;
  reasonCode: string | null;
  reasonCodeId: string | null;
  reasonNote: string | null;
  evidenceRefs: string[];
  isDuplicate: boolean;
  lines: AllocationLine[];
  createdAt: string;
  updatedAt: string;
}
