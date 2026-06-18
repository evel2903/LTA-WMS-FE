import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { Zone } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { UpdateZoneInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class UpdateZoneUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(id: string, input: UpdateZoneInput): Promise<Zone> {
    return this.masterDataRepository.updateZone(id, input);
  }
}
