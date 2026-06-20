import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  EffectivePermissions,
  Permission,
  Role,
  RoleDetail,
  UserDataScope,
  UserSummary,
} from '@modules/AccessControl/Domain/Entities/AccessControl';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import type {
  AssignDataScopeRequestDto,
  AssignRoleRequestDto,
  DataScopeDto,
  EffectivePermissionsDto,
  PagedDto,
  PermissionDto,
  RoleDto,
  UserDto,
} from '@modules/AccessControl/Infrastructure/Dtos/AccessControlDtos';

/**
 * Strips nullish fields so request payloads OMIT them (project OMIT contract).
 * `false` and `0` are real values and survive.
 */
function removeEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
  ) as T;
}

export const AccessControlMapper = {
  toPaged<TDto, TEntity>(
    dto: PagedDto<TDto>,
    mapper: (item: TDto) => TEntity,
  ): PaginatedResponse<TEntity> {
    const items = dto?.Items ?? [];
    const meta = dto?.Meta;
    return {
      items: items.map(mapper),
      page: meta?.Page ?? 1,
      pageSize: meta?.PageSize ?? 0,
      totalItems: meta?.TotalItems ?? 0,
      totalPages: meta?.TotalPages ?? 0,
    };
  },

  toPermission(dto: PermissionDto): Permission {
    return {
      id: dto.Id,
      permissionCode: dto.PermissionCode,
      action: dto.Action,
      objectType: dto.ObjectType,
      description: dto.Description,
    };
  },

  toRole(dto: RoleDto): Role {
    return {
      roleCode: dto.RoleCode,
      roleName: dto.RoleName,
      description: dto.Description,
      isSystem: dto.IsSystem,
      status: dto.Status,
    };
  },

  toRoleDetail(dto: RoleDto): RoleDetail {
    return {
      ...AccessControlMapper.toRole(dto),
      permissions: (dto.Permissions ?? []).map((permission) =>
        AccessControlMapper.toPermission(permission),
      ),
    };
  },

  toUser(dto: UserDto): UserSummary {
    return {
      id: dto.Id,
      firstName: dto.FirstName,
      lastName: dto.LastName,
      email: dto.EmailAddress,
      createdAt: dto.CreatedAt,
    };
  },

  toDataScope(dto: DataScopeDto): UserDataScope {
    return {
      id: dto.Id,
      scopeType: dto.ScopeType,
      scopeValueId: dto.ScopeValueId,
      scopeValueCode: dto.ScopeValueCode,
      includeAll: dto.IncludeAll,
    };
  },

  toEffectivePermissions(dto: EffectivePermissionsDto): EffectivePermissions {
    return {
      userId: dto.UserId,
      roles: dto.Roles ?? [],
      permissions: (dto.Permissions ?? []).map((permission) => ({
        action: permission.Action,
        objectType: permission.ObjectType,
        permissionCode: permission.PermissionCode,
      })),
    };
  },

  // ── Request builders (PascalCase, nullish stripped per OMIT contract) ────────

  toAssignRoleRequest(input: AssignRoleInput): AssignRoleRequestDto {
    return { RoleCode: input.roleCode };
  },

  toAssignDataScopeRequest(input: AssignDataScopeInput): AssignDataScopeRequestDto {
    return removeEmpty({
      ScopeType: input.scopeType,
      ScopeValueId: input.scopeValueId,
      ScopeValueCode: input.scopeValueCode,
      IncludeAll: input.includeAll,
    }) as AssignDataScopeRequestDto;
  },
};
