import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { MasterDataListFilter } from '@modules/MasterData/Domain/Types/MasterDataQuery';

export class ListWarehouseTypesUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(filter: MasterDataListFilter = {}) {
    return this.masterDataRepository.listWarehouseTypes(filter);
  }
}
