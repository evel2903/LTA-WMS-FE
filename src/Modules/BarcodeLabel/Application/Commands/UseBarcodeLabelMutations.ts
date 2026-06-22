import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@shared/Components/Ui/Toast';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { barcodeLabelQueryKeys } from '@modules/BarcodeLabel/Application/Queries/BarcodeLabelQueryKeys';
import type {
  CreateLabelTemplateInput,
  CreateLabelTemplateVersionInput,
  PreviewPrintJobInput,
  ReprintPrintJobInput,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabelQuery';
import { barcodeLabelRepository } from '@modules/BarcodeLabel/Infrastructure/Repositories/BarcodeLabelRepositoryInstance';

export function useBarcodeLabelMutations() {
  const queryClient = useQueryClient();
  const invalidateLabels = () =>
    queryClient.invalidateQueries({ queryKey: barcodeLabelQueryKeys.all });
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));

  return {
    createTemplate: useMutation({
      mutationFn: (input: CreateLabelTemplateInput) => barcodeLabelRepository.createTemplate(input),
      onSuccess: invalidateLabels,
      onError: notifyError,
    }),
    createTemplateVersion: useMutation({
      mutationFn: ({ id, input }: { id: string; input: CreateLabelTemplateVersionInput }) =>
        barcodeLabelRepository.createTemplateVersion(id, input),
      onSuccess: invalidateLabels,
      onError: notifyError,
    }),
    previewPrintJob: useMutation({
      mutationFn: (input: PreviewPrintJobInput) => barcodeLabelRepository.previewPrintJob(input),
      onSuccess: invalidateLabels,
      onError: notifyError,
    }),
    reprintPrintJob: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ReprintPrintJobInput }) =>
        barcodeLabelRepository.reprintPrintJob(id, input),
      onSuccess: invalidateLabels,
      onError: notifyError,
    }),
  };
}
