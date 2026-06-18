import { httpClient } from '@shared/Services/Http/ApiClient';
import type { ICatalogRepository } from '@modules/MasterData/Application/Interfaces/ICatalogRepository';
import { CatalogRepository } from '@modules/MasterData/Infrastructure/Repositories/CatalogRepository';

export const catalogRepository: ICatalogRepository = new CatalogRepository(httpClient);
