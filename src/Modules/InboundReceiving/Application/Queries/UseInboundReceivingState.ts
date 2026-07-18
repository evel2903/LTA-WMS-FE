import { useQuery } from '@tanstack/react-query';

import { inboundReceivingQueryKeys } from '@modules/InboundReceiving/Application/Queries/InboundReceivingQueryKeys';
import { inboundReceivingRepository } from '@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepositoryInstance';

export function useInboundOperationalState(planId: string | null) {
  return useQuery({
    queryKey: inboundReceivingQueryKeys.operationalState(planId ?? ''),
    queryFn: () => inboundReceivingRepository.getOperationalState(planId as string),
    enabled: Boolean(planId),
  });
}

export function useReceivingReadiness(planId: string | null) {
  return useQuery({
    queryKey: inboundReceivingQueryKeys.readiness(planId ?? ''),
    queryFn: () => inboundReceivingRepository.validateReadiness(planId as string, { attemptOverride: false }),
    enabled: Boolean(planId),
  });
}
