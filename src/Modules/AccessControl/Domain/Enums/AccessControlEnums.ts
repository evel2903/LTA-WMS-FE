/**
 * RBAC enums mirrored verbatim from the backend wire contract (AccessControl module).
 * Kept as string-literal unions so the FE never invents a permission model — the
 * backend is the source of truth (deny-by-default, 403 on over-permission).
 */
import type { SystemRoleCode } from '@shared/Types/SystemRoleCode';

/** Re-exported so existing internal call sites keep resolving it from here — the six
 * core V0 roles (BE RoleCode) live under `@shared/Types` because ReasonCode needs the
 * same closed set without importing AccessControl's Domain internals (AGENTS.md). */
export type { SystemRoleCode };

/** Any role code, core or admin-created custom (RA-03). Capability comes 100% from role_permissions, never from the code itself. */
export type RoleCode = string;

/** Mutable role lifecycle values accepted by the metadata PATCH contract. */
export type RoleStatus = 'ACTIVE' | 'INACTIVE';

/** The four data-scope dimensions (BE DataScopeType). */
export type DataScopeType = 'WAREHOUSE' | 'ZONE' | 'OWNER' | 'CUSTOMER';

export const DATA_SCOPE_TYPES: DataScopeType[] = ['WAREHOUSE', 'ZONE', 'OWNER', 'CUSTOMER'];

export const DATA_SCOPE_LABELS: Record<DataScopeType, string> = {
  WAREHOUSE: 'Warehouse',
  ZONE: 'Zone',
  OWNER: 'Owner',
  CUSTOMER: 'Customer',
};

/** Single source for role-status labels — shared between `RoleStatusBadge` (display) and
 * `RolesMasterPage`'s sort key, so displayed text and sort order can never drift apart. */
export const ROLE_STATUS_LABELS: Record<RoleStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
};
