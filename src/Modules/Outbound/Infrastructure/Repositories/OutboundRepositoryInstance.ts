import { httpClient } from '@shared/Services/Http/ApiClient';
import { OutboundRepository } from '@modules/Outbound/Infrastructure/Repositories/OutboundRepository';

export const outboundRepository = new OutboundRepository(httpClient);
