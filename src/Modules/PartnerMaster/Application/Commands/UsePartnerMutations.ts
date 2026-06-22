import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { partnerQueryKeys } from '@modules/PartnerMaster/Application/Queries/PartnerQueryKeys';
import type {
  CreatePartnerInput,
  DeactivatePartnerInput,
  UpdatePartnerInput,
} from '@modules/PartnerMaster/Domain/Types/PartnerQuery';
import { partnerRepository } from '@modules/PartnerMaster/Infrastructure/Repositories/PartnerRepositoryInstance';

export function usePartnerMutations() {
  const queryClient = useQueryClient();
  const invalidatePartners = () => queryClient.invalidateQueries({ queryKey: partnerQueryKeys.all });
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));

  return {
    createPartner: useMutation({
      mutationFn: (input: CreatePartnerInput) => partnerRepository.create(input),
      onSuccess: invalidatePartners,
      onError: notifyError,
    }),
    updatePartner: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdatePartnerInput }) =>
        partnerRepository.update(id, input),
      onSuccess: invalidatePartners,
      onError: notifyError,
    }),
    deactivatePartner: useMutation({
      mutationFn: ({ id, input }: { id: string; input: DeactivatePartnerInput }) =>
        partnerRepository.deactivate(id, input),
      onSuccess: invalidatePartners,
      onError: notifyError,
    }),
  };
}
