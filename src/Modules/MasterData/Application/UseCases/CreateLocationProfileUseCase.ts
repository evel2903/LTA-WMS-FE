import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { CreateLocationProfileInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class CreateLocationProfileUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(input: CreateLocationProfileInput): Promise<LocationProfile> {
    return this.masterDataRepository.createLocationProfile(input);
  }
}
