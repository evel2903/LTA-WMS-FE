import type { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

/** Audit / provenance fields shared by every warehouse-profile domain entity (camelCase). */
export interface WarehouseProfileAuditFields {
  sourceSystem: string | null;
  referenceId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/** The six V0 configuration axes (architecture 5.3). null/absent = wildcard. */
export interface ProfileScope {
  warehouseId: string | null;
  zoneId: string | null;
  locationType: string | null;
  ownerId: string | null;
  skuId: string | null;
  itemClass: string | null;
  orderType: string | null;
  customerId: string | null;
  supplierId: string | null;
}

/** The seven policy JSONB blocks carried by a profile (architecture 5.2). */
export interface ProfilePolicies {
  capabilityFlags: Record<string, unknown>;
  strategyPolicy: Record<string, unknown>;
  thresholdPolicy: Record<string, unknown>;
  approvalPolicy: Record<string, unknown>;
  labelDevicePolicy: Record<string, unknown>;
  integrationPolicy: Record<string, unknown>;
  auditPolicy: Record<string, unknown>;
}

export interface WarehouseProfile extends WarehouseProfileAuditFields, ProfileScope, ProfilePolicies {
  id: string;
  profileCode: string;
  profileName: string;
  warehouseTypeCode: string;
  version: number;
  status: WarehouseProfileStatus;
  scopeKey: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}
