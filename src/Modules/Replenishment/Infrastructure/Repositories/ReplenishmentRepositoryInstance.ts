import { httpClient } from '@shared/Services/Http/ApiClient';
import { ReplenishmentRepository } from '@modules/Replenishment/Infrastructure/Repositories/ReplenishmentRepository';

export const replenishmentRepository = new ReplenishmentRepository(httpClient);
