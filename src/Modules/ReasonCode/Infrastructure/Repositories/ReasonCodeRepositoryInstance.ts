import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IReasonCodeRepository } from '@modules/ReasonCode/Application/Interfaces/IReasonCodeRepository';
import { ReasonCodeRepository } from '@modules/ReasonCode/Infrastructure/Repositories/ReasonCodeRepository';

export const reasonCodeRepository: IReasonCodeRepository = new ReasonCodeRepository(httpClient);
