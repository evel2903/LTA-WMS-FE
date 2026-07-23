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
  ApplyIntentResult,
  AssignmentIntentSnapshot,
  IntentOperation,
  RegisterIntentResult,
} from '@modules/AccessControl/Domain/Types/AssignmentIntentTypes';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
  CreateRoleInput,
  PermissionListFilter,
  ResetRolePermissionsInput,
  RolePermissionsResult,
  RoleListFilter,
  SetRolePermissionsInput,
  UpdateRoleInput,
  UserListFilter,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';

/** Application port for the RBAC read/list/create + assignment surface. */
export interface IAccessControlRepository {
  // Roles & permissions
  listRoles(filter?: RoleListFilter): Promise<PaginatedResponse<Role>>;
  /** Pages through the whole role catalog (no silent truncation past PageSize ≤ 100); always
   * starts at page 1 — there is no meaningful "page" for "the whole catalog". */
  listAllRoles(): Promise<Role[]>;
  getRole(roleCode: RoleCode): Promise<RoleDetail>;
  createRole(input: CreateRoleInput): Promise<Role>;
  updateRole(id: string, input: UpdateRoleInput): Promise<Role>;
  /** Pages through the whole permission catalog (no silent truncation). */
  listAllPermissions(filter?: PermissionListFilter): Promise<Permission[]>;
  /** Full-set declarative write — `id` is the role's UUID (`RoleDetail.id`), not `roleCode`. */
  setRolePermissions(
    id: string,
    input: SetRolePermissionsInput,
  ): Promise<RolePermissionsResult>;
  /** System role only — BE rejects `is_system=false` with 400. */
  resetRolePermissions(
    id: string,
    input: ResetRolePermissionsInput,
  ): Promise<RolePermissionsResult>;

  // Users + per-user assignments
  listUsers(filter?: UserListFilter): Promise<PaginatedResponse<UserSummary>>;
  getUserEffectivePermissions(userId: string): Promise<EffectivePermissions>;
  listUserDataScopes(userId: string): Promise<UserDataScope[]>;

  // RH-04 (RH-ASG-01 / D3) server-fenced intent protocol.
  registerAssignmentIntent(
    userId: string,
    canonicalRoleCode: RoleCode,
    input: { operation: IntentOperation; runId: string },
  ): Promise<RegisterIntentResult>;
  applyAssignIntent(
    userId: string,
    input: { roleCode: RoleCode; runId: string; intentVersion: string },
  ): Promise<ApplyIntentResult>;
  applyRemoveIntent(
    userId: string,
    canonicalRoleCode: RoleCode,
    input: { runId: string; intentVersion: string },
  ): Promise<ApplyIntentResult>;
  recoverAssignmentIntent(userId: string, canonicalRoleCode: RoleCode): Promise<AssignmentIntentSnapshot>;

  // Mutations (WMS_ADMIN only — backend enforces; 403 otherwise)
  assignRole(userId: string, input: AssignRoleInput): Promise<void>;
  removeRole(userId: string, roleCode: RoleCode): Promise<void>;
  assignDataScope(userId: string, input: AssignDataScopeInput): Promise<UserDataScope>;
  removeDataScope(userId: string, scopeId: string): Promise<void>;
}
