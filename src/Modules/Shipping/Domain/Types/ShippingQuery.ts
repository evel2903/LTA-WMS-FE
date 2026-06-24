import type {
  GoodsIssueTrigger,
  ShipmentPackageStagingStatus,
} from '@modules/Shipping/Domain/Types/Shipping';

export interface ShippingStagingListFilter {
  page?: number;
  pageSize?: number;
  warehouseId?: string;
  ownerId?: string;
  status?: ShipmentPackageStagingStatus;
  packageId?: string;
  outboundOrderId?: string;
  shipmentReference?: string;
}

export interface StagePackageInput {
  packageId: string;
  shipmentReference?: string;
  stagingLaneCode: string;
  stagingLocationId?: string;
  stagingLocationCode?: string;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface AssignDockInput {
  dockDoorId?: string;
  dockDoorCode?: string;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface AssignTruckInput {
  truckReference?: string;
  vehicleNumber?: string;
  driverName?: string;
  carrierId?: string;
  carrierCode?: string;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface ScanLoadingInput {
  scannedPackageId?: string;
  scannedPackageCode?: string;
  shipmentReference?: string;
  loadReference?: string;
  truckReference?: string;
  vehicleNumber?: string;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface ConfirmShipmentInput {
  shipmentReference?: string;
  requireFullLoad?: boolean;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface RecordGateOutInput {
  gateOutReference?: string;
  truckReference?: string;
  vehicleNumber?: string;
  inventoryStatusCode?: string;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface EvaluateGoodsIssueTriggerInput {
  goodsIssueTrigger?: GoodsIssueTrigger;
  inventoryStatusCode?: string;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}
