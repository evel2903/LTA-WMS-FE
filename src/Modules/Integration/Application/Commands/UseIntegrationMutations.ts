import { useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationQueryKeys } from '@modules/Integration/Application/Queries/IntegrationQueryKeys';
import type {
  DeadLetterActionInput,
  RecordOutboxFailureInput,
} from '@modules/Integration/Domain/Types/IntegrationQuery';
import { integrationRepository } from '@modules/Integration/Infrastructure/Repositories/IntegrationRepositoryInstance';

export function useIntegrationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: integrationQueryKeys.all });

  return {
    retryDeadLetter: useMutation({
      mutationFn: (input: { id: string; payload: DeadLetterActionInput }) =>
        integrationRepository.retryDeadLetter(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: integrationQueryKeys.deadLetter(input.id) });
      },
    }),
    manualFixDeadLetter: useMutation({
      mutationFn: (input: { id: string; payload: DeadLetterActionInput }) =>
        integrationRepository.manualFixDeadLetter(input.id, input.payload),
      onSuccess: invalidate,
    }),
    acknowledgeDeadLetter: useMutation({
      mutationFn: (input: { id: string; payload: DeadLetterActionInput }) =>
        integrationRepository.acknowledgeDeadLetter(input.id, input.payload),
      onSuccess: invalidate,
    }),
    ignoreDeadLetter: useMutation({
      mutationFn: (input: { id: string; payload: DeadLetterActionInput }) =>
        integrationRepository.ignoreDeadLetter(input.id, input.payload),
      onSuccess: invalidate,
    }),
    recordFailure: useMutation({
      mutationFn: (input: RecordOutboxFailureInput) => integrationRepository.recordFailure(input),
      onSuccess: invalidate,
    }),
  };
}
