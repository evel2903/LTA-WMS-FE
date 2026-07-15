import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  EffectivePermissions,
  Permission,
  Role,
  RoleDetail,
  UserDataScope,
  UserSummary,
} from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
  CreateRoleInput,
  PermissionListFilter,
  RoleListFilter,
  UserListFilter,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';

/** Application port for the RBAC read/list/create + assignment surface. */
export interface IAccessControlRepository {
  // Roles & permissions
  listRoles(filter?: RoleListFilter): Promise<PaginatedResponse<Role>>;
  getRole(roleCode: RoleCode): Promise<RoleDetail>;
  createRole(input: CreateRoleInput): Promise<Role>;
  /** Pages through the whole permission catalog (no silent truncation). */
  listAllPermissions(filter?: PermissionListFilter): Promise<Permission[]>;

  // Users + per-user assignments
  listUsers(filter?: UserListFilter): Promise<PaginatedResponse<UserSummary>>;
  getUserEffectivePermissions(userId: string): Promise<EffectivePermissions>;
  listUserDataScopes(userId: string): Promise<UserDataScope[]>;

  // Mutations (WMS_ADMIN only — backend enforces; 403 otherwise)
  assignRole(userId: string, input: AssignRoleInput): Promise<void>;
  removeRole(userId: string, roleCode: RoleCode): Promise<void>;
  assignDataScope(userId: string, input: AssignDataScopeInput): Promise<UserDataScope>;
  removeDataScope(userId: string, scopeId: string): Promise<void>;
}
