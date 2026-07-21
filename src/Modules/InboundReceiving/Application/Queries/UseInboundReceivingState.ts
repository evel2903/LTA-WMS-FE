import { useQuery } from '@tanstack/react-query';

import { inboundReceivingQueryKeys } from '@modules/InboundReceiving/Application/Queries/InboundReceivingQueryKeys';
import { inboundReceivingRepository } from '@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepositoryInstance';
import type { ReceiptListFilter } from '@modules/InboundReceiving/Domain/Types/ReceiptQuery';

export function useReceipts(filter: ReceiptListFilter = {}) {
  return useQuery({
    queryKey: inboundReceivingQueryKeys.receiptList(filter),
    queryFn: () => inboundReceivingRepository.listReceipts(filter),
  });
}

export function useReceipt(receiptId: string | null) {
  return useQuery({
    queryKey: inboundReceivingQueryKeys.receiptDetail(receiptId ?? ''),
    queryFn: () => inboundReceivingRepository.getReceipt(receiptId as string),
    enabled: Boolean(receiptId),
  });
}

export function useReceiptOperationalState(receiptId: string | null) {
  return useQuery({
    queryKey: inboundReceivingQueryKeys.receiptOperationalState(receiptId ?? ''),
    queryFn: () => inboundReceivingRepository.getReceiptOperationalState(receiptId as string),
    enabled: Boolean(receiptId),
  });
}

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
    queryFn: () =>
      inboundReceivingRepository.validateReadiness(planId as string, { attemptOverride: false }),
    enabled: Boolean(planId),
  });
}
