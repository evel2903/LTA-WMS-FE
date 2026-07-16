import type { DataScopeType, RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

/** Assign-role input for `POST /access-control/users/:userId/roles`. */
export interface AssignRoleInput {
  roleCode: RoleCode;
}

/** Create-role input for `POST /access-control/roles` (RA-01). */
export interface CreateRoleInput {
  roleCode: string;
  roleName: string;
  description?: string;
}

/**
 * Assign-data-scope input for `POST /access-control/users/:userId/data-scopes`.
 * Either `includeAll` (unrestricted for that scope type) OR a concrete value — the
 * backend rejects both/neither with a BUSINESS_RULE error.
 */
export interface AssignDataScopeInput {
  scopeType: DataScopeType;
  scopeValueId?: string | null;
  scopeValueCode?: string | null;
  includeAll?: boolean;
}

interface PageFilter {
  page?: number;
  pageSize?: number;
}

export type UserListFilter = PageFilter;
export type RoleListFilter = PageFilter;

export interface PermissionListFilter extends PageFilter {
  action?: string;
  objectType?: string;
}

/**
 * Set-role-permissions input for `PUT /access-control/roles/:id/permissions` (RA-02/04).
 * `permissions` is the FULL desired set (declarative, not a diff) — the caller must include
 * every currently-granted cell, including Read auto-tick and rider-locked write-action cells.
 */
export interface SetRolePermissionsInput {
  permissions: { action: string; objectType: string }[];
  /** The role's `permissionsVersion` as last read from GET — mismatch is a 409 (optimistic lock). */
  version: number;
  reasonCode: string;
  reasonNote?: string;
}

/** Reset-role-permissions input for `POST /access-control/roles/:id/permissions/reset` (system role only). */
export interface ResetRolePermissionsInput {
  reasonCode: string;
  reasonNote?: string;
}
