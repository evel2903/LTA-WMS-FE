import { httpClient } from '@shared/Services/Http/ApiClient';
import { PutawayRepository } from '@modules/Putaway/Infrastructure/Repositories/PutawayRepository';

export const putawayRepository = new PutawayRepository(httpClient);
