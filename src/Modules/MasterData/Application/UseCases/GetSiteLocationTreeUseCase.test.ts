import { afterEach, describe, expect, it, vi } from 'vitest';

import { GetSiteLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetSiteLocationTreeUseCase';
import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type {
  CreateLocationInput,
  CreateLocationProfileInput,
  CreateSiteInput,
  CreateWarehouseInput,
  CreateWarehouseTypeInput,
  CreateZoneInput,
  LocationTree,
  SiteLocationTree,
  UpdateLocationProfileInput,
  UpdateWarehouseTypeInput,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import type {
  Location,
  LocationProfile,
  Site,
  Warehouse,
  WarehouseType,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  LocationTreeFilter,
  MasterDataListFilter,
} from '@modules/MasterData/Domain/Types/MasterDataQuery';

const site: Site = {
  id: 'site-1',
  siteCode: 'SITE-01',
  siteName: 'Main Site',
  status: 'Active',
  sourceSystem: null,
  referenceId: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

const warehouse: Warehouse = {
  id: 'wh-1',
  siteId: 'site-1',
  warehouseCode: 'WH-01',
  warehouseName: 'Tier 1 Warehouse',
  warehouseTypeCode: 'WT-01',
  status: 'Active',
  timezone: 'Asia/Bangkok',
  sourceSystem: null,
  referenceId: null,
  createdAt: site.createdAt,
  updatedAt: site.updatedAt,
  createdBy: null,
  updatedBy: null,
};

const warehouseType: WarehouseType = {
  id: 'wt-1',
  warehouseTypeCode: 'WT-01',
  warehouseTypeName: 'Kho thường',
  description: null,
  status: 'Active',
  sourceSystem: null,
  referenceId: null,
  createdAt: site.createdAt,
  updatedAt: site.updatedAt,
  createdBy: null,
  updatedBy: null,
};

const zone: Zone = {
  id: 'zone-1',
  warehouseId: 'wh-1',
  zoneCode: 'ZONE-A',
  zoneName: 'Ambient Zone',
  zoneType: 'Ambient',
  status: 'Active',
  sequence: 1,
  temperatureClass: 'Ambient',
  complianceFlags: {},
  sourceSystem: null,
  referenceId: null,
  createdAt: site.createdAt,
  updatedAt: site.updatedAt,
  createdBy: null,
  updatedBy: null,
};

const location: Location = {
  id: 'loc-1',
  warehouseId: 'wh-1',
  zoneId: 'zone-1',
  parentLocationId: null,
  locationCode: 'A-01-01',
  locationName: 'Aisle 01 Rack 01',
  locationType: 'Bin',
  locationProfileId: 'profile-1',
  locationStatus: 'Active',
  aisleCode: '01',
  rackCode: '01',
  levelCode: '01',
  binCode: '01',
  capacityQty: 100,
  capacityVolume: null,
  capacityWeight: null,
  palletSlot: null,
  temperatureClass: 'Ambient',
  dgCompatibilityGroup: null,
  bondedFlag: false,
  ownerRestriction: null,
  mixSkuPolicy: 'SingleSku',
  mixLotPolicy: null,
  mixOwnerPolicy: null,
  pickSequence: 10,
  putawaySequence: 20,
  sourceSystem: null,
  referenceId: null,
  createdAt: site.createdAt,
  updatedAt: site.updatedAt,
  createdBy: null,
  updatedBy: null,
};

const locationProfile: LocationProfile = {
  id: 'profile-1',
  profileCode: 'BIN-STD',
  profileName: 'Standard Bin',
  locationType: 'Bin',
  version: 1,
  status: 'Active',
  capacityPolicy: {},
  eligibilityPolicy: {},
  mixPolicy: {},
  compliancePolicy: {},
  operationPolicy: {},
  sourceSystem: null,
  referenceId: null,
  createdAt: site.createdAt,
  updatedAt: site.updatedAt,
  createdBy: null,
  updatedBy: null,
};

class FakeRepository implements IMasterDataRepository {
  listSites(_filter?: MasterDataListFilter) {
    return Promise.resolve({ items: [site], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 });
  }

  listWarehouses(_filter?: MasterDataListFilter) {
    return Promise.resolve({
      items: [warehouse],
      page: 1,
      pageSize: 100,
      totalItems: 1,
      totalPages: 1,
    });
  }

  listWarehouseTypes(_filter?: MasterDataListFilter) {
    return Promise.resolve({
      items: [warehouseType],
      page: 1,
      pageSize: 100,
      totalItems: 1,
      totalPages: 1,
    });
  }

  listZones(_filter?: MasterDataListFilter) {
    return Promise.resolve({ items: [zone], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 });
  }

  listLocationProfiles(_filter?: MasterDataListFilter) {
    return Promise.resolve({
      items: [locationProfile],
      page: 1,
      pageSize: 100,
      totalItems: 1,
      totalPages: 1,
    });
  }

  getLocationTree(_filter: LocationTreeFilter): Promise<LocationTree[]> {
    return Promise.resolve([
      {
        ...location,
        children: [{ ...location, id: 'loc-child', parentLocationId: 'loc-1', children: [] }],
      },
    ]);
  }

  createSite(input: CreateSiteInput): Promise<Site> {
    return Promise.resolve({ ...site, siteCode: input.siteCode, siteName: input.siteName });
  }

  updateSite(): Promise<Site> {
    return Promise.resolve(site);
  }

  createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
    return Promise.resolve({
      ...warehouse,
      warehouseCode: input.warehouseCode,
      warehouseName: input.warehouseName,
    });
  }

  updateWarehouse(): Promise<Warehouse> {
    return Promise.resolve(warehouse);
  }

  createWarehouseType(input: CreateWarehouseTypeInput): Promise<WarehouseType> {
    return Promise.resolve({
      ...warehouseType,
      warehouseTypeCode: input.warehouseTypeCode,
      warehouseTypeName: input.warehouseTypeName,
    });
  }

  updateWarehouseType(_id: string, input: UpdateWarehouseTypeInput): Promise<WarehouseType> {
    return Promise.resolve({ ...warehouseType, ...input });
  }

  createZone(input: CreateZoneInput): Promise<Zone> {
    return Promise.resolve({ ...zone, zoneCode: input.zoneCode, zoneName: input.zoneName });
  }

  updateZone(): Promise<Zone> {
    return Promise.resolve(zone);
  }

  createLocation(input: CreateLocationInput): Promise<Location> {
    return Promise.resolve({
      ...location,
      locationCode: input.locationCode,
      locationName: input.locationName,
      aisleCode: input.aisleCode ?? null,
      rackCode: input.rackCode ?? null,
      levelCode: input.levelCode ?? null,
      binCode: input.binCode ?? null,
    });
  }

  updateLocation(): Promise<Location> {
    return Promise.resolve(location);
  }

  getLocationProfile(): Promise<LocationProfile> {
    return Promise.resolve(locationProfile);
  }

  createLocationProfile(input: CreateLocationProfileInput): Promise<LocationProfile> {
    return Promise.resolve({
      ...locationProfile,
      profileCode: input.profileCode,
      profileName: input.profileName,
    });
  }

  updateLocationProfile(_id: string, input: UpdateLocationProfileInput): Promise<LocationProfile> {
    return Promise.resolve({ ...locationProfile, ...input });
  }
}

describe('GetSiteLocationTreeUseCase', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds Site -> Warehouse -> Zone -> Location hierarchy', async () => {
    const useCase = new GetSiteLocationTreeUseCase(new FakeRepository());

    const tree = await useCase.execute();

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject<Partial<SiteLocationTree>>({
      id: 'site-1',
      type: 'site',
      label: 'SITE-01 - Main Site',
    });
    expect(tree[0]?.children[0]).toMatchObject({
      id: 'wh-1',
      type: 'warehouse',
      label: 'WH-01 - Tier 1 Warehouse',
    });
    expect(tree[0]?.children[0]?.children[0]).toMatchObject({
      id: 'zone-1',
      type: 'zone',
      label: 'ZONE-A - Ambient Zone',
    });
    expect(tree[0]?.children[0]?.children[0]?.children[0]).toMatchObject({
      id: 'loc-1',
      type: 'location',
      label: 'A-01-01 - Aisle 01 Rack 01',
      children: [expect.objectContaining({ id: 'loc-child', type: 'location' })],
    });
  });

  it('filters locations by status consistently with sites/warehouses/zones', async () => {
    const inactiveLocation: Location = {
      ...location,
      id: 'loc-inactive',
      locationCode: 'A-01-02',
      locationName: 'Inactive Bin',
      locationStatus: 'Inactive',
    };

    class StatusRepository extends FakeRepository {
      override getLocationTree(): Promise<LocationTree[]> {
        return Promise.resolve([
          {
            ...location,
            children: [{ ...inactiveLocation, children: [] }],
          },
          { ...inactiveLocation, children: [] },
        ]);
      }
    }

    const useCase = new GetSiteLocationTreeUseCase(new StatusRepository());

    const activeOnly = await useCase.execute({ status: 'Active' });
    const activeLocations = activeOnly[0]?.children[0]?.children[0]?.children ?? [];
    expect(activeLocations.map((node) => node.id)).toEqual(['loc-1']);
    expect(activeLocations[0]?.children).toHaveLength(0);

    const unfiltered = await useCase.execute();
    const allLocations = unfiltered[0]?.children[0]?.children[0]?.children ?? [];
    expect(allLocations.map((node) => node.id)).toEqual(['loc-1', 'loc-inactive']);
  });

  it('keeps the rest of the tree when one warehouse location lookup fails', async () => {
    const warehouseTwo: Warehouse = {
      ...warehouse,
      id: 'wh-2',
      warehouseCode: 'WH-02',
      warehouseName: 'Second Warehouse',
    };

    class PartialFailureRepository extends FakeRepository {
      override listWarehouses() {
        return Promise.resolve({
          items: [warehouse, warehouseTwo],
          page: 1,
          pageSize: 100,
          totalItems: 2,
          totalPages: 1,
        });
      }

      override getLocationTree(filter: LocationTreeFilter): Promise<LocationTree[]> {
        if (filter.warehouseId === 'wh-2') {
          return Promise.reject(new Error('forbidden scope for wh-2'));
        }
        return Promise.resolve([{ ...location, children: [] }]);
      }
    }

    const useCase = new GetSiteLocationTreeUseCase(new PartialFailureRepository());

    const tree = await useCase.execute();

    const warehouses = tree[0]?.children ?? [];
    expect(warehouses.map((node) => node.id)).toEqual(['wh-1', 'wh-2']);
    // wh-1 keeps its location; wh-2 degrades to no locations instead of
    // collapsing the entire tree.
    expect(warehouses[0]?.children[0]?.children.map((node) => node.id)).toEqual(['loc-1']);
  });

  it('warns with the failing warehouse id while still building the rest of the tree', async () => {
    const warehouseTwo: Warehouse = {
      ...warehouse,
      id: 'wh-2',
      warehouseCode: 'WH-02',
      warehouseName: 'Second Warehouse',
    };
    const loadError = new Error('forbidden scope for wh-2');

    class PartialFailureRepository extends FakeRepository {
      override listWarehouses() {
        return Promise.resolve({
          items: [warehouse, warehouseTwo],
          page: 1,
          pageSize: 100,
          totalItems: 2,
          totalPages: 1,
        });
      }

      override getLocationTree(filter: LocationTreeFilter): Promise<LocationTree[]> {
        if (filter.warehouseId === 'wh-2') {
          return Promise.reject(loadError);
        }
        return Promise.resolve([{ ...location, children: [] }]);
      }
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const useCase = new GetSiteLocationTreeUseCase(new PartialFailureRepository());

    const tree = await useCase.execute();

    // The silent swallow is gone: the degrade is logged with the offending
    // warehouse id AND the underlying error, so the failure is observable.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const warnArgs = warnSpy.mock.calls[0] ?? [];
    expect(warnArgs).toContain('wh-2');
    expect(warnArgs).toContain(loadError);
    // The healthy warehouse must not log anything and the tree still builds both.
    const warehouses = tree[0]?.children ?? [];
    expect(warehouses.map((node) => node.id)).toEqual(['wh-1', 'wh-2']);
    expect(warehouses[0]?.children[0]?.children.map((node) => node.id)).toEqual(['loc-1']);
    expect(warehouses[1]?.children).toHaveLength(0);
  });
});
