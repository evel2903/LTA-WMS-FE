import type {
  LabelBlockingDownstreamAction,
  LabelTemplateStatus,
  PrintJobStatus,
} from '@modules/BarcodeLabel/Domain/Types/BarcodeLabel';

export const BARCODE_LABEL_DEFAULT_PAGE_SIZE = 50;
export const BARCODE_LABEL_MAX_PAGE_SIZE = 100;

export const LABEL_TEMPLATE_STATUSES: LabelTemplateStatus[] = ['Draft', 'Active', 'Inactive'];
export const PRINT_JOB_STATUSES: PrintJobStatus[] = [
  'Requested',
  'Previewed',
  'Failed',
  'ReprintRequested',
  'Reprinted',
  'Cancelled',
];
export const LABEL_TYPES = ['LPN', 'Package', 'Item'] as const;
export const LABEL_BLOCKING_ACTIONS: LabelBlockingDownstreamAction[] = [
  'putaway',
  'ready_for_staging',
  'loading',
];
