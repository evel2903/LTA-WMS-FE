import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putawayQueryKeys } from '@modules/Putaway/Application/Queries/PutawayQueryKeys';
import type {
  ConfirmPutawayTaskInput,
  ReleasePutawayTaskInput,
} from '@modules/Putaway/Domain/Types/PutawayTaskQuery';
import { putawayRepository } from '@modules/Putaway/Infrastructure/Repositories/PutawayRepositoryInstance';

export function usePutawayMutations() {
  const queryClient = useQueryClient();
  const invalidatePutaway = () => queryClient.invalidateQueries({ queryKey: putawayQueryKeys.all });

  return {
    releaseTask: useMutation({
      mutationFn: (input: ReleasePutawayTaskInput) => putawayRepository.release(input),
      onSuccess: invalidatePutaway,
    }),
    confirmTask: useMutation({
      mutationFn: (input: { taskId: string; payload: ConfirmPutawayTaskInput }) =>
        putawayRepository.confirm(input.taskId, input.payload),
      onSuccess: (_data, input) => {
        void invalidatePutaway();
        void queryClient.invalidateQueries({ queryKey: putawayQueryKeys.detail(input.taskId) });
      },
    }),
  };
}
