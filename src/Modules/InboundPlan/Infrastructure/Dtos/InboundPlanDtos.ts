import type {
  InboundGateInStatus,
  InboundPlanDocumentStatus,
} from '@modules/InboundPlan/Domain/Types/InboundPlan';

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

export interface UpdateInboundPlanLineRequestDto {
  LineNumber: number;
  SkuId: string;
  UomId: string;
  ExpectedQuantity: number;
  ExternalLineReference?: string | null;
}

export interface UpdateInboundPlanRequestDto {
  SourceSystem: string;
  SourceDocumentType: string;
  SourceDocumentNumber: string;
  SupplierId: string;
  OwnerId: string;
  WarehouseId: string;
  WarehouseProfileId?: string | null;
  ExpectedArrivalAt?: string | null;
  ExpectedUpdatedAt: string;
  Lines: UpdateInboundPlanLineRequestDto[];
}

export interface InboundLineImportRowDto {
  RowNumber: number;
  SkuCode: string;
  UomCode: string;
  ExpectedQuantity: string;
  ExternalLineReference: string;
  SkuId?: string;
  UomId?: string;
  Errors: string[];
}

export interface InboundLineImportPreviewDto {
  FileName: string;
  Rows: InboundLineImportRowDto[];
  Summary: { Total: number; Valid: number; Invalid: number };
  HeaderError: string | null;
}

export interface RecordGateInRequestDto {
  GateInAt: string;
  GateReference: string;
  VehicleNumber?: string | null;
  DriverName?: string | null;
  EvidenceRefs?: string[];
}
