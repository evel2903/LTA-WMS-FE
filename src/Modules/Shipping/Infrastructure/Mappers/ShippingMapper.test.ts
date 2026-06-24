import { describe, expect, it } from 'vitest';

import { ShippingMapper } from '@modules/Shipping/Infrastructure/Mappers/ShippingMapper';
import type { ShipmentPackageStagingDto } from '@modules/Shipping/Infrastructure/Dtos/ShippingDtos';

const stagingDto: ShipmentPackageStagingDto = {
  Id: 'staging-1',
  StagingCode: 'STG-001',
  PackageId: 'package-1',
  PackageCode: 'PKG-001',
  OutboundOrderId: 'outbound-1',
  WarehouseProfileId: 'profile-1',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WH-1',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-1',
  Status: 'Staged',
  InventoryStatusCode: 'STAGED',
  ShipmentReference: 'SHIP-001',
  StagingLaneCode: 'STAGE-A',
  StagingLocationId: 'location-1',
  StagingLocationCode: 'STAGE-A-01',
  DockDoorId: null,
  DockDoorCode: null,
  TruckReference: null,
  VehicleNumber: null,
  DriverName: null,
  CarrierId: null,
  CarrierCode: null,
  CoreFlowInstanceId: 'core-flow-1',
  StagedAt: '2026-06-24T00:00:00.000Z',
  StagedBy: 'shipper-1',
  DockAssignedAt: null,
  DockAssignedBy: null,
  TruckAssignedAt: null,
  TruckAssignedBy: null,
  LoadReference: null,
  LoadedAt: null,
  LoadedBy: null,
  ShipmentConfirmedAt: null,
  ShipmentConfirmedBy: null,
  LoadingOutboxMessageId: null,
  ShipmentConfirmOutboxMessageId: null,
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:00:00.000Z',
};

describe('ShippingMapper', () => {
  it('maps shipping staging DTO to domain shape', () => {
    expect(ShippingMapper.toStaging(stagingDto)).toMatchObject({
      id: 'staging-1',
      stagingCode: 'STG-001',
      packageCode: 'PKG-001',
      status: 'Staged',
      inventoryStatusCode: 'STAGED',
      stagingLaneCode: 'STAGE-A',
    });
  });

  it('maps action request payloads without empty fields', () => {
    expect(
      ShippingMapper.toStagePackageRequest({
        packageId: 'package-1',
        shipmentReference: '',
        stagingLaneCode: 'STAGE-A',
        stagingLocationId: undefined,
        evidenceRefs: [],
        idempotencyKey: 'stage-1',
      }),
    ).toEqual({
      PackageId: 'package-1',
      StagingLaneCode: 'STAGE-A',
      EvidenceRefs: [],
      IdempotencyKey: 'stage-1',
    });
    expect(
      ShippingMapper.toAssignDockRequest({
        dockDoorCode: 'DOCK-01',
        idempotencyKey: 'dock-1',
      }),
    ).toEqual({ DockDoorCode: 'DOCK-01', IdempotencyKey: 'dock-1' });
    expect(
      ShippingMapper.toAssignTruckRequest({
        truckReference: 'TRUCK-001',
        vehicleNumber: '51C-001',
        idempotencyKey: 'truck-1',
      }),
    ).toEqual({
      TruckReference: 'TRUCK-001',
      VehicleNumber: '51C-001',
      IdempotencyKey: 'truck-1',
    });
    expect(
      ShippingMapper.toScanLoadingRequest({
        scannedPackageCode: 'PKG-001',
        shipmentReference: 'SHIP-001',
        loadReference: 'LOAD-001',
        idempotencyKey: 'loading-1',
      }),
    ).toEqual({
      ScannedPackageCode: 'PKG-001',
      ShipmentReference: 'SHIP-001',
      LoadReference: 'LOAD-001',
      IdempotencyKey: 'loading-1',
    });
    expect(
      ShippingMapper.toConfirmShipmentRequest({
        shipmentReference: 'SHIP-001',
        requireFullLoad: true,
        idempotencyKey: 'confirm-1',
      }),
    ).toEqual({
      ShipmentReference: 'SHIP-001',
      RequireFullLoad: true,
      IdempotencyKey: 'confirm-1',
    });
  });
});

