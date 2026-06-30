import { useQuery } from '@tanstack/react-query';

import { ListWarehouseTypesUseCase } from '@modules/MasterData/Application/UseCases/ListWarehouseTypesUseCase';
import { masterDataQueryKeys } from '@modules/MasterData/Application/Queries/MasterDataQueryKeys';
import { MASTER_DATA_MAX_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type { MasterDataListFilter } from '@modules/MasterData/Domain/Types/MasterDataQuery';
import { masterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance';

const listWarehouseTypesUseCase = new ListWarehouseTypesUseCase(masterDataRepository);

export function useWarehouseTypes(filter: MasterDataListFilter = {}) {
  return useQuery({
    queryKey: masterDataQueryKeys.warehouseTypes(filter),
    queryFn: () => listWarehouseTypesUseCase.execute(filter),
  });
}

export function useActiveWarehouseTypes() {
  const filter: MasterDataListFilter = { status: 'Active', pageSize: MASTER_DATA_MAX_PAGE_SIZE };
  return useWarehouseTypes(filter);
}
