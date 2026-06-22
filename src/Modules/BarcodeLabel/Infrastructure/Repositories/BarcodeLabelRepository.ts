import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import {
  BARCODE_LABEL_DEFAULT_PAGE_SIZE,
  BARCODE_LABEL_MAX_PAGE_SIZE,
} from '@modules/BarcodeLabel/Domain/Constants/BarcodeLabelConstants';
import type { LabelTemplate, PrintJob } from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';
import type {
  CreateLabelTemplateInput,
  CreateLabelTemplateVersionInput,
  LabelTemplateListFilter,
  PreviewPrintJobInput,
  PrintJobListFilter,
  ReprintPrintJobInput,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabelQuery';
import { BARCODE_LABEL_ENDPOINTS } from '@modules/BarcodeLabel/Infrastructure/Api/BarcodeLabelEndpoints';
import type {
  LabelTemplateDto,
  PagedLabelTemplateDto,
  PagedPrintJobDto,
  PrintJobDto,
} from '@modules/BarcodeLabel/Infrastructure/Dtos/BarcodeLabelDtos';
import { BarcodeLabelMapper } from '@modules/BarcodeLabel/Infrastructure/Mappers/BarcodeLabelMapper';

function pageSize(value?: number): number {
  if (!value || value < 1) return BARCODE_LABEL_DEFAULT_PAGE_SIZE;
  return Math.min(value, BARCODE_LABEL_MAX_PAGE_SIZE);
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export class BarcodeLabelRepository implements IBarcodeLabelRepository {
  constructor(private readonly http: HttpClient) {}

  async listTemplates(
    filter: LabelTemplateListFilter = {},
  ): Promise<PaginatedResponse<LabelTemplate>> {
    const dto = await this.http.get<PagedLabelTemplateDto>(
      BARCODE_LABEL_ENDPOINTS.LABEL_TEMPLATES,
      {
        params: removeUndefined({
          Page: filter.page ?? 1,
          PageSize: pageSize(filter.pageSize),
          TemplateCode: filter.templateCode,
          LabelType: filter.labelType,
          Status: filter.status,
        }),
      },
    );
    return BarcodeLabelMapper.toPagedTemplates(dto);
  }

  async createTemplate(input: CreateLabelTemplateInput): Promise<LabelTemplate> {
    const dto = await this.http.post<LabelTemplateDto>(
      BARCODE_LABEL_ENDPOINTS.LABEL_TEMPLATES,
      BarcodeLabelMapper.toCreateTemplateRequest(input),
    );
    return BarcodeLabelMapper.toLabelTemplate(dto);
  }

  async createTemplateVersion(
    id: string,
    input: CreateLabelTemplateVersionInput,
  ): Promise<LabelTemplate> {
    const dto = await this.http.post<LabelTemplateDto>(
      BARCODE_LABEL_ENDPOINTS.LABEL_TEMPLATE_VERSIONS(id),
      BarcodeLabelMapper.toCreateTemplateVersionRequest(input),
    );
    return BarcodeLabelMapper.toLabelTemplate(dto);
  }

  async previewPrintJob(input: PreviewPrintJobInput): Promise<PrintJob> {
    const dto = await this.http.post<PrintJobDto>(
      BARCODE_LABEL_ENDPOINTS.PREVIEW,
      BarcodeLabelMapper.toPreviewRequest(input),
    );
    return BarcodeLabelMapper.toPrintJob(dto);
  }

  async listPrintJobs(filter: PrintJobListFilter = {}): Promise<PaginatedResponse<PrintJob>> {
    const dto = await this.http.get<PagedPrintJobDto>(BARCODE_LABEL_ENDPOINTS.PRINT_JOBS, {
      params: removeUndefined({
        Page: filter.page ?? 1,
        PageSize: pageSize(filter.pageSize),
        TemplateId: filter.templateId,
        BusinessObjectType: filter.businessObjectType,
        BusinessObjectId: filter.businessObjectId,
        Status: filter.status,
      }),
    });
    return BarcodeLabelMapper.toPagedPrintJobs(dto);
  }

  async reprintPrintJob(id: string, input: ReprintPrintJobInput): Promise<PrintJob> {
    const dto = await this.http.post<PrintJobDto>(
      BARCODE_LABEL_ENDPOINTS.REPRINT(id),
      BarcodeLabelMapper.toReprintRequest(input),
    );
    return BarcodeLabelMapper.toPrintJob(dto);
  }
}
