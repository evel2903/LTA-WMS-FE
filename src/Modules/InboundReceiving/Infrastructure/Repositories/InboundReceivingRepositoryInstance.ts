import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IInboundReceivingRepository } from '@modules/InboundReceiving/Application/Interfaces/IInboundReceivingRepository';
import { InboundReceivingRepository } from '@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepository';

export const inboundReceivingRepository: IInboundReceivingRepository = new InboundReceivingRepository(
  httpClient,
);
