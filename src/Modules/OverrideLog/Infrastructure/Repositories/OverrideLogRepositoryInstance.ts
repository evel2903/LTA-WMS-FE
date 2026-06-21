import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IOverrideLogRepository } from '@modules/OverrideLog/Application/Interfaces/IOverrideLogRepository';
import { OverrideLogRepository } from '@modules/OverrideLog/Infrastructure/Repositories/OverrideLogRepository';

export const overrideLogRepository: IOverrideLogRepository = new OverrideLogRepository(httpClient);
