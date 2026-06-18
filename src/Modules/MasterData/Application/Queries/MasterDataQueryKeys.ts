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
  locationTree: (filter: LocationTreeFilter) =>
    [...masterDataQueryKeys.all, 'locations', 'tree', filter] as const,
  locationProfiles: (filter?: MasterDataListFilter) =>
    [...masterDataQueryKeys.all, 'locationProfiles', filter ?? {}] as const,
};
