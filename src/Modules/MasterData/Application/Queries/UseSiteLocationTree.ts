import { useQuery } from '@tanstack/react-query';

import { GetSiteLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetSiteLocationTreeUseCase';
import { masterDataQueryKeys } from '@modules/MasterData/Application/Queries/MasterDataQueryKeys';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type { MasterDataListFilter } from '@modules/MasterData/Domain/Types/MasterDataQuery';
import { masterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance';

const getSiteLocationTree = new GetSiteLocationTreeUseCase(masterDataRepository);

export function useSiteLocationTree(filter: MasterDataListFilter = {}) {
  return useQuery({
    queryKey: masterDataQueryKeys.siteLocationTreeFilter(filter),
    queryFn: () => getSiteLocationTree.execute(filter),
  });
}

export function useActiveWarehouses() {
  const filter: MasterDataListFilter = { status: 'Active', pageSize: MASTER_DATA_DEFAULT_PAGE_SIZE };
  return useQuery({
    queryKey: masterDataQueryKeys.warehouses(filter),
    queryFn: () => masterDataRepository.listWarehouses(filter),
  });
}
