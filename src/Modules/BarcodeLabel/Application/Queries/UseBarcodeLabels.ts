import { useQuery } from '@tanstack/react-query';
import { barcodeLabelQueryKeys } from '@modules/BarcodeLabel/Application/Queries/BarcodeLabelQueryKeys';
import type {
  LabelTemplateListFilter,
  PrintJobListFilter,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabelQuery';
import { barcodeLabelRepository } from '@modules/BarcodeLabel/Infrastructure/Repositories/BarcodeLabelRepositoryInstance';

export function useLabelTemplates(filter: LabelTemplateListFilter = {}) {
  return useQuery({
    queryKey: barcodeLabelQueryKeys.templateList(filter),
    queryFn: () => barcodeLabelRepository.listTemplates(filter),
  });
}

export function usePrintJobs(filter: PrintJobListFilter = {}) {
  return useQuery({
    queryKey: barcodeLabelQueryKeys.printJobList(filter),
    queryFn: () => barcodeLabelRepository.listPrintJobs(filter),
  });
}
