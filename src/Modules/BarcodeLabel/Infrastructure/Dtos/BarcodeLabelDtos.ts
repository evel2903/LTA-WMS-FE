import type {
  LabelBlockingDecision,
  LabelBlockingDownstreamAction,
  LabelBlockingPolicyMode,
  LabelTemplateStatus,
  PrintJobStatus,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';

export interface LabelTemplateDto {
  Id: string;
  TemplateCode: string;
  TemplateName: string;
  LabelType: string;
  Status: LabelTemplateStatus;
  RequiredFields: string[];
  TemplateBody: string;
  ActiveVersionId: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface PrintJobDto {
  Id: string;
  JobCode: string;
  TemplateId: string;
  TemplateVersionId: string;
  BusinessObjectType: string;
  BusinessObjectId: string;
  BusinessObjectCode: string | null;
  WarehouseId: string | null;
  OwnerId: string | null;
  PayloadJson: Record<string, unknown>;
  PreviewContent: string | null;
  Status: PrintJobStatus;
  ValidationErrors: Record<string, unknown> | null;
  ReprintCount: number;
  RequestedBy: string | null;
  RequestedAt: string;
  CompletedAt: string | null;
  CreatedAt: string;
  UpdatedAt: string;
  CreatedBy: string | null;
  UpdatedBy: string | null;
}

export interface PageMetaDto {
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
}

export interface PagedLabelTemplateDto {
  Items: LabelTemplateDto[];
  Meta: PageMetaDto;
}

export interface PagedPrintJobDto {
  Items: PrintJobDto[];
  Meta: PageMetaDto;
}

export interface CreateLabelTemplateRequestDto {
  TemplateCode: string;
  TemplateName: string;
  LabelType: string;
  RequiredFields: string[];
  TemplateBody: string;
  Status?: LabelTemplateStatus;
}

export interface CreateLabelTemplateVersionRequestDto {
  RequiredFields: string[];
  TemplateBody: string;
}

export interface PreviewPrintJobRequestDto {
  TemplateId: string;
  TemplateVersionId?: string | null;
  BusinessObjectType: string;
  BusinessObjectId: string;
  BusinessObjectCode?: string | null;
  WarehouseId?: string | null;
  OwnerId?: string | null;
  PayloadJson: Record<string, unknown>;
}

export interface ReprintPrintJobRequestDto {
  ReasonCode: string;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
}

export interface ValidateLabelBlockingRequestDto {
  DownstreamAction: LabelBlockingDownstreamAction;
  BusinessObjectType: string;
  BusinessObjectId: string;
  BusinessObjectCode?: string | null;
  WarehouseProfileId: string;
  WarehouseId?: string | null;
  OwnerId?: string | null;
  LabelType?: string | null;
  AttemptOverride?: boolean;
  ReasonCode?: string | null;
  ReasonNote?: string | null;
  EvidenceRefs?: string[] | null;
}

export interface LabelBlockingValidationResultDto {
  Allowed: boolean;
  Blocked: boolean;
  Decision: LabelBlockingDecision;
  RequiredLabelType: string | null;
  PolicyMode: LabelBlockingPolicyMode;
  OverrideAllowed: boolean;
  OverrideAccepted: boolean;
  Reason: string;
  MatchedPrintJobId: string | null;
  MatchedPrintJobCode: string | null;
  ValidationDetails: Record<string, unknown>;
}
