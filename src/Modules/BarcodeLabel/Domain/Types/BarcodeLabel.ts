export type LabelTemplateStatus = 'Draft' | 'Active' | 'Inactive';
export type PrintJobStatus =
  | 'Requested'
  | 'Previewed'
  | 'Failed'
  | 'ReprintRequested'
  | 'Reprinted'
  | 'Cancelled';

export interface LabelTemplate {
  id: string;
  templateCode: string;
  templateName: string;
  labelType: string;
  status: LabelTemplateStatus;
  requiredFields: string[];
  templateBody: string;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface PrintJob {
  id: string;
  jobCode: string;
  templateId: string;
  templateVersionId: string;
  businessObjectType: string;
  businessObjectId: string;
  businessObjectCode: string | null;
  warehouseId: string | null;
  ownerId: string | null;
  payloadJson: Record<string, unknown>;
  previewContent: string | null;
  status: PrintJobStatus;
  validationErrors: Record<string, unknown> | null;
  reprintCount: number;
  requestedBy: string | null;
  requestedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}
