import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { Warehouse } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { UpdateWarehouseInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class UpdateWarehouseUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(id: string, input: UpdateWarehouseInput): Promise<Warehouse> {
    return this.masterDataRepository.updateWarehouse(id, input);
  }
}
