import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { ShippingRepository } from '@modules/Shipping/Infrastructure/Repositories/ShippingRepository';
import type {
  PagedShipmentPackageStagingDto,
  ShipmentPackageStagingDto,
} from '@modules/Shipping/Infrastructure/Dtos/ShippingDtos';

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
  StagingLocationId: null,
  StagingLocationCode: null,
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
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:00:00.000Z',
};

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    const page: PagedShipmentPackageStagingDto = {
      Items: [stagingDto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    };
    return Promise.resolve((url.includes('/shipping/staging/packages/') ? stagingDto : page) as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve(stagingDto as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve(stagingDto as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve(stagingDto as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('ShippingRepository', () => {
  it('uses default PageSize but passes oversize values through for BE rejection', async () => {
    const http = new FakeHttpClient();
    const repository = new ShippingRepository(http);

    await repository.list({ page: 0, pageSize: 0 });
    await repository.list({ page: 2, pageSize: 500, status: 'Staged', packageId: 'package-1' });

    expect(http.calls[0]).toMatchObject({
      method: 'get',
      url: '/shipping/staging/packages',
      config: { params: { Page: 1, PageSize: 50 } },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'get',
      url: '/shipping/staging/packages',
      config: { params: { Page: 2, PageSize: 500, Status: 'Staged', PackageId: 'package-1' } },
    });
  });

  it('uses BE endpoints and PascalCase payloads for staging actions', async () => {
    const http = new FakeHttpClient();
    const repository = new ShippingRepository(http);

    await repository.stagePackage({
      packageId: 'package-1',
      shipmentReference: 'SHIP-001',
      stagingLaneCode: 'STAGE-A',
      evidenceRefs: ['scan:stage'],
      idempotencyKey: 'stage-1',
    });
    await repository.assignDock('staging-1', {
      dockDoorCode: 'DOCK-01',
      evidenceRefs: ['dock:scan'],
      idempotencyKey: 'dock-1',
    });
    await repository.assignTruck('staging-1', {
      truckReference: 'TRUCK-001',
      vehicleNumber: '51C-001',
      idempotencyKey: 'truck-1',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['post', '/shipping/staging/packages'],
      ['post', '/shipping/staging/packages/staging-1/dock'],
      ['post', '/shipping/staging/packages/staging-1/truck'],
    ]);
    expect(http.calls[0].body).toMatchObject({
      PackageId: 'package-1',
      ShipmentReference: 'SHIP-001',
      StagingLaneCode: 'STAGE-A',
      IdempotencyKey: 'stage-1',
    });
    expect(http.calls[1].body).toMatchObject({
      DockDoorCode: 'DOCK-01',
      IdempotencyKey: 'dock-1',
    });
    expect(http.calls[2].body).toMatchObject({
      TruckReference: 'TRUCK-001',
      VehicleNumber: '51C-001',
      IdempotencyKey: 'truck-1',
    });
  });
});
