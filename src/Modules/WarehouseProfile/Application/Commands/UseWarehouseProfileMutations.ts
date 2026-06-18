import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Sonner';
import { toMutationErrorMessage } from '@modules/WarehouseProfile/Application/Commands/WarehouseProfileMutationError';
import { warehouseProfileQueryKeys } from '@modules/WarehouseProfile/Application/Queries/WarehouseProfileQueryKeys';
import type {
  ActivateWarehouseProfileInput,
  AddProfileRuleInput,
  CreateAssignmentInput,
  CreateWarehouseProfileInput,
  DeactivateWarehouseProfileInput,
  UpdateWarehouseProfileInput,
} from '@modules/WarehouseProfile/Domain/Types/WarehouseProfileInputs';
import { warehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance';

export function useWarehouseProfileMutations() {
  const queryClient = useQueryClient();
  const invalidate = (key: readonly unknown[]) => queryClient.invalidateQueries({ queryKey: key });
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));

  // Profile list + detail share the namespace; lifecycle changes refetch both.
  const invalidateProfiles = () => invalidate([...warehouseProfileQueryKeys.all, 'profiles']);
  const invalidateProfile = (id: string) => {
    void invalidate(warehouseProfileQueryKeys.profileDetail(id));
    void invalidateProfiles();
  };

  return {
    createProfile: useMutation({
      mutationFn: (input: CreateWarehouseProfileInput) =>
        warehouseProfileRepository.createProfile(input),
      onSuccess: invalidateProfiles,
      onError: notifyError,
    }),
    updateProfile: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateWarehouseProfileInput }) =>
        warehouseProfileRepository.updateProfile(id, input),
      onSuccess: (profile) => invalidateProfile(profile.id),
      onError: notifyError,
    }),
    // Lifecycle (activate / deactivate) failures are surfaced INLINE by the page in a
    // single place: a 409 CONFLICT renders the dedicated conflict panel and every other
    // failure (BUSINESS_RULE / VALIDATION / FORBIDDEN) renders an inline message. There
    // is deliberately NO mutation-level toast here — toasting would double-surface the
    // same error alongside the inline panel (Finding #4 / AC5: one surface per error).
    activateProfile: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ActivateWarehouseProfileInput }) =>
        warehouseProfileRepository.activateProfile(id, input),
      onSuccess: (profile) => invalidateProfile(profile.id),
    }),
    deactivateProfile: useMutation({
      mutationFn: ({ id, input }: { id: string; input: DeactivateWarehouseProfileInput }) =>
        warehouseProfileRepository.deactivateProfile(id, input),
      onSuccess: (profile) => invalidateProfile(profile.id),
    }),
    createAssignment: useMutation({
      mutationFn: ({ id, input }: { id: string; input: CreateAssignmentInput }) =>
        warehouseProfileRepository.createAssignment(id, input),
      onSuccess: (assignment) =>
        invalidate(warehouseProfileQueryKeys.assignments(assignment.warehouseProfileId)),
      onError: notifyError,
    }),
    addProfileRule: useMutation({
      mutationFn: ({ id, input }: { id: string; input: AddProfileRuleInput }) =>
        warehouseProfileRepository.addProfileRule(id, input),
      onSuccess: (rule) => invalidate(warehouseProfileQueryKeys.profileRules(rule.warehouseProfileId)),
      onError: notifyError,
    }),
    removeProfileRule: useMutation({
      mutationFn: ({ id, ruleId }: { id: string; ruleId: string }) =>
        warehouseProfileRepository.removeProfileRule(id, ruleId),
      onSuccess: (_void, variables) =>
        invalidate(warehouseProfileQueryKeys.profileRules(variables.id)),
      onError: notifyError,
    }),
  };
}
