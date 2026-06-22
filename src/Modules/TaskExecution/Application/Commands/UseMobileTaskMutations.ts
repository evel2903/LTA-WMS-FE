import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { taskExecutionQueryKeys } from '@modules/TaskExecution/Application/Queries/TaskExecutionQueryKeys';
import type {
  ClaimMobileTaskInput,
  RecordMobileScanInput,
} from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';
import { taskExecutionRepository } from '@modules/TaskExecution/Infrastructure/Repositories/TaskExecutionRepositoryInstance';

export function useMobileTaskMutations() {
  const queryClient = useQueryClient();
  const invalidateTasks = () =>
    queryClient.invalidateQueries({ queryKey: taskExecutionQueryKeys.all });
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));

  return {
    claimTask: useMutation({
      mutationFn: ({ id, input }: { id: string; input?: ClaimMobileTaskInput }) =>
        taskExecutionRepository.claim(id, input),
      onSuccess: invalidateTasks,
      onError: notifyError,
    }),
    releaseTask: useMutation({
      mutationFn: (id: string) => taskExecutionRepository.release(id),
      onSuccess: invalidateTasks,
      onError: notifyError,
    }),
    recordScan: useMutation({
      mutationFn: ({ id, input }: { id: string; input: RecordMobileScanInput }) =>
        taskExecutionRepository.recordScan(id, input),
      onSuccess: invalidateTasks,
      onError: notifyError,
    }),
  };
}
