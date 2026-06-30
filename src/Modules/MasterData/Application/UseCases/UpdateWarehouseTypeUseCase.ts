import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { WarehouseType } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { UpdateWarehouseTypeInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class UpdateWarehouseTypeUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(id: string, input: UpdateWarehouseTypeInput): Promise<WarehouseType> {
    return this.masterDataRepository.updateWarehouseType(id, input);
  }
}
