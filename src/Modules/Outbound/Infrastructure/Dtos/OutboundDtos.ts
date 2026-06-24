import type { OutboundOrderStatus } from '@modules/Outbound/Domain/Types/OutboundOrder';

export interface OutboundOrderLineDto {
  Id: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  OrderedQuantity: number;
  ExternalLineReference: string | null;
  ValidationErrors: string[];
}

export interface OutboundOrderDto {
  Id: string;
  OrderNumber: string;
  SourceSystem: string;
  SourceReference: string;
  BusinessReference: string;
  CustomerId: string | null;
  CustomerSourceSystem: string | null;
  CustomerExternalReference: string | null;
  CustomerCode: string | null;
  ShipToReference: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  Priority: number | null;
  CutoffAt: string | null;
  DocumentStatus: OutboundOrderStatus;
  ValidationErrors: string[];
  CoreFlowInstanceId: string | null;
  OutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IsDuplicate: boolean;
  Lines: OutboundOrderLineDto[];
  CreatedAt: string;
  UpdatedAt: string;
}

export interface PagedOutboundOrderDto {
  Items: OutboundOrderDto[];
  Meta?: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
  Page?: number;
  PageSize?: number;
  TotalItems?: number;
  TotalPages?: number;
}
