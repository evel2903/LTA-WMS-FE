import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import {
  MASTER_DATA_DEFAULT_PAGE_SIZE,
  MASTER_DATA_MAX_PAGE_SIZE,
} from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type {
  Location,
  LocationProfile,
  LocationTree,
  Site,
  Warehouse,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  CreateLocationInput,
  CreateLocationProfileInput,
  CreateSiteInput,
  CreateWarehouseInput,
  CreateZoneInput,
  UpdateLocationInput,
  UpdateLocationProfileInput,
  UpdateSiteInput,
  UpdateWarehouseInput,
  UpdateZoneInput,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import type {
  LocationTreeFilter,
  MasterDataListFilter,
} from '@modules/MasterData/Domain/Types/MasterDataQuery';
import { MASTER_DATA_ENDPOINTS } from '@modules/MasterData/Infrastructure/Api/MasterDataEndpoints';
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

function listParams(filter: MasterDataListFilter = {}) {
  const requestedPageSize = filter.pageSize ?? MASTER_DATA_DEFAULT_PAGE_SIZE;

  return {
    Page: !filter.page || filter.page < 1 ? 1 : filter.page,
    PageSize:
      requestedPageSize < 1
        ? MASTER_DATA_DEFAULT_PAGE_SIZE
        : Math.min(requestedPageSize, MASTER_DATA_MAX_PAGE_SIZE),
    Status: filter.status,
    SiteId: filter.siteId,
    SiteCode: filter.siteCode,
    WarehouseId: filter.warehouseId,
    WarehouseCode: filter.warehouseCode,
    ZoneId: filter.zoneId,
    ZoneCode: filter.zoneCode,
    LocationStatus: filter.locationStatus,
    LocationType: filter.locationType,
    LocationProfileId: filter.locationProfileId,
    LocationCode: filter.locationCode,
    ProfileCode: filter.profileCode,
  };
}

export class MasterDataRepository implements IMasterDataRepository {
  constructor(private readonly http: HttpClient) {}

  async listSites(filter?: MasterDataListFilter): Promise<PaginatedResponse<Site>> {
    const dto = await this.http.get<PagedMasterDataDto<SiteDto>>(MASTER_DATA_ENDPOINTS.SITES, {
      params: listParams(filter),
    });
    return MasterDataMapper.toPaged(dto, (item) => MasterDataMapper.toSite(item));
  }

  async listWarehouses(filter?: MasterDataListFilter): Promise<PaginatedResponse<Warehouse>> {
    const dto = await this.http.get<PagedMasterDataDto<WarehouseDto>>(
      MASTER_DATA_ENDPOINTS.WAREHOUSES,
      { params: listParams(filter) },
    );
    return MasterDataMapper.toPaged(dto, (item) => MasterDataMapper.toWarehouse(item));
  }

  async listZones(filter?: MasterDataListFilter): Promise<PaginatedResponse<Zone>> {
    const dto = await this.http.get<PagedMasterDataDto<ZoneDto>>(MASTER_DATA_ENDPOINTS.ZONES, {
      params: listParams(filter),
    });
    return MasterDataMapper.toPaged(dto, (item) => MasterDataMapper.toZone(item));
  }

  async listLocationProfiles(
    filter?: MasterDataListFilter,
  ): Promise<PaginatedResponse<LocationProfile>> {
    const dto = await this.http.get<PagedMasterDataDto<LocationProfileDto>>(
      MASTER_DATA_ENDPOINTS.LOCATION_PROFILES,
      { params: listParams(filter) },
    );
    return MasterDataMapper.toPaged(dto, (item) => MasterDataMapper.toLocationProfile(item));
  }

  async getLocationTree(filter: LocationTreeFilter): Promise<LocationTree[]> {
    const dto = await this.http.get<LocationTreeDto[]>(MASTER_DATA_ENDPOINTS.LOCATION_TREE, {
      params: {
        WarehouseId: filter.warehouseId,
        ZoneId: filter.zoneId,
      },
    });
    // Defend against a null/empty payload so a warehouse with no locations
    // resolves to an empty tree instead of throwing.
    return (dto ?? []).map((item) => MasterDataMapper.toLocationTree(item));
  }

  async getLocationProfile(id: string): Promise<LocationProfile> {
    const dto = await this.http.get<LocationProfileDto>(
      MASTER_DATA_ENDPOINTS.LOCATION_PROFILE_BY_ID(id),
    );
    return MasterDataMapper.toLocationProfile(dto);
  }

  async createSite(input: CreateSiteInput): Promise<Site> {
    const dto = await this.http.post<SiteDto>(
      MASTER_DATA_ENDPOINTS.SITES,
      MasterDataMapper.toCreateSiteRequest(input),
    );
    return MasterDataMapper.toSite(dto);
  }

  async updateSite(id: string, input: UpdateSiteInput): Promise<Site> {
    const dto = await this.http.patch<SiteDto>(
      MASTER_DATA_ENDPOINTS.SITE_BY_ID(id),
      MasterDataMapper.toUpdateSiteRequest(input),
    );
    return MasterDataMapper.toSite(dto);
  }

  async createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
    const dto = await this.http.post<WarehouseDto>(
      MASTER_DATA_ENDPOINTS.WAREHOUSES,
      MasterDataMapper.toCreateWarehouseRequest(input),
    );
    return MasterDataMapper.toWarehouse(dto);
  }

  async updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<Warehouse> {
    const dto = await this.http.patch<WarehouseDto>(
      MASTER_DATA_ENDPOINTS.WAREHOUSE_BY_ID(id),
      MasterDataMapper.toUpdateWarehouseRequest(input),
    );
    return MasterDataMapper.toWarehouse(dto);
  }

  async createZone(input: CreateZoneInput): Promise<Zone> {
    const dto = await this.http.post<ZoneDto>(
      MASTER_DATA_ENDPOINTS.ZONES,
      MasterDataMapper.toCreateZoneRequest(input),
    );
    return MasterDataMapper.toZone(dto);
  }

  async updateZone(id: string, input: UpdateZoneInput): Promise<Zone> {
    const dto = await this.http.patch<ZoneDto>(
      MASTER_DATA_ENDPOINTS.ZONE_BY_ID(id),
      MasterDataMapper.toUpdateZoneRequest(input),
    );
    return MasterDataMapper.toZone(dto);
  }

  async createLocation(input: CreateLocationInput): Promise<Location> {
    const dto = await this.http.post<LocationDto>(
      MASTER_DATA_ENDPOINTS.LOCATIONS,
      MasterDataMapper.toCreateLocationRequest(input),
    );
    return MasterDataMapper.toLocation(dto);
  }

  async updateLocation(id: string, input: UpdateLocationInput): Promise<Location> {
    const dto = await this.http.patch<LocationDto>(
      MASTER_DATA_ENDPOINTS.LOCATION_BY_ID(id),
      MasterDataMapper.toUpdateLocationRequest(input),
    );
    return MasterDataMapper.toLocation(dto);
  }

  async createLocationProfile(input: CreateLocationProfileInput): Promise<LocationProfile> {
    const dto = await this.http.post<LocationProfileDto>(
      MASTER_DATA_ENDPOINTS.LOCATION_PROFILES,
      MasterDataMapper.toCreateLocationProfileRequest(input),
    );
    return MasterDataMapper.toLocationProfile(dto);
  }

  async updateLocationProfile(
    id: string,
    input: UpdateLocationProfileInput,
  ): Promise<LocationProfile> {
    const dto = await this.http.patch<LocationProfileDto>(
      MASTER_DATA_ENDPOINTS.LOCATION_PROFILE_BY_ID(id),
      MasterDataMapper.toUpdateLocationProfileRequest(input),
    );
    return MasterDataMapper.toLocationProfile(dto);
  }
}
