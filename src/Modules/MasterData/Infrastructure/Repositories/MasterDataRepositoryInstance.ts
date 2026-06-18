import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import { MasterDataRepository } from '@modules/MasterData/Infrastructure/Repositories/MasterDataRepository';

export const masterDataRepository: IMasterDataRepository = new MasterDataRepository(httpClient);
