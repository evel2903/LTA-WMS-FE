import { useMutation, useQueryClient } from '@tanstack/react-query';
import { packingQueryKeys } from '@modules/Packing/Application/Queries/PackingQueryKeys';
import type {
  ClosePackageInput,
  CreatePackageInput,
  ReadyForStagingInput,
  RecordPackCheckInput,
  StartPackSessionInput,
} from '@modules/Packing/Domain/Types/PackingQuery';
import { packingRepository } from '@modules/Packing/Infrastructure/Repositories/PackingRepositoryInstance';

export function usePackingMutations() {
  const queryClient = useQueryClient();
  const invalidatePacking = () => queryClient.invalidateQueries({ queryKey: packingQueryKeys.all });

  return {
    startSession: useMutation({
      mutationFn: (input: StartPackSessionInput) => packingRepository.startSession(input),
      onSuccess: invalidatePacking,
    }),
    recordCheck: useMutation({
      mutationFn: (input: { sessionId: string; payload: RecordPackCheckInput }) =>
        packingRepository.recordCheck(input.sessionId, input.payload),
      onSuccess: invalidatePacking,
    }),
    createPackage: useMutation({
      mutationFn: (input: CreatePackageInput) => packingRepository.createPackage(input),
      onSuccess: invalidatePacking,
    }),
    closePackage: useMutation({
      mutationFn: (input: { id: string; payload: ClosePackageInput }) =>
        packingRepository.closePackage(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidatePacking();
        void queryClient.invalidateQueries({ queryKey: packingQueryKeys.detail(input.id) });
      },
    }),
    readyForStaging: useMutation({
      mutationFn: (input: { id: string; payload: ReadyForStagingInput }) =>
        packingRepository.readyForStaging(input.id, input.payload),
      onSuccess: (_data, input) => {
        void invalidatePacking();
        void queryClient.invalidateQueries({ queryKey: packingQueryKeys.detail(input.id) });
      },
    }),
  };
}
