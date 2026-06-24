import type { OUTBOUND_ORDER_STATUSES } from '@modules/Outbound/Domain/Constants/OutboundConstants';

export type OutboundOrderStatus = (typeof OUTBOUND_ORDER_STATUSES)[number];

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
