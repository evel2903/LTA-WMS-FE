import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { Site } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { UpdateSiteInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class UpdateSiteUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(id: string, input: UpdateSiteInput): Promise<Site> {
    return this.masterDataRepository.updateSite(id, input);
  }
}
