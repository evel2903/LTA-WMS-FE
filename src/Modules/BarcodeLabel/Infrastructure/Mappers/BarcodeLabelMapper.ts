import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  LabelBlockingValidationResult,
  LabelTemplate,
  PrintJob,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';
import type {
  CreateLabelTemplateInput,
  CreateLabelTemplateVersionInput,
  PreviewPrintJobInput,
  ReprintPrintJobInput,
  ValidateLabelBlockingInput,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabelQuery';
import type {
  CreateLabelTemplateRequestDto,
  CreateLabelTemplateVersionRequestDto,
  LabelBlockingValidationResultDto,
  LabelTemplateDto,
  PagedLabelTemplateDto,
  PagedPrintJobDto,
  PreviewPrintJobRequestDto,
  PrintJobDto,
  ReprintPrintJobRequestDto,
  ValidateLabelBlockingRequestDto,
} from '@modules/BarcodeLabel/Infrastructure/Dtos/BarcodeLabelDtos';

function removeNullish<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>;
}

export const BarcodeLabelMapper = {
  toLabelTemplate(dto: LabelTemplateDto): LabelTemplate {
    return {
      id: dto.Id,
      templateCode: dto.TemplateCode,
      templateName: dto.TemplateName,
      labelType: dto.LabelType,
      status: dto.Status,
      requiredFields: dto.RequiredFields,
      templateBody: dto.TemplateBody,
      activeVersionId: dto.ActiveVersionId,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toPrintJob(dto: PrintJobDto): PrintJob {
    return {
      id: dto.Id,
      jobCode: dto.JobCode,
      templateId: dto.TemplateId,
      templateVersionId: dto.TemplateVersionId,
      businessObjectType: dto.BusinessObjectType,
      businessObjectId: dto.BusinessObjectId,
      businessObjectCode: dto.BusinessObjectCode,
      warehouseId: dto.WarehouseId,
      ownerId: dto.OwnerId,
      payloadJson: dto.PayloadJson,
      previewContent: dto.PreviewContent,
      status: dto.Status,
      validationErrors: dto.ValidationErrors,
      reprintCount: dto.ReprintCount,
      requestedBy: dto.RequestedBy,
      requestedAt: dto.RequestedAt,
      completedAt: dto.CompletedAt,
      createdAt: dto.CreatedAt,
      updatedAt: dto.UpdatedAt,
      createdBy: dto.CreatedBy,
      updatedBy: dto.UpdatedBy,
    };
  },

  toLabelBlockingValidationResult(
    dto: LabelBlockingValidationResultDto,
  ): LabelBlockingValidationResult {
    return {
      allowed: dto.Allowed,
      blocked: dto.Blocked,
      decision: dto.Decision,
      requiredLabelType: dto.RequiredLabelType,
      policyMode: dto.PolicyMode,
      overrideAllowed: dto.OverrideAllowed,
      overrideAccepted: dto.OverrideAccepted,
      reason: dto.Reason,
      matchedPrintJobId: dto.MatchedPrintJobId,
      matchedPrintJobCode: dto.MatchedPrintJobCode,
      validationDetails: dto.ValidationDetails,
    };
  },

  toPagedTemplates(dto: PagedLabelTemplateDto): PaginatedResponse<LabelTemplate> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map((item) => BarcodeLabelMapper.toLabelTemplate(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toPagedPrintJobs(dto: PagedPrintJobDto): PaginatedResponse<PrintJob> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map((item) => BarcodeLabelMapper.toPrintJob(item)),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toCreateTemplateRequest(input: CreateLabelTemplateInput): CreateLabelTemplateRequestDto {
    return removeNullish({
      TemplateCode: input.templateCode,
      TemplateName: input.templateName,
      LabelType: input.labelType,
      RequiredFields: input.requiredFields,
      TemplateBody: input.templateBody,
      Status: input.status,
    }) as CreateLabelTemplateRequestDto;
  },

  toCreateTemplateVersionRequest(
    input: CreateLabelTemplateVersionInput,
  ): CreateLabelTemplateVersionRequestDto {
    return {
      RequiredFields: input.requiredFields,
      TemplateBody: input.templateBody,
    };
  },

  toPreviewRequest(input: PreviewPrintJobInput): PreviewPrintJobRequestDto {
    return removeNullish({
      TemplateId: input.templateId,
      TemplateVersionId: input.templateVersionId,
      BusinessObjectType: input.businessObjectType,
      BusinessObjectId: input.businessObjectId,
      BusinessObjectCode: input.businessObjectCode,
      WarehouseId: input.warehouseId,
      OwnerId: input.ownerId,
      PayloadJson: input.payloadJson,
    }) as PreviewPrintJobRequestDto;
  },

  toReprintRequest(input: ReprintPrintJobInput): ReprintPrintJobRequestDto {
    return removeNullish({
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
    }) as ReprintPrintJobRequestDto;
  },

  toValidateLabelBlockingRequest(
    input: ValidateLabelBlockingInput,
  ): ValidateLabelBlockingRequestDto {
    return removeNullish({
      DownstreamAction: input.downstreamAction,
      BusinessObjectType: input.businessObjectType,
      BusinessObjectId: input.businessObjectId,
      BusinessObjectCode: input.businessObjectCode,
      WarehouseProfileId: input.warehouseProfileId,
      WarehouseId: input.warehouseId,
      OwnerId: input.ownerId,
      LabelType: input.labelType,
      AttemptOverride: input.attemptOverride,
      ReasonCode: input.reasonCode,
      ReasonNote: input.reasonNote,
      EvidenceRefs: input.evidenceRefs,
    }) as ValidateLabelBlockingRequestDto;
  },
};
