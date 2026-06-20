import type { DataScopeType, RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

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
  Status: string;
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

export interface AssignDataScopeRequestDto {
  ScopeType: DataScopeType;
  ScopeValueId?: string;
  ScopeValueCode?: string;
  IncludeAll?: boolean;
}
