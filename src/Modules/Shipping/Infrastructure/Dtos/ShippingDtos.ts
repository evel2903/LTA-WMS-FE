import type {
  GoodsIssueStatus,
  GoodsIssueTrigger,
  GoodsIssueTriggerStatus,
  ShipmentPackageStagingStatus,
} from '@modules/Shipping/Domain/Types/Shipping';

export interface ShipmentPackageStagingDto {
  Id: string;
  StagingCode: string;
  PackageId: string;
  PackageCode: string;
  OutboundOrderId: string;
  WarehouseProfileId: string;
  WarehouseId: string | null;
  WarehouseCode: string | null;
  OwnerId: string | null;
  OwnerCode: string | null;
  Status: ShipmentPackageStagingStatus;
  InventoryStatusCode: string | null;
  ShipmentReference: string | null;
  StagingLaneCode: string;
  StagingLocationId: string | null;
  StagingLocationCode: string | null;
  DockDoorId: string | null;
  DockDoorCode: string | null;
  TruckReference: string | null;
  VehicleNumber: string | null;
  DriverName: string | null;
  CarrierId: string | null;
  CarrierCode: string | null;
  CoreFlowInstanceId: string | null;
  StagedAt: string;
  StagedBy: string | null;
  DockAssignedAt: string | null;
  DockAssignedBy: string | null;
  TruckAssignedAt: string | null;
  TruckAssignedBy: string | null;
  LoadReference: string | null;
  LoadedAt: string | null;
  LoadedBy: string | null;
  ShipmentConfirmedAt: string | null;
  ShipmentConfirmedBy: string | null;
  GateOutReference: string | null;
  GateOutAt: string | null;
  GateOutBy: string | null;
  GoodsIssueTrigger: GoodsIssueTrigger | null;
  GoodsIssueTriggerStatus: GoodsIssueTriggerStatus | null;
  GoodsIssueTriggeredAt: string | null;
  GoodsIssueTriggeredBy: string | null;
  GoodsIssueStatus: GoodsIssueStatus | null;
  GoodsIssuePostedAt: string | null;
  GoodsIssuePostedBy: string | null;
  GoodsIssueInventoryTransactionId: string | null;
  GoodsIssueInventoryMovementId: string | null;
  LoadingOutboxMessageId: string | null;
  ShipmentConfirmOutboxMessageId: string | null;
  GateOutOutboxMessageId: string | null;
  GoodsIssueTriggerOutboxMessageId: string | null;
  GoodsIssueOutboxMessageId: string | null;
  ShipmentClosedOutboxMessageId: string | null;
  ShipmentClosedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface PageMetaDto {
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}

export interface PagedShipmentPackageStagingDto {
  Items: ShipmentPackageStagingDto[];
  Meta?: PageMetaDto;
  Page?: number;
  PageSize?: number;
  TotalItems?: number;
  TotalPages?: number;
}

export interface StagePackageRequestDto {
  PackageId: string;
  ShipmentReference?: string;
  StagingLaneCode: string;
  StagingLocationId?: string;
  StagingLocationCode?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface AssignDockRequestDto {
  DockDoorId?: string;
  DockDoorCode?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface AssignTruckRequestDto {
  TruckReference?: string;
  VehicleNumber?: string;
  DriverName?: string;
  CarrierId?: string;
  CarrierCode?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ScanLoadingRequestDto {
  ScannedPackageId?: string;
  ScannedPackageCode?: string;
  ShipmentReference?: string;
  LoadReference?: string;
  TruckReference?: string;
  VehicleNumber?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface ConfirmShipmentRequestDto {
  ShipmentReference?: string;
  RequireFullLoad?: boolean;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface RecordGateOutRequestDto {
  GateOutReference?: string;
  TruckReference?: string;
  VehicleNumber?: string;
  InventoryStatusCode?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface EvaluateGoodsIssueTriggerRequestDto {
  GoodsIssueTrigger?: GoodsIssueTrigger;
  InventoryStatusCode?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}

export interface PostGoodsIssueRequestDto {
  InventoryStatusCode?: string;
  ReasonCode?: string;
  ReasonNote?: string;
  EvidenceRefs?: string[];
  IdempotencyKey: string;
}
