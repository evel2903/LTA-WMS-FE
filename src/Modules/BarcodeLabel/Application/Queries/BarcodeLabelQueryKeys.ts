import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type {
  LabelTemplateListFilter,
  PrintJobListFilter,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabelQuery';

export const barcodeLabelQueryKeys = {
  all: [QUERY_NAMESPACES.BARCODE_LABEL] as const,
  templateLists: () => [...barcodeLabelQueryKeys.all, 'labelTemplates'] as const,
  templateList: (filter: LabelTemplateListFilter) =>
    [...barcodeLabelQueryKeys.templateLists(), filter] as const,
  printJobLists: () => [...barcodeLabelQueryKeys.all, 'printJobs'] as const,
  printJobList: (filter: PrintJobListFilter) =>
    [...barcodeLabelQueryKeys.printJobLists(), filter] as const,
};
