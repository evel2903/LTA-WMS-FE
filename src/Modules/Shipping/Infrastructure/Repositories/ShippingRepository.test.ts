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
  LoadReference: null,
  LoadedAt: null,
  LoadedBy: null,
  ShipmentConfirmedAt: null,
  ShipmentConfirmedBy: null,
  GateOutReference: null,
  GateOutAt: null,
  GateOutBy: null,
  GoodsIssueTrigger: null,
  GoodsIssueTriggerStatus: null,
  GoodsIssueTriggeredAt: null,
  GoodsIssueTriggeredBy: null,
  GoodsIssueStatus: null,
  GoodsIssuePostedAt: null,
  GoodsIssuePostedBy: null,
  GoodsIssueInventoryTransactionId: null,
  GoodsIssueInventoryMovementId: null,
  LoadingOutboxMessageId: null,
  ShipmentConfirmOutboxMessageId: null,
  GateOutOutboxMessageId: null,
  GoodsIssueTriggerOutboxMessageId: null,
  GoodsIssueOutboxMessageId: null,
  ShipmentClosedOutboxMessageId: null,
  ShipmentClosedAt: null,
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
  it('uses default PageSize and clamps oversize values to the V1 max', async () => {
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
      config: { params: { Page: 2, PageSize: 100, Status: 'Staged', PackageId: 'package-1' } },
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
    await repository.scanLoading('staging-1', {
      scannedPackageCode: 'PKG-001',
      shipmentReference: 'SHIP-001',
      loadReference: 'LOAD-001',
      idempotencyKey: 'loading-1',
    });
    await repository.confirmShipment('staging-1', {
      shipmentReference: 'SHIP-001',
      requireFullLoad: true,
      idempotencyKey: 'confirm-1',
    });
    await repository.recordGateOut('staging-1', {
      gateOutReference: 'GATE-OUT-001',
      truckReference: 'TRUCK-001',
      idempotencyKey: 'gate-out-1',
    });
    await repository.evaluateGoodsIssueTrigger('staging-1', {
      goodsIssueTrigger: 'at_gate_out',
      evidenceRefs: ['gi:evidence'],
      idempotencyKey: 'gi-trigger-1',
    });
    await repository.postGoodsIssue('staging-1', {
      reasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
      evidenceRefs: ['gi:post'],
      idempotencyKey: 'gi-1',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['post', '/shipping/staging/packages'],
      ['post', '/shipping/staging/packages/staging-1/dock'],
      ['post', '/shipping/staging/packages/staging-1/truck'],
      ['post', '/shipping/staging/packages/staging-1/loading'],
      ['post', '/shipping/staging/packages/staging-1/confirm'],
      ['post', '/shipping/staging/packages/staging-1/gate-out'],
      ['post', '/shipping/staging/packages/staging-1/goods-issue-trigger'],
      ['post', '/shipping/staging/packages/staging-1/goods-issue'],
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
    expect(http.calls[3].body).toMatchObject({
      ScannedPackageCode: 'PKG-001',
      ShipmentReference: 'SHIP-001',
      LoadReference: 'LOAD-001',
      IdempotencyKey: 'loading-1',
    });
    expect(http.calls[4].body).toMatchObject({
      ShipmentReference: 'SHIP-001',
      RequireFullLoad: true,
      IdempotencyKey: 'confirm-1',
    });
    expect(http.calls[5].body).toMatchObject({
      GateOutReference: 'GATE-OUT-001',
      TruckReference: 'TRUCK-001',
      IdempotencyKey: 'gate-out-1',
    });
    expect(http.calls[6].body).toMatchObject({
      GoodsIssueTrigger: 'at_gate_out',
      EvidenceRefs: ['gi:evidence'],
      IdempotencyKey: 'gi-trigger-1',
    });
    expect(http.calls[7].body).toMatchObject({
      ReasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
      EvidenceRefs: ['gi:post'],
      IdempotencyKey: 'gi-1',
    });
  });
});
