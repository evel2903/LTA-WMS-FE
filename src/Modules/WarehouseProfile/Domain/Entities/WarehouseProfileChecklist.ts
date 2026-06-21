export type ProfileChecklistItemStatus = 'PASS' | 'FAIL' | 'WARNING' | 'DEFERRED';

export const PROFILE_CHECKLIST_ITEM_STATUSES: readonly ProfileChecklistItemStatus[] = [
  'PASS',
  'FAIL',
  'WARNING',
  'DEFERRED',
];

export const PROFILE_CHECKLIST_STATUS_LABELS: Record<ProfileChecklistItemStatus, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  WARNING: 'Warning',
  DEFERRED: 'Deferred',
};

export interface WarehouseProfileChecklistItem {
  code: string;
  title: string;
  status: ProfileChecklistItemStatus;
  message: string;
  evidence: string[];
  deferredToStory: string | null;
}

export interface WarehouseProfileChecklist {
  profileId: string;
  warehouseTypeCode: string;
  overallStatus: ProfileChecklistItemStatus;
  items: WarehouseProfileChecklistItem[];
  evaluatedAt: string;
}
