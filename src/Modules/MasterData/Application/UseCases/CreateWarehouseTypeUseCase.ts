import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { WarehouseType } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { CreateWarehouseTypeInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class CreateWarehouseTypeUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(input: CreateWarehouseTypeInput): Promise<WarehouseType> {
    return this.masterDataRepository.createWarehouseType(input);
  }
}
