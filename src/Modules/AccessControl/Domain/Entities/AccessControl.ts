import type { DataScopeType, RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

/** A permission definition: a single (action, object) pair the system understands. */
export interface Permission {
  id: string;
  permissionCode: string;
  action: string;
  objectType: string;
  description: string | null;
}

/** A role header (list shape — no permissions). */
export interface Role {
  id: string;
  roleCode: RoleCode;
  roleName: string;
  description: string | null;
  isSystem: boolean;
  status: string;
}

/** A role with its granted permissions (detail shape — feeds the matrix cells). */
export interface RoleDetail extends Role {
  permissions: Permission[];
}

/** A user row for the assignment screen. The backend UserDto carries no roles. */
export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

/** A data-scope grant attached directly to a user. */
export interface UserDataScope {
  id: string;
  scopeType: DataScopeType;
  scopeValueId: string | null;
  scopeValueCode: string | null;
  includeAll: boolean;
}

/** The roles + permissions a user effectively holds (read-back after assignment). */
export interface EffectivePermissions {
  userId: string;
  roles: RoleCode[];
  permissions: { action: string; objectType: string; permissionCode: string }[];
}
