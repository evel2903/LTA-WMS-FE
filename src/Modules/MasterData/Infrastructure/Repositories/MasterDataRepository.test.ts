import { describe, expect, it } from 'vitest';

import { MasterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepository';
import type { HttpClient } from '@shared/Services/Http/ApiClient';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    return Promise.resolve(
      (url === '/locations/tree'
        ? []
        : {
            Items: [],
            Meta: { Page: 1, PageSize: 50, TotalItems: 0, TotalPages: 1 },
          }) as T,
    );
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve({ Id: 'new-id', ...(body as object) } as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({ Id: 'updated-id', ...(body as object) } as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({ Id: 'updated-id', ...(body as object) } as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('MasterDataRepository', () => {
  it('calls A1/A2 endpoints through HttpClient only', async () => {
    const http = new FakeHttpClient();
    const repository = new MasterDataRepository(http);

    await repository.listSites({ status: 'Active', page: 1, pageSize: 100 });
    await repository.listWarehouses({ siteId: 'site-1' });
    await repository.listZones({ warehouseId: 'wh-1' });
    await repository.listLocationProfiles({ status: 'Active', pageSize: 500 });
    await repository.getLocationTree({ warehouseId: 'wh-1', zoneId: 'zone-1' });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/sites'],
      ['get', '/warehouses'],
      ['get', '/zones'],
      ['get', '/location-profiles'],
      ['get', '/locations/tree'],
    ]);
    const profileListConfig = http.calls[3]?.config as {
      params: { Status?: string; PageSize?: number };
    };
    expect(profileListConfig.params.Status).toBe('Active');
    expect(profileListConfig.params.PageSize).toBe(100);
    expect(http.calls[4]?.config).toEqual({ params: { WarehouseId: 'wh-1', ZoneId: 'zone-1' } });
  });

  it('normalizes page and page size for master-data list endpoints', async () => {
    const http = new FakeHttpClient();
    const repository = new MasterDataRepository(http);

    await repository.listSites({ page: -2, pageSize: 500 });
    await repository.listSites({ page: 0, pageSize: 0 });

    expect(http.calls[0]?.config).toMatchObject({ params: { Page: 1, PageSize: 100 } });
    expect(http.calls[1]?.config).toMatchObject({ params: { Page: 1, PageSize: 50 } });
  });

  it('returns an empty location tree when the backend responds with a null payload', async () => {
    class NullTreeHttpClient extends FakeHttpClient {
      override get<T>(url: string, config?: unknown): Promise<T> {
        this.calls.push({ method: 'get', url, config });
        return Promise.resolve(null as T);
      }
    }

    const repository = new MasterDataRepository(new NullTreeHttpClient());
    await expect(repository.getLocationTree({ warehouseId: 'wh-1' })).resolves.toEqual([]);
  });

  it('sends PascalCase create/update payloads to backend', async () => {
    const http = new FakeHttpClient();
    const repository = new MasterDataRepository(http);

    await repository.createSite({
      siteCode: 'SITE-01',
      siteName: 'Main Site',
      status: 'Active',
      reasonCode: 'RC-MD-CREATE',
    });
    await repository.updateWarehouse('wh-1', {
      siteId: 'site-1',
      warehouseName: 'Updated Warehouse',
      status: 'Inactive',
      reasonCode: 'RC-MD-UPDATE',
    });
    await repository.createLocation({
      warehouseId: 'wh-1',
      zoneId: 'zone-1',
      parentLocationId: null,
      locationCode: 'A-01-01',
      locationName: 'Aisle 01 Rack 01',
      locationType: 'Bin',
      locationProfileId: 'profile-1',
      locationStatus: 'Active',
      aisleCode: 'A01',
      rackCode: 'R01',
      levelCode: 'L01',
      binCode: 'B01',
      reasonCode: 'RC-MD-CREATE',
    });
    await repository.createLocationProfile({
      profileCode: 'BIN-STD',
      profileName: 'Standard Bin',
      locationType: 'Bin',
      status: 'Active',
      capacityPolicy: { maxQty: 100 },
      reasonCode: 'RC-MD-UPDATE',
    });
    await repository.updateLocationProfile('profile-1', {
      profileName: 'Updated Bin',
      status: 'Inactive',
      version: 2,
      reasonCode: 'RC-MD-UPDATE',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/sites',
      body: {
        SiteCode: 'SITE-01',
        SiteName: 'Main Site',
        Status: 'Active',
        ReasonCode: 'RC-MD-CREATE',
      },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'patch',
      url: '/warehouses/wh-1',
      body: {
        SiteId: 'site-1',
        WarehouseName: 'Updated Warehouse',
        Status: 'Inactive',
        ReasonCode: 'RC-MD-UPDATE',
      },
    });
    expect(http.calls[2]).toMatchObject({
      method: 'post',
      url: '/locations',
      body: {
        WarehouseId: 'wh-1',
        ZoneId: 'zone-1',
        ParentLocationId: null,
        LocationCode: 'A-01-01',
        LocationName: 'Aisle 01 Rack 01',
        LocationType: 'Bin',
        LocationProfileId: 'profile-1',
        LocationStatus: 'Active',
        AisleCode: 'A01',
        RackCode: 'R01',
        LevelCode: 'L01',
        BinCode: 'B01',
        ReasonCode: 'RC-MD-CREATE',
      },
    });
    expect(http.calls[3]).toMatchObject({
      method: 'post',
      url: '/location-profiles',
      body: {
        ProfileCode: 'BIN-STD',
        ProfileName: 'Standard Bin',
        LocationType: 'Bin',
        Status: 'Active',
        CapacityPolicy: { maxQty: 100 },
        ReasonCode: 'RC-MD-UPDATE',
      },
    });
    expect(http.calls[4]).toMatchObject({
      method: 'patch',
      url: '/location-profiles/profile-1',
      body: {
        ProfileName: 'Updated Bin',
        Status: 'Inactive',
        Version: 2,
        ReasonCode: 'RC-MD-UPDATE',
      },
    });
  });
});
