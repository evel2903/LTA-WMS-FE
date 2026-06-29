import { useQuery } from '@tanstack/react-query';

import { inboundQueryKeys } from '@modules/Inbound/Application/Queries/InboundQueryKeys';
import type { InboundPlanFilter } from '@modules/Inbound/Domain/Types/InboundPlanQuery';
import { inboundRepository } from '@modules/Inbound/Infrastructure/Repositories/InboundRepositoryInstance';

export function useInboundPlans(filter: InboundPlanFilter = {}) {
  return useQuery({
    queryKey: inboundQueryKeys.list(filter),
    queryFn: () => inboundRepository.list(filter),
  });
}

export function useInboundPlan(id: string | null) {
  return useQuery({
    queryKey: inboundQueryKeys.detail(id ?? ''),
    queryFn: () => inboundRepository.getById(id as string),
    enabled: Boolean(id),
  });
}

export function useInboundOperationalState(id: string | null) {
  return useQuery({
    queryKey: inboundQueryKeys.operationalState(id ?? ''),
    queryFn: () => inboundRepository.getOperationalState(id as string),
    enabled: Boolean(id),
  });
}

export function useReceivingReadiness(id: string | null) {
  return useQuery({
    queryKey: inboundQueryKeys.readiness(id ?? ''),
    queryFn: () => inboundRepository.validateReadiness(id as string, { attemptOverride: false }),
    enabled: Boolean(id),
  });
}
