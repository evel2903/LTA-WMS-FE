import type { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

/**
 * Create input for `POST /warehouse-profiles` (camelCase). Status is NOT here —
 * create always yields DRAFT on the backend. The six scope axes are optional
 * (absent = wildcard). The seven policy blocks are optional JSON.
 */
export interface CreateWarehouseProfileInput {
  profileCode: string;
  profileName: string;
  warehouseTypeCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  // Six V0 axes (architecture 5.3).
  warehouseId?: string | null;
  zoneId?: string | null;
  locationType?: string | null;
  ownerId?: string | null;
  skuId?: string | null;
  itemClass?: string | null;
  orderType?: string | null;
  customerId?: string | null;
  supplierId?: string | null;
  // Seven policy blocks (architecture 5.2).
  capabilityFlags?: Record<string, unknown>;
  strategyPolicy?: Record<string, unknown>;
  thresholdPolicy?: Record<string, unknown>;
  approvalPolicy?: Record<string, unknown>;
  labelDevicePolicy?: Record<string, unknown>;
  integrationPolicy?: Record<string, unknown>;
  auditPolicy?: Record<string, unknown>;
  sourceSystem?: string | null;
  referenceId?: string | null;
}

/** Update input for `PATCH /warehouse-profiles/:id` — partial; OMIT semantics. */
export type UpdateWarehouseProfileInput = Partial<CreateWarehouseProfileInput>;

/**
 * Activation context for `POST /warehouse-profiles/:id/activate`. All optional.
 * reasonCode / reasonNote / actorUserId are metadata only — NOT validated
 * against a catalog and NOT enforced in B6 (Epic C owns that). reasonCode is the
 * canonical reason field (handoff rule 11); reasonNote is a secondary note.
 */
export interface ActivateWarehouseProfileInput {
  actorUserId?: string | null;
  reasonCode?: string | null;
  reasonNote?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

/** Deactivation context for `POST /warehouse-profiles/:id/deactivate`. All optional. */
export interface DeactivateWarehouseProfileInput {
  actorUserId?: string | null;
  reasonCode?: string | null;
  reasonNote?: string | null;
}

/** Assignment create input for `POST /warehouse-profiles/:id/assignments`. */
export interface CreateAssignmentInput {
  assignmentType: AssignmentType;
  warehouseTypeCode?: string | null;
  warehouseId?: string | null;
  sourceSystem?: string | null;
  referenceId?: string | null;
}

/** Add-rule input for `POST /warehouse-profiles/:id/rules`. */
export interface AddProfileRuleInput {
  ruleDefinitionId: string;
  isEnabled?: boolean;
  overridePriority?: number | null;
  sourceSystem?: string | null;
  referenceId?: string | null;
}

/**
 * Preview context for `POST /rules/preview` (the six V0 axes + actor metadata +
 * optional as-of time / attributes). warehouseTypeCode is business-required;
 * everything else is optional (absent = wildcard).
 *
 * NOTE (contract divergence — Dev Notes): there is intentionally NO `profileId`
 * here. The merged BE preview HTTP request declares no ProfileId and runs under
 * `forbidNonWhitelisted`, so a by-id self-check would 400; the FE self-check
 * resolves by scope only. B6 does not change the BE.
 */
export interface PreviewContextInput {
  warehouseTypeCode: string;
  warehouseId?: string | null;
  zoneId?: string | null;
  locationType?: string | null;
  ownerId?: string | null;
  skuId?: string | null;
  itemClass?: string | null;
  orderType?: string | null;
  customerId?: string | null;
  supplierId?: string | null;
  actorUserId?: string | null;
  action?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  reasonCode?: string | null;
  evaluatedAt?: string | null;
  attributes?: Record<string, unknown>;
}
