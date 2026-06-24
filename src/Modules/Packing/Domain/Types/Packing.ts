import type {
  PACKAGE_CHECK_RESULTS,
  PACKAGE_STATUSES,
  PACK_SESSION_STATUSES,
} from '@modules/Packing/Domain/Constants/PackingConstants';

export type PackageStatus = (typeof PACKAGE_STATUSES)[number];
export type PackSessionStatus = (typeof PACK_SESSION_STATUSES)[number];
export type PackageCheckResult = (typeof PACKAGE_CHECK_RESULTS)[number];
export type LabelBlockingDecision = 'NotRequired' | 'Allowed' | 'Blocked' | 'OverrideAccepted';

export interface PackSession {
  id: string;
  sessionNumber: string;
  pickTaskId: string;
  mobileTaskId: string | null;
  outboundOrderId: string;
  warehouseProfileId: string;
  warehouseId: string | null;
  warehouseCode: string | null;
  ownerId: string | null;
  ownerCode: string | null;
  status: PackSessionStatus;
  checkRequired: boolean;
  checkResult: PackageCheckResult;
  checkExceptionCaseId: string | null;
  startedAt: string;
  startedBy: string | null;
  checkedAt: string | null;
  checkedBy: string | null;
}

export interface PackageContent {
  id: string;
  packageId: string;
  pickTaskId: string;
  outboundOrderLineId: string;
  sourceBalanceId: string;
  sourceDimensionId: string;
  skuId: string;
  skuCode: string | null;
  uomId: string;
  uomCode: string | null;
  quantity: number;
  inventoryStatusCode: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expiryDate: string | null;
  createdAt: string;
}

export interface Package {
  id: string;
  packageCode: string;
  packSessionId: string;
  pickTaskId: string;
  outboundOrderId: string;
  warehouseProfileId: string;
  warehouseId: string | null;
  warehouseCode: string | null;
  ownerId: string | null;
  ownerCode: string | null;
  status: PackageStatus;
  checkRequired: boolean;
  checkResult: PackageCheckResult;
  cartonType: string;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  labelBlockingDecision: LabelBlockingDecision | null;
  labelPrintJobId: string | null;
  labelPrintJobCode: string | null;
  closedAt: string | null;
  closedBy: string | null;
  readyForStagingAt: string | null;
  readyForStagingBy: string | null;
  createdAt: string;
  updatedAt: string;
  contents: PackageContent[];
}

export interface LabelBlockingValidation {
  allowed: boolean;
  blocked: boolean;
  decision: LabelBlockingDecision;
  requiredLabelType: string | null;
  policyMode: string;
  overrideAllowed: boolean;
  overrideAccepted: boolean;
  reason: string;
  matchedPrintJobId: string | null;
  matchedPrintJobCode: string | null;
  validationDetails: Record<string, unknown>;
}

export interface ReadyForStagingResult {
  package: Package;
  labelValidation: LabelBlockingValidation;
  isDuplicate: boolean;
}
