import { describe, expect, it } from 'vitest';

import type {
  LocationDto,
  LocationProfileDto,
  LocationTreeDto,
  PagedMasterDataDto,
  SiteDto,
  WarehouseDto,
  ZoneDto,
} from '@modules/MasterData/Infrastructure/Dtos/MasterDataDtos';
import { MasterDataMapper } from '@modules/MasterData/Infrastructure/Mappers/MasterDataMapper';

const siteDto: SiteDto = {
  Id: 'site-1',
  SiteCode: 'SITE-01',
  SiteName: 'Main Site',
  Status: 'Active',
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const warehouseDto: WarehouseDto = {
  Id: 'wh-1',
  SiteId: 'site-1',
  WarehouseCode: 'WH-01',
  WarehouseName: 'Tier 1 Warehouse',
  WarehouseTypeCode: 'WT-01',
  Status: 'Active',
  Timezone: 'Asia/Bangkok',
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const zoneDto: ZoneDto = {
  Id: 'zone-1',
  WarehouseId: 'wh-1',
  ZoneCode: 'ZONE-A',
  ZoneName: 'Ambient Zone',
  ZoneType: 'Ambient',
  Status: 'Active',
  Sequence: 10,
  TemperatureClass: 'Ambient',
  ComplianceFlags: { bonded: false },
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const locationProfileDto: LocationProfileDto = {
  Id: 'profile-1',
  ProfileCode: 'BIN-STD',
  ProfileName: 'Standard Bin',
  LocationType: 'Bin',
  Version: 1,
  Status: 'Active',
  CapacityPolicy: { maxQty: 100 },
  EligibilityPolicy: { pickable: true },
  MixPolicy: { sku: 'SingleSku' },
  CompliancePolicy: { bondedAllowed: false },
  OperationPolicy: { pickSequenceRequired: true },
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

const locationDto: LocationDto = {
  Id: 'loc-1',
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
  CapacityQty: 100,
  CapacityVolume: null,
  CapacityWeight: null,
  PalletSlot: null,
  TemperatureClass: 'Ambient',
  DgCompatibilityGroup: null,
  BondedFlag: false,
  OwnerRestriction: null,
  MixSkuPolicy: 'SingleSku',
  MixLotPolicy: 'SingleLot',
  MixOwnerPolicy: 'SingleOwner',
  PickSequence: 10,
  PutawaySequence: 20,
  SourceSystem: null,
  ReferenceId: null,
  CreatedAt: '2026-06-18T00:00:00.000Z',
  UpdatedAt: '2026-06-18T00:00:00.000Z',
  CreatedBy: null,
  UpdatedBy: null,
};

describe('MasterDataMapper', () => {
  it('maps PascalCase backend DTOs to camelCase domain entities', () => {
    expect(MasterDataMapper.toSite(siteDto)).toMatchObject({
      id: 'site-1',
      siteCode: 'SITE-01',
      siteName: 'Main Site',
      status: 'Active',
    });
    expect(MasterDataMapper.toWarehouse(warehouseDto)).toMatchObject({
      id: 'wh-1',
      siteId: 'site-1',
      warehouseCode: 'WH-01',
      warehouseTypeCode: 'WT-01',
    });
    expect(MasterDataMapper.toZone(zoneDto)).toMatchObject({
      id: 'zone-1',
      warehouseId: 'wh-1',
      complianceFlags: { bonded: false },
    });
    expect(MasterDataMapper.toLocation(locationDto)).toMatchObject({
      id: 'loc-1',
      locationCode: 'A-01-01',
      locationProfileId: 'profile-1',
      locationStatus: 'Active',
      aisleCode: 'A01',
      rackCode: 'R01',
      levelCode: 'L01',
      binCode: 'B01',
      mixSkuPolicy: 'SingleSku',
    });
    expect(MasterDataMapper.toLocationProfile(locationProfileDto)).toMatchObject({
      id: 'profile-1',
      profileCode: 'BIN-STD',
      capacityPolicy: { maxQty: 100 },
      operationPolicy: { pickSequenceRequired: true },
    });
  });

  it('maps paged list envelopes from Items/Meta to frontend pagination shape', () => {
    const paged: PagedMasterDataDto<SiteDto> = {
      Items: [siteDto],
      Meta: { Page: 2, PageSize: 10, TotalItems: 11, TotalPages: 2 },
    };

    expect(MasterDataMapper.toPaged(paged, (item) => MasterDataMapper.toSite(item))).toEqual({
      items: [expect.objectContaining({ id: 'site-1' })],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    });
  });

  it('returns an empty page instead of throwing when the envelope has no Items/Meta', () => {
    const empty = MasterDataMapper.toPaged(
      undefined as unknown as PagedMasterDataDto<SiteDto>,
      (item) => MasterDataMapper.toSite(item),
    );
    expect(empty).toEqual({ items: [], page: 1, pageSize: 0, totalItems: 0, totalPages: 0 });

    const partial = MasterDataMapper.toPaged(
      { Items: undefined, Meta: undefined } as unknown as PagedMasterDataDto<SiteDto>,
      (item) => MasterDataMapper.toSite(item),
    );
    expect(partial.items).toEqual([]);
    expect(partial.totalItems).toBe(0);
  });

  it('maps nested LocationTreeDto children recursively', () => {
    const treeDto: LocationTreeDto = {
      ...locationDto,
      Children: [
        {
          ...locationDto,
          Id: 'loc-child',
          ParentLocationId: 'loc-1',
          LocationCode: 'A-01-01-01',
          Children: [],
        },
      ],
    };

    expect(MasterDataMapper.toLocationTree(treeDto)).toMatchObject({
      id: 'loc-1',
      children: [{ id: 'loc-child', parentLocationId: 'loc-1' }],
    });
  });

  it('defends against a leaf node missing its Children array', () => {
    const leaf = { ...locationDto, Children: undefined } as unknown as LocationTreeDto;

    expect(MasterDataMapper.toLocationTree(leaf).children).toEqual([]);
  });

  it('keeps create/update payloads in PascalCase for backend contract', () => {
    expect(
      MasterDataMapper.toCreateSiteRequest({
        siteCode: 'SITE-01',
        siteName: 'Main Site',
        status: 'Active',
        reasonCode: 'RC-MD-CREATE',
      }),
    ).toEqual({
      SiteCode: 'SITE-01',
      SiteName: 'Main Site',
      Status: 'Active',
      ReasonCode: 'RC-MD-CREATE',
    });

    expect(
      MasterDataMapper.toUpdateSiteRequest({
        siteName: 'Main Site Updated',
        reasonCode: 'RC-MD-UPDATE',
      }),
    ).toEqual({
      SiteName: 'Main Site Updated',
      ReasonCode: 'RC-MD-UPDATE',
    });

    expect(
      MasterDataMapper.toCreateWarehouseRequest({
        siteId: 'site-1',
        warehouseCode: 'WH-01',
        warehouseName: 'Main Warehouse',
        warehouseTypeCode: 'WT-01',
        status: 'Active',
        reasonCode: 'RC-MD-CREATE',
      }),
    ).toEqual({
      SiteId: 'site-1',
      WarehouseCode: 'WH-01',
      WarehouseName: 'Main Warehouse',
      WarehouseTypeCode: 'WT-01',
      Status: 'Active',
      ReasonCode: 'RC-MD-CREATE',
    });

    expect(
      MasterDataMapper.toCreateZoneRequest({
        warehouseId: 'wh-1',
        zoneCode: 'ZONE-A',
        zoneName: 'Zone A',
        zoneType: 'Storage',
        status: 'Active',
        reasonCode: 'RC-MD-CREATE',
      }),
    ).toEqual({
      WarehouseId: 'wh-1',
      ZoneCode: 'ZONE-A',
      ZoneName: 'Zone A',
      ZoneType: 'Storage',
      Status: 'Active',
      ReasonCode: 'RC-MD-CREATE',
    });

    expect(
      MasterDataMapper.toCreateLocationRequest({
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
        bondedFlag: false,
        reasonCode: 'RC-MD-CREATE',
      }),
    ).toEqual({
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
      BondedFlag: false,
      ReasonCode: 'RC-MD-CREATE',
    });

    expect(
      MasterDataMapper.toUpdateLocationRequest({
        aisleCode: 'A02',
        rackCode: null,
        levelCode: 'L02',
        binCode: 'B02',
        reasonCode: 'RC-MD-UPDATE',
      }),
    ).toEqual({
      AisleCode: 'A02',
      RackCode: null,
      LevelCode: 'L02',
      BinCode: 'B02',
      ReasonCode: 'RC-MD-UPDATE',
    });

    expect(
      MasterDataMapper.toCreateLocationProfileRequest({
        profileCode: 'BIN-STD',
        profileName: 'Standard Bin',
        locationType: 'Bin',
        status: 'Active',
        capacityPolicy: { maxQty: 100 },
        reasonCode: 'RC-MD-UPDATE',
      }),
    ).toEqual({
      ProfileCode: 'BIN-STD',
      ProfileName: 'Standard Bin',
      LocationType: 'Bin',
      Status: 'Active',
      CapacityPolicy: { maxQty: 100 },
      ReasonCode: 'RC-MD-UPDATE',
    });

    expect(
      MasterDataMapper.toUpdateLocationProfileRequest({
        profileName: 'Updated Bin',
        status: 'Inactive',
        version: 2,
      }),
    ).toEqual({
      ProfileName: 'Updated Bin',
      Status: 'Inactive',
      Version: 2,
    });
  });
});
