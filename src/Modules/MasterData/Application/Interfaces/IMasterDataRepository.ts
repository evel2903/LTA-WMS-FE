import type { PaginatedResponse } from '@shared/Types/Api';
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

export interface IMasterDataRepository {
  listSites(filter?: MasterDataListFilter): Promise<PaginatedResponse<Site>>;
  listWarehouses(filter?: MasterDataListFilter): Promise<PaginatedResponse<Warehouse>>;
  listZones(filter?: MasterDataListFilter): Promise<PaginatedResponse<Zone>>;
  listLocationProfiles(filter?: MasterDataListFilter): Promise<PaginatedResponse<LocationProfile>>;
  getLocationTree(filter: LocationTreeFilter): Promise<LocationTree[]>;
  getLocationProfile(id: string): Promise<LocationProfile>;
  createSite(input: CreateSiteInput): Promise<Site>;
  updateSite(id: string, input: UpdateSiteInput): Promise<Site>;
  createWarehouse(input: CreateWarehouseInput): Promise<Warehouse>;
  updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<Warehouse>;
  createZone(input: CreateZoneInput): Promise<Zone>;
  updateZone(id: string, input: UpdateZoneInput): Promise<Zone>;
  createLocation(input: CreateLocationInput): Promise<Location>;
  updateLocation(id: string, input: UpdateLocationInput): Promise<Location>;
  createLocationProfile(input: CreateLocationProfileInput): Promise<LocationProfile>;
  updateLocationProfile(id: string, input: UpdateLocationProfileInput): Promise<LocationProfile>;
}
