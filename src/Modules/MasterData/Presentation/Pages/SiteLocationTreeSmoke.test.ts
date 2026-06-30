import { describe, expect, it } from 'vitest';

import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import { CreateLocationUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationUseCase';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { CreateZoneUseCase } from '@modules/MasterData/Application/UseCases/CreateZoneUseCase';
import { GetSiteLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetSiteLocationTreeUseCase';
import type {
  CreateLocationInput,
  CreateLocationProfileInput,
  CreateSiteInput,
  CreateWarehouseInput,
  CreateWarehouseTypeInput,
  CreateZoneInput,
  LocationTree,
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
import type { MasterDataListFilter } from '@modules/MasterData/Domain/Types/MasterDataQuery';

class InMemoryMasterDataRepository implements IMasterDataRepository {
  private sites: Site[] = [];
  private warehouses: Warehouse[] = [];
  private warehouseTypes: WarehouseType[] = [];
  private zones: Zone[] = [];
  private locations: LocationTree[] = [];
  private profiles: LocationProfile[] = [];

  private readonly now = '2026-06-18T00:00:00.000Z';

  listSites(_filter?: MasterDataListFilter) {
    return Promise.resolve({
      items: this.sites,
      page: 1,
      pageSize: 100,
      totalItems: this.sites.length,
      totalPages: 1,
    });
  }

  listWarehouses(_filter?: MasterDataListFilter) {
    return Promise.resolve({
      items: this.warehouses,
      page: 1,
      pageSize: 100,
      totalItems: this.warehouses.length,
      totalPages: 1,
    });
  }

  listWarehouseTypes(_filter?: MasterDataListFilter) {
    return Promise.resolve({
      items: this.warehouseTypes,
      page: 1,
      pageSize: 100,
      totalItems: this.warehouseTypes.length,
      totalPages: 1,
    });
  }

  listZones(_filter?: MasterDataListFilter) {
    return Promise.resolve({
      items: this.zones,
      page: 1,
      pageSize: 100,
      totalItems: this.zones.length,
      totalPages: 1,
    });
  }

  listLocationProfiles(_filter?: MasterDataListFilter) {
    return Promise.resolve({
      items: this.profiles,
      page: 1,
      pageSize: 100,
      totalItems: this.profiles.length,
      totalPages: 1,
    });
  }

  getLocationTree() {
    return Promise.resolve(this.locations);
  }

  createSite(input: CreateSiteInput): Promise<Site> {
    const site: Site = {
      id: 'site-1',
      siteCode: input.siteCode,
      siteName: input.siteName,
      status: input.status,
      sourceSystem: input.sourceSystem ?? null,
      referenceId: input.referenceId ?? null,
      createdAt: this.now,
      updatedAt: this.now,
      createdBy: null,
      updatedBy: null,
    };
    this.sites.push(site);
    return Promise.resolve(site);
  }

  updateSite(): Promise<Site> {
    return Promise.resolve(this.sites[0]);
  }

  createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
    const warehouse: Warehouse = {
      id: 'wh-1',
      siteId: input.siteId,
      warehouseCode: input.warehouseCode,
      warehouseName: input.warehouseName,
      warehouseTypeCode: input.warehouseTypeCode,
      status: input.status,
      timezone: input.timezone ?? null,
      sourceSystem: input.sourceSystem ?? null,
      referenceId: input.referenceId ?? null,
      createdAt: this.now,
      updatedAt: this.now,
      createdBy: null,
      updatedBy: null,
    };
    this.warehouses.push(warehouse);
    return Promise.resolve(warehouse);
  }

  updateWarehouse(): Promise<Warehouse> {
    return Promise.resolve(this.warehouses[0]);
  }

  createWarehouseType(input: CreateWarehouseTypeInput): Promise<WarehouseType> {
    const warehouseType: WarehouseType = {
      id: `wt-${this.warehouseTypes.length + 1}`,
      warehouseTypeCode: input.warehouseTypeCode,
      warehouseTypeName: input.warehouseTypeName,
      description: input.description ?? null,
      status: input.status,
      sourceSystem: input.sourceSystem ?? null,
      referenceId: input.referenceId ?? null,
      createdAt: this.now,
      updatedAt: this.now,
      createdBy: null,
      updatedBy: null,
    };
    this.warehouseTypes.push(warehouseType);
    return Promise.resolve(warehouseType);
  }

  updateWarehouseType(_id: string, input: UpdateWarehouseTypeInput): Promise<WarehouseType> {
    const warehouseType = { ...this.warehouseTypes[0], ...input };
    this.warehouseTypes[0] = warehouseType;
    return Promise.resolve(warehouseType);
  }

  createZone(input: CreateZoneInput): Promise<Zone> {
    const zone: Zone = {
      id: 'zone-1',
      warehouseId: input.warehouseId,
      zoneCode: input.zoneCode,
      zoneName: input.zoneName,
      zoneType: input.zoneType,
      status: input.status,
      sequence: input.sequence ?? null,
      temperatureClass: input.temperatureClass ?? null,
      complianceFlags: input.complianceFlags ?? {},
      sourceSystem: input.sourceSystem ?? null,
      referenceId: input.referenceId ?? null,
      createdAt: this.now,
      updatedAt: this.now,
      createdBy: null,
      updatedBy: null,
    };
    this.zones.push(zone);
    return Promise.resolve(zone);
  }

  updateZone(): Promise<Zone> {
    return Promise.resolve(this.zones[0]);
  }

  createLocation(input: CreateLocationInput): Promise<Location> {
    const location: LocationTree = {
      id: 'loc-1',
      warehouseId: input.warehouseId,
      zoneId: input.zoneId,
      parentLocationId: input.parentLocationId ?? null,
      locationCode: input.locationCode,
      locationName: input.locationName,
      locationType: input.locationType,
      locationProfileId: input.locationProfileId,
      locationStatus: input.locationStatus,
      capacityQty: input.capacityQty ?? null,
      capacityVolume: input.capacityVolume ?? null,
      capacityWeight: input.capacityWeight ?? null,
      palletSlot: input.palletSlot ?? null,
      temperatureClass: input.temperatureClass ?? null,
      dgCompatibilityGroup: input.dgCompatibilityGroup ?? null,
      bondedFlag: input.bondedFlag ?? false,
      ownerRestriction: input.ownerRestriction ?? null,
      mixSkuPolicy: input.mixSkuPolicy ?? null,
      mixLotPolicy: input.mixLotPolicy ?? null,
      mixOwnerPolicy: input.mixOwnerPolicy ?? null,
      pickSequence: input.pickSequence ?? null,
      putawaySequence: input.putawaySequence ?? null,
      sourceSystem: input.sourceSystem ?? null,
      referenceId: input.referenceId ?? null,
      createdAt: this.now,
      updatedAt: this.now,
      createdBy: null,
      updatedBy: null,
      children: [],
    };
    this.locations.push(location);
    return Promise.resolve(location);
  }

  updateLocation(): Promise<Location> {
    return Promise.resolve(this.locations[0]);
  }

  getLocationProfile(): Promise<LocationProfile> {
    return Promise.resolve(this.profiles[0]);
  }

  createLocationProfile(input: CreateLocationProfileInput): Promise<LocationProfile> {
    const profile: LocationProfile = {
      id: `profile-${this.profiles.length + 1}`,
      profileCode: input.profileCode,
      profileName: input.profileName,
      locationType: input.locationType,
      version: 1,
      status: input.status,
      capacityPolicy: input.capacityPolicy ?? {},
      eligibilityPolicy: input.eligibilityPolicy ?? {},
      mixPolicy: input.mixPolicy ?? {},
      compliancePolicy: input.compliancePolicy ?? {},
      operationPolicy: input.operationPolicy ?? {},
      sourceSystem: input.sourceSystem ?? null,
      referenceId: input.referenceId ?? null,
      createdAt: this.now,
      updatedAt: this.now,
      createdBy: null,
      updatedBy: null,
    };
    this.profiles.push(profile);
    return Promise.resolve(profile);
  }

  updateLocationProfile(id: string, input: UpdateLocationProfileInput): Promise<LocationProfile> {
    const index = this.profiles.findIndex((profile) => profile.id === id);
    this.profiles[index] = {
      ...this.profiles[index],
      ...input,
      updatedAt: this.now,
    };
    return Promise.resolve(this.profiles[index]);
  }
}

describe('Site Location Tree smoke', () => {
  it('creates Site -> Warehouse -> Zone -> Location and renders the path in the tree use case', async () => {
    const repository = new InMemoryMasterDataRepository();

    const site = await new CreateSiteUseCase(repository).execute({
      siteCode: 'SITE-01',
      siteName: 'Main Site',
      status: 'Active',
    });
    const warehouse = await new CreateWarehouseUseCase(repository).execute({
      siteId: site.id,
      warehouseCode: 'WH-01',
      warehouseName: 'Tier 1 Warehouse',
      warehouseTypeCode: 'WT-01',
      status: 'Active',
    });
    const zone = await new CreateZoneUseCase(repository).execute({
      warehouseId: warehouse.id,
      zoneCode: 'ZONE-A',
      zoneName: 'Ambient Zone',
      zoneType: 'Ambient',
      status: 'Active',
    });
    await new CreateLocationUseCase(repository).execute({
      warehouseId: warehouse.id,
      zoneId: zone.id,
      parentLocationId: null,
      locationCode: 'A-01-01',
      locationName: 'Aisle 01 Rack 01',
      locationType: 'Bin',
      locationProfileId: 'profile-1',
      locationStatus: 'Active',
    });

    const tree = await new GetSiteLocationTreeUseCase(repository).execute();

    expect(tree[0]?.label).toBe('SITE-01 - Main Site');
    expect(tree[0]?.children[0]?.label).toBe('WH-01 - Tier 1 Warehouse');
    expect(tree[0]?.children[0]?.children[0]?.label).toBe('ZONE-A - Ambient Zone');
    expect(tree[0]?.children[0]?.children[0]?.children[0]?.label).toBe(
      'A-01-01 - Aisle 01 Rack 01',
    );
  });
});
