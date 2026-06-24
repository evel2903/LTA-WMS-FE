import type { SHIPPING_STAGING_STATUSES } from '@modules/Shipping/Domain/Constants/ShippingConstants';

export type ShipmentPackageStagingStatus = (typeof SHIPPING_STAGING_STATUSES)[number];

export interface ShipmentPackageStaging {
  id: string;
  stagingCode: string;
  packageId: string;
  packageCode: string;
  outboundOrderId: string;
  warehouseProfileId: string;
  warehouseId: string | null;
  warehouseCode: string | null;
  ownerId: string | null;
  ownerCode: string | null;
  status: ShipmentPackageStagingStatus;
  inventoryStatusCode: string | null;
  shipmentReference: string | null;
  stagingLaneCode: string;
  stagingLocationId: string | null;
  stagingLocationCode: string | null;
  dockDoorId: string | null;
  dockDoorCode: string | null;
  truckReference: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  carrierId: string | null;
  carrierCode: string | null;
  coreFlowInstanceId: string | null;
  stagedAt: string;
  stagedBy: string | null;
  dockAssignedAt: string | null;
  dockAssignedBy: string | null;
  truckAssignedAt: string | null;
  truckAssignedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

