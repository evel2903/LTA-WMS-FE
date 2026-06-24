import type { ShipmentPackageStagingStatus } from '@modules/Shipping/Domain/Types/Shipping';

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

