import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { ReceiptListFilter } from '@modules/InboundReceiving/Domain/Types/ReceiptQuery';

export const inboundReceivingQueryKeys = {
  all: [QUERY_NAMESPACES.INBOUND_RECEIVING] as const,
  receiptLists: () => [...inboundReceivingQueryKeys.all, 'receipts', 'list'] as const,
  receiptList: (filter: ReceiptListFilter) =>
    [...inboundReceivingQueryKeys.receiptLists(), filter] as const,
  receiptDetail: (receiptId: string) =>
    [...inboundReceivingQueryKeys.all, 'receipts', 'detail', receiptId] as const,
  receiptOperationalState: (receiptId: string) =>
    [...inboundReceivingQueryKeys.all, 'receipts', 'operational-state', receiptId] as const,
  readiness: (planId: string) => [...inboundReceivingQueryKeys.all, 'readiness', planId] as const,
  operationalState: (planId: string) =>
    [...inboundReceivingQueryKeys.all, 'operational-state', planId] as const,
};
