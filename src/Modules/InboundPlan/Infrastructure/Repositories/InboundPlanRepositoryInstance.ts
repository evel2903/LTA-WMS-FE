import { httpClient } from '@shared/Services/Http/ApiClient';
import type { IInboundPlanRepository } from '@modules/InboundPlan/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanRepository } from '@modules/InboundPlan/Infrastructure/Repositories/InboundPlanRepository';

export const inboundPlanRepository: IInboundPlanRepository = new InboundPlanRepository(httpClient);
