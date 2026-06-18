import { useQuery } from '@tanstack/react-query';

import { GetSiteLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetSiteLocationTreeUseCase';
import { masterDataQueryKeys } from '@modules/MasterData/Application/Queries/MasterDataQueryKeys';
import type { MasterDataListFilter } from '@modules/MasterData/Domain/Types/MasterDataQuery';
import { masterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance';

const getSiteLocationTree = new GetSiteLocationTreeUseCase(masterDataRepository);

export function useSiteLocationTree(filter: MasterDataListFilter = {}) {
  return useQuery({
    queryKey: masterDataQueryKeys.siteLocationTreeFilter(filter),
    queryFn: () => getSiteLocationTree.execute(filter),
  });
}
