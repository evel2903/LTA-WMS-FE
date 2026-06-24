import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IPackingRepository } from '@modules/Packing/Application/Interfaces/IPackingRepository';
import { PackingRepository } from '@modules/Packing/Infrastructure/Repositories/PackingRepository';

export const packingRepository: IPackingRepository = new PackingRepository(httpClient);
