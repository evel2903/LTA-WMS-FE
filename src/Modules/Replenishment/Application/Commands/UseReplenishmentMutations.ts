import { useMutation, useQueryClient } from '@tanstack/react-query';
import { replenishmentQueryKeys } from '@modules/Replenishment/Application/Queries/ReplenishmentQueryKeys';
import type {
  RecordInventoryReconciliationFailureInput,
  ReleaseReplenishmentTaskInput,
  ReplenishmentReasonedInput,
} from '@modules/Replenishment/Domain/Types/ReplenishmentQuery';
import { replenishmentRepository } from '@modules/Replenishment/Infrastructure/Repositories/ReplenishmentRepositoryInstance';

export function useReplenishmentMutations() {
  const queryClient = useQueryClient();
  const invalidateReplenishment = () => queryClient.invalidateQueries({ queryKey: replenishmentQueryKeys.all });

  return {
    releaseTask: useMutation({
      mutationFn: (input: ReleaseReplenishmentTaskInput) => replenishmentRepository.release(input),
      onSuccess: invalidateReplenishment,
    }),
    confirmTask: useMutation({
      mutationFn: (input: { id: string; payload: ReplenishmentReasonedInput }) =>
        replenishmentRepository.confirm(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateReplenishment();
        void queryClient.invalidateQueries({ queryKey: replenishmentQueryKeys.detail(input.id) });
      },
    }),
    cancelTask: useMutation({
      mutationFn: (input: { id: string; payload: ReplenishmentReasonedInput }) =>
        replenishmentRepository.cancel(input.id, input.payload),
      onSuccess: invalidateReplenishment,
    }),
    recordReconciliationFailure: useMutation({
      mutationFn: (input: RecordInventoryReconciliationFailureInput) =>
        replenishmentRepository.recordReconciliationFailure(input),
      onSuccess: invalidateReplenishment,
    }),
  };
}
