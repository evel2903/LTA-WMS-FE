import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { UpdateLocationProfileInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class UpdateLocationProfileUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(id: string, input: UpdateLocationProfileInput): Promise<LocationProfile> {
    return this.masterDataRepository.updateLocationProfile(id, input);
  }
}
