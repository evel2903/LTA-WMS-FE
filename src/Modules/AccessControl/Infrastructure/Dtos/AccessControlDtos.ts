import type {
  DataScopeType,
  RoleCode,
  RoleStatus,
} from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

/** Paginated list envelope `{ Items, Meta }` (shared BE list shape). */
export interface PagedDto<TItem> {
  Items: TItem[];
  Meta: {
    Page: number;
    PageSize: number;
    TotalItems: number;
    TotalPages: number;
  };
}

export interface PermissionDto {
  Id: string;
  PermissionCode: string;
  Action: string;
  ObjectType: string;
  Description: string | null;
}

export interface RoleDto {
  Id: string;
  RoleCode: RoleCode;
  RoleName: string;
  Description: string | null;
  IsSystem: boolean;
  Status: RoleStatus;
  PermissionsVersion: number;
  UpdatedAt: string;
  Permissions?: PermissionDto[];
}

export interface UserDto {
  Id: string;
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  CreatedAt: string;
}

export interface DataScopeDto {
  Id: string;
  ScopeType: DataScopeType;
  ScopeValueId: string | null;
  ScopeValueCode: string | null;
  IncludeAll: boolean;
}

export interface EffectivePermissionsDto {
  UserId: string;
  Roles: RoleCode[];
  Permissions: { Action: string; ObjectType: string; PermissionCode: string }[];
}

// ── Request DTOs (PascalCase) ─────────────────────────────────────────────────

export interface AssignRoleRequestDto {
  RoleCode: RoleCode;
}

export interface CreateRoleRequestDto {
  RoleCode: string;
  RoleName: string;
  Description?: string;
}

export interface UpdateRoleRequestDto {
  ExpectedUpdatedAt: string;
  RoleName?: string;
  Description?: string | null;
  Status?: RoleStatus;
}

export interface AssignDataScopeRequestDto {
  ScopeType: DataScopeType;
  ScopeValueId?: string;
  ScopeValueCode?: string;
  IncludeAll?: boolean;
}

// ── Role-permissions request/response DTOs (lower-camel — Signal 3 exception, mirrors RA-02's
// PUT/reset endpoints, unlike the rest of this file's PascalCase convention) ──────────────

export interface SetRolePermissionsRequestDto {
  permissions: { action: string; objectType: string }[];
  /** Must equal the role's current PermissionsVersion (from the last GET) — mismatch is a 409. */
  version: number;
  reasonCode: string;
  reasonNote?: string;
}

export interface ResetRolePermissionsRequestDto {
  reasonCode: string;
  reasonNote?: string;
}

/** Existing lower-camel response shape for both PUT and reset. */
export interface EffectivePermissionsResponseDto {
  permissions: { action: string; objectType: string }[];
  version: number;
}
