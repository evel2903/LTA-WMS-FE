import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { Warehouse } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { CreateWarehouseInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class CreateWarehouseUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(input: CreateWarehouseInput): Promise<Warehouse> {
    return this.masterDataRepository.createWarehouse(input);
  }
}
