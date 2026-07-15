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
