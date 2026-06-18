import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type { Site } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { CreateSiteInput } from '@modules/MasterData/Domain/Types/MasterDataTree';

export class CreateSiteUseCase {
  constructor(private readonly masterDataRepository: IMasterDataRepository) {}

  execute(input: CreateSiteInput): Promise<Site> {
    return this.masterDataRepository.createSite(input);
  }
}
