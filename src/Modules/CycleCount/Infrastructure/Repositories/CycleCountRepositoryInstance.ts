import { httpClient } from '@shared/Services/Http/ApiClient';
import { CycleCountRepository } from '@modules/CycleCount/Infrastructure/Repositories/CycleCountRepository';

export const cycleCountRepository = new CycleCountRepository(httpClient);
