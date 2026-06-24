import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  LabelBlockingValidationResult,
  LabelTemplate,
  PrintJob,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';
import type {
  CreateLabelTemplateInput,
  CreateLabelTemplateVersionInput,
  LabelTemplateListFilter,
  PreviewPrintJobInput,
  PrintJobListFilter,
  ReprintPrintJobInput,
  ValidateLabelBlockingInput,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabelQuery';

export interface IBarcodeLabelRepository {
  listTemplates(filter?: LabelTemplateListFilter): Promise<PaginatedResponse<LabelTemplate>>;
  getTemplateById(id: string): Promise<LabelTemplate>;
  createTemplate(input: CreateLabelTemplateInput): Promise<LabelTemplate>;
  createTemplateVersion(id: string, input: CreateLabelTemplateVersionInput): Promise<LabelTemplate>;
  previewPrintJob(input: PreviewPrintJobInput): Promise<PrintJob>;
  listPrintJobs(filter?: PrintJobListFilter): Promise<PaginatedResponse<PrintJob>>;
  getPrintJobById(id: string): Promise<PrintJob>;
  reprintPrintJob(id: string, input: ReprintPrintJobInput): Promise<PrintJob>;
  validateLabelBlocking(
    input: ValidateLabelBlockingInput,
  ): Promise<LabelBlockingValidationResult>;
}
