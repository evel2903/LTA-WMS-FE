import { useMutation, useQueryClient } from '@tanstack/react-query';
import { outboundQueryKeys } from '@modules/Outbound/Application/Queries/OutboundQueryKeys';
import type {
  AllocateOutboundOrderInput,
  ImportOutboundOrderInput,
  ReasonOutboundOrderInput,
} from '@modules/Outbound/Domain/Types/OutboundOrderQuery';
import { outboundRepository } from '@modules/Outbound/Infrastructure/Repositories/OutboundRepositoryInstance';

export function useOutboundMutations() {
  const queryClient = useQueryClient();
  const invalidateOutbound = () =>
    queryClient.invalidateQueries({ queryKey: outboundQueryKeys.all });

  return {
    importOrder: useMutation({
      mutationFn: (input: ImportOutboundOrderInput) => outboundRepository.importOrder(input),
      onSuccess: invalidateOutbound,
    }),
    validateOrder: useMutation({
      mutationFn: (id: string) => outboundRepository.validate(id),
      onSuccess: (_data, id) => {
        void invalidateOutbound();
        void queryClient.invalidateQueries({ queryKey: outboundQueryKeys.detail(id) });
      },
    }),
    holdOrder: useMutation({
      mutationFn: (input: { id: string; payload: ReasonOutboundOrderInput }) =>
        outboundRepository.hold(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateOutbound();
        void queryClient.invalidateQueries({ queryKey: outboundQueryKeys.detail(input.id) });
      },
    }),
    rejectOrder: useMutation({
      mutationFn: (input: { id: string; payload: ReasonOutboundOrderInput }) =>
        outboundRepository.reject(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateOutbound();
        void queryClient.invalidateQueries({ queryKey: outboundQueryKeys.detail(input.id) });
      },
    }),
    cancelOrder: useMutation({
      mutationFn: (input: { id: string; payload: ReasonOutboundOrderInput }) =>
        outboundRepository.cancel(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateOutbound();
        void queryClient.invalidateQueries({ queryKey: outboundQueryKeys.detail(input.id) });
      },
    }),
    allocateOrder: useMutation({
      mutationFn: (input: { id: string; payload: AllocateOutboundOrderInput }) =>
        outboundRepository.allocate(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateOutbound();
        void queryClient.invalidateQueries({ queryKey: outboundQueryKeys.detail(input.id) });
        void queryClient.invalidateQueries({ queryKey: outboundQueryKeys.allocationLists(input.id) });
      },
    }),
  };
}
