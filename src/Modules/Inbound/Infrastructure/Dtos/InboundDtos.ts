import type {
  InboundGateInStatus,
  InboundPlanDocumentStatus,
} from '@modules/Inbound/Domain/Types/InboundPlan';

export interface InboundPlanLineDto {
  Id: string;
  LineNumber: number;
  SkuId: string;
  SkuCode: string | null;
  UomId: string;
  UomCode: string | null;
  ExpectedQuantity: number;
  ExternalLineReference: string | null;
}

export interface InboundPlanDto {
  Id: string;
  SourceSystem: string;
  SourceDocumentType: string;
  SourceDocumentNumber: string;
  BusinessReference: string;
  SupplierId: string;
  SupplierCode: string | null;
  OwnerId: string;
  OwnerCode: string | null;
  WarehouseId: string;
  WarehouseCode: string | null;
  WarehouseProfileId: string | null;
  ExpectedArrivalAt: string | null;
  Status: InboundPlanDocumentStatus;
  GateInStatus: InboundGateInStatus;
  GateInAt: string | null;
  GateReference: string | null;
  VehicleNumber: string | null;
  DriverName: string | null;
  EvidenceRefs: string[];
  CoreFlowInstanceId: string | null;
  IsDuplicate: boolean;
  Lines: InboundPlanLineDto[];
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface PagedInboundPlanDto {
  Items: InboundPlanDto[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export interface CreateInboundPlanLineRequestDto {
  LineNumber: number;
  SkuId: string;
  UomId: string;
  ExpectedQuantity: number;
  ExternalLineReference?: string | null;
}

export interface CreateInboundPlanRequestDto {
  SourceSystem: string;
  SourceDocumentType: string;
  SourceDocumentNumber: string;
  SupplierId: string;
  OwnerId: string;
  WarehouseId: string;
  WarehouseProfileId?: string | null;
  ExpectedArrivalAt?: string | null;
  Lines: CreateInboundPlanLineRequestDto[];
}

export interface RecordGateInRequestDto {
  GateInAt: string;
  GateReference: string;
  VehicleNumber?: string | null;
  DriverName?: string | null;
  EvidenceRefs?: string[];
}

export interface ValidateReceivingReadinessRequestDto {
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[];
}

export interface ReceivingReadinessDto {
  Allowed: boolean;
  Blocked: boolean;
  Decision: 'Allowed' | 'Blocked' | 'OverrideAccepted';
  GateInRequired: boolean;
  GateInRecorded: boolean;
  OverrideAccepted: boolean;
  Reason: string;
  InboundPlanId?: string;
  BusinessReference?: string;
}
