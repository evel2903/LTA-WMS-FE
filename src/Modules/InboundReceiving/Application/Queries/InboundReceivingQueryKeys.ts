import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';

export const inboundReceivingQueryKeys = {
  all: [QUERY_NAMESPACES.INBOUND_RECEIVING] as const,
  readiness: (planId: string) => [...inboundReceivingQueryKeys.all, 'readiness', planId] as const,
  operationalState: (planId: string) =>
    [...inboundReceivingQueryKeys.all, 'operational-state', planId] as const,
};
