import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { Location } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { CreateLocationInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class CreateLocationUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(input: CreateLocationInput): Promise<Location> {
    return this.masterDataRepository.createLocation(input);
  }
}
