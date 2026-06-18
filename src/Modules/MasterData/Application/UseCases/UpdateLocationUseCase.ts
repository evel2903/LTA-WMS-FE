import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { Location } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { UpdateLocationInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class UpdateLocationUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(id: string, input: UpdateLocationInput): Promise<Location> {
    return this.masterDataRepository.updateLocation(id, input);
  }
}
