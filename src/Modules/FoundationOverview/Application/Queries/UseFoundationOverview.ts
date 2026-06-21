import { useQuery } from '@tanstack/react-query';

import { BuildFoundationOverviewUseCase } from '@modules/FoundationOverview/Application/UseCases/BuildFoundationOverviewUseCase';
import { foundationOverviewQueryKeys } from '@modules/FoundationOverview/Application/Queries/FoundationOverviewQueryKeys';
import { GetSiteLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetSiteLocationTreeUseCase';
import { masterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance';
import { warehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance';

export function useFoundationOverview() {
  return useQuery({
    queryKey: foundationOverviewQueryKeys.overview(),
    queryFn: async () => {
      const buildFoundationOverview = new BuildFoundationOverviewUseCase();
      const getSiteLocationTree = new GetSiteLocationTreeUseCase(masterDataRepository);
      const [locationTree, profiles] = await Promise.all([
        getSiteLocationTree.execute({ status: 'Active' }),
        warehouseProfileRepository.listProfiles({ status: 'ACTIVE', page: 1, pageSize: 100 }),
      ]);

      const checklistPairs = await Promise.all(
        profiles.items.map(
          async (profile) =>
            [profile.id, await warehouseProfileRepository.getChecklist(profile.id)] as const,
        ),
      );

      return buildFoundationOverview.execute({
        locationTree,
        activeProfiles: profiles.items,
        checklists: Object.fromEntries(checklistPairs),
      });
    },
  });
}
