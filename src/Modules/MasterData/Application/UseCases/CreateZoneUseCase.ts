import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { Zone } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { CreateZoneInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class CreateZoneUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(input: CreateZoneInput): Promise<Zone> {
    return this.masterDataRepository.createZone(input);
  }
}
