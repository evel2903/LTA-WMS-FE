import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { masterDataQueryKeys } from '@modules/MasterData/Application/Queries/MasterDataQueryKeys';
import type { MasterDataListFilter } from '@modules/MasterData/Domain/Types/MasterDataQuery';
import { masterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance';

export function useLocationProfiles(filter: MasterDataListFilter = { status: 'Active' }) {
  return useQuery({
    queryKey: masterDataQueryKeys.locationProfiles(filter),
    queryFn: () => masterDataRepository.listLocationProfiles(filter),
    placeholderData: keepPreviousData,
  });
}

export function useLocationProfile(id: string | null) {
  return useQuery({
    queryKey: masterDataQueryKeys.locationProfile(id ?? ''),
    queryFn: () => masterDataRepository.getLocationProfile(id ?? ''),
    enabled: Boolean(id),
  });
}
