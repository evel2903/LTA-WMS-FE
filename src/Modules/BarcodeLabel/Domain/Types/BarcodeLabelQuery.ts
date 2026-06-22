import type {
  LabelBlockingDownstreamAction,
  LabelTemplateStatus,
  PrintJobStatus,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';

export interface LabelTemplateListFilter {
  page?: number;
  pageSize?: number;
  templateCode?: string;
  labelType?: string;
  status?: LabelTemplateStatus;
}

export interface PrintJobListFilter {
  page?: number;
  pageSize?: number;
  templateId?: string;
  businessObjectType?: string;
  businessObjectId?: string;
  status?: PrintJobStatus;
}

export interface CreateLabelTemplateInput {
  templateCode: string;
  templateName: string;
  labelType: string;
  requiredFields: string[];
  templateBody: string;
  status?: LabelTemplateStatus;
}

export interface CreateLabelTemplateVersionInput {
  requiredFields: string[];
  templateBody: string;
}

export interface PreviewPrintJobInput {
  templateId: string;
  templateVersionId?: string | null;
  businessObjectType: string;
  businessObjectId: string;
  businessObjectCode?: string | null;
  warehouseId?: string | null;
  ownerId?: string | null;
  payloadJson: Record<string, unknown>;
}

export interface ReprintPrintJobInput {
  reasonCode: string;
  reasonNote?: string | null;
  evidenceRefs?: string[] | null;
}

export interface ValidateLabelBlockingInput {
  downstreamAction: LabelBlockingDownstreamAction;
  businessObjectType: string;
  businessObjectId: string;
  businessObjectCode?: string | null;
  warehouseProfileId: string;
  warehouseId?: string | null;
  ownerId?: string | null;
  labelType?: string | null;
  attemptOverride?: boolean;
  reasonCode?: string | null;
  reasonNote?: string | null;
  evidenceRefs?: string[] | null;
}
