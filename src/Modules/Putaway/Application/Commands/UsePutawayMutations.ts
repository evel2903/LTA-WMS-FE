import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putawayQueryKeys } from '@modules/Putaway/Application/Queries/PutawayQueryKeys';
import type { ReleasePutawayTaskInput } from '@modules/Putaway/Domain/Types/PutawayTaskQuery';
import { putawayRepository } from '@modules/Putaway/Infrastructure/Repositories/PutawayRepositoryInstance';

export function usePutawayMutations() {
  const queryClient = useQueryClient();
  const invalidatePutaway = () => queryClient.invalidateQueries({ queryKey: putawayQueryKeys.all });

  return {
    releaseTask: useMutation({
      mutationFn: (input: ReleasePutawayTaskInput) => putawayRepository.release(input),
      onSuccess: invalidatePutaway,
    }),
  };
}
