import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type {
  LocationTreeFilter,
  MasterDataListFilter,
} from '@modules/MasterData/Domain/Types/MasterDataQuery';

export const masterDataQueryKeys = {
  all: [QUERY_NAMESPACES.MASTER_DATA] as const,
  siteLocationTree: () => [...masterDataQueryKeys.all, 'siteLocationTree'] as const,
  siteLocationTreeFilter: (filter?: MasterDataListFilter) =>
    [...masterDataQueryKeys.siteLocationTree(), filter ?? {}] as const,
  warehouses: (filter?: MasterDataListFilter) =>
    [...masterDataQueryKeys.all, 'warehouses', filter ?? {}] as const,
  warehouseTypesRoot: () => [...masterDataQueryKeys.all, 'warehouseTypes'] as const,
  warehouseTypes: (filter?: MasterDataListFilter) =>
    [...masterDataQueryKeys.warehouseTypesRoot(), filter ?? {}] as const,
  locationTree: (filter: LocationTreeFilter) =>
    [...masterDataQueryKeys.all, 'locations', 'tree', filter] as const,
  locationProfilesRoot: () => [...masterDataQueryKeys.all, 'locationProfiles'] as const,
  locationProfiles: (filter?: MasterDataListFilter) =>
    [...masterDataQueryKeys.locationProfilesRoot(), filter ?? {}] as const,
  locationProfile: (id: string) =>
    [...masterDataQueryKeys.locationProfilesRoot(), 'detail', id] as const,
};
