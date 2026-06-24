import type { PackageCheckResult, PackageStatus } from '@modules/Packing/Domain/Types/Packing';

export interface PackageListFilter {
  page?: number;
  pageSize?: number;
  warehouseId?: string;
  ownerId?: string;
  status?: PackageStatus;
  pickTaskId?: string;
  outboundOrderId?: string;
}

export interface StartPackSessionInput {
  pickTaskId: string;
  mobileTaskId?: string;
  warehouseProfileId: string;
  checkRequired?: boolean;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface RecordPackCheckInput {
  checkResult: PackageCheckResult;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  observedQuantity?: number;
  observedSkuId?: string;
  observedSkuCode?: string;
  weight?: number;
  idempotencyKey: string;
}

export interface CreatePackageContentInput {
  pickTaskId?: string;
  quantity?: number;
}

export interface CreatePackageInput {
  packSessionId: string;
  cartonType: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  contents?: CreatePackageContentInput[];
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface ClosePackageInput {
  cartonType?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  idempotencyKey: string;
}

export interface ReadyForStagingInput {
  attemptOverride?: boolean;
  reasonCode?: string;
  reasonNote?: string;
  evidenceRefs?: string[];
  labelType?: string;
  idempotencyKey: string;
}
