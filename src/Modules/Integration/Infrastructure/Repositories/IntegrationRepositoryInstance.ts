import { httpClient } from '@shared/Services/Http/ApiClient';
import { IntegrationRepository } from '@modules/Integration/Infrastructure/Repositories/IntegrationRepository';

export const integrationRepository = new IntegrationRepository(httpClient);
