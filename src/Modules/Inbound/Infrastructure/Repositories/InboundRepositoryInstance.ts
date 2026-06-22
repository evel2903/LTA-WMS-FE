import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IInboundRepository } from '@modules/Inbound/Application/Interfaces/IInboundRepository';
import { InboundRepository } from '@modules/Inbound/Infrastructure/Repositories/InboundRepository';

export const inboundRepository: IInboundRepository = new InboundRepository(httpClient);
