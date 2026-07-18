import { useQuery } from '@tanstack/react-query';

import { inboundPlanQueryKeys } from '@modules/InboundPlan/Application/Queries/InboundPlanQueryKeys';
import type { InboundPlanFilter } from '@modules/InboundPlan/Domain/Types/InboundPlanQuery';
import { inboundPlanRepository } from '@modules/InboundPlan/Infrastructure/Repositories/InboundPlanRepositoryInstance';

export function useInboundPlans(filter: InboundPlanFilter = {}) {
  return useQuery({
    queryKey: inboundPlanQueryKeys.list(filter),
    queryFn: () => inboundPlanRepository.list(filter),
  });
}

export function useInboundPlan(id: string | null) {
  return useQuery({
    queryKey: inboundPlanQueryKeys.detail(id ?? ''),
    queryFn: () => inboundPlanRepository.getById(id as string),
    enabled: Boolean(id),
  });
}
