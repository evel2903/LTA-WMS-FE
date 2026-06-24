import type {
  AllocationPolicy,
  AllocationStatus,
  OutboundOrderStatus,
} from '@modules/Outbound/Domain/Types/OutboundOrder';

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

export interface AllocationLineDto {
  Id: string;
  OutboundOrderLineId: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  OrderedQuantity: number;
  AllocatedQuantity: number;
  BackorderedQuantity: number;
  SourceBalanceId: string | null;
  SourceDimensionId: string | null;
  SourceLocationId: string | null;
  InventoryStatusCode: string | null;
  LotNumber: string | null;
  SerialNumber: string | null;
  ExpiryDate: string | null;
  Status: AllocationStatus;
  ShortageReason: string | null;
}

export interface AllocationDto {
  Id: string;
  AllocationNumber: string;
  OutboundOrderId: string;
  WarehouseId: string;
  WarehouseCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  Policy: AllocationPolicy;
  Status: AllocationStatus;
  TotalOrderedQuantity: number;
  TotalAllocatedQuantity: number;
  TotalBackorderedQuantity: number;
  ShortageReason: string | null;
  OutboxMessageId: string | null;
  ReasonCode: string | null;
  ReasonCodeId: string | null;
  ReasonNote: string | null;
  EvidenceRefs: string[];
  IsDuplicate: boolean;
  Lines: AllocationLineDto[];
  CreatedAt: string;
  UpdatedAt: string;
}

export interface PagedAllocationDto {
  Items: AllocationDto[];
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
