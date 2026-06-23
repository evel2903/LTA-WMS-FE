import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cycleCountQueryKeys } from '@modules/CycleCount/Application/Queries/CycleCountQueryKeys';
import type {
  CreateCycleCountWorkInput,
  CycleCountReasonedInput,
  PostCycleCountAdjustmentInput,
  SubmitCycleCountWorkInput,
} from '@modules/CycleCount/Domain/Types/CycleCountQuery';
import { cycleCountRepository } from '@modules/CycleCount/Infrastructure/Repositories/CycleCountRepositoryInstance';

export function useCycleCountMutations() {
  const queryClient = useQueryClient();
  const invalidateCycleCount = () => queryClient.invalidateQueries({ queryKey: cycleCountQueryKeys.all });

  return {
    createWork: useMutation({
      mutationFn: (input: CreateCycleCountWorkInput) => cycleCountRepository.create(input),
      onSuccess: invalidateCycleCount,
    }),
    submitWork: useMutation({
      mutationFn: (input: { id: string; payload: SubmitCycleCountWorkInput }) =>
        cycleCountRepository.submit(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidateCycleCount();
        void queryClient.invalidateQueries({ queryKey: cycleCountQueryKeys.detail(input.id) });
      },
    }),
    recountWork: useMutation({
      mutationFn: (input: { id: string; payload: CycleCountReasonedInput }) =>
        cycleCountRepository.recount(input.id, input.payload),
      onSuccess: invalidateCycleCount,
    }),
    postAdjustment: useMutation({
      mutationFn: (input: { id: string; payload: PostCycleCountAdjustmentInput }) =>
        cycleCountRepository.postAdjustment(input.id, input.payload),
      onSuccess: invalidateCycleCount,
    }),
    unlockWork: useMutation({
      mutationFn: (input: { id: string; payload: CycleCountReasonedInput }) =>
        cycleCountRepository.unlock(input.id, input.payload),
      onSuccess: invalidateCycleCount,
    }),
  };
}
