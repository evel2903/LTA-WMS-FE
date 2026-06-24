import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { PaginatedResponse } from '@shared/Types/Api';
import type {
  EffectivePermissions,
  Permission,
  RoleDetail,
  UserDataScope,
  UserSummary,
} from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
  PermissionListFilter,
  UserListFilter,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import { ACCESS_CONTROL_ENDPOINTS } from '@modules/AccessControl/Infrastructure/Api/AccessControlEndpoints';
import type {
  DataScopeDto,
  EffectivePermissionsDto,
  PagedDto,
  PermissionDto,
  RoleDto,
  UserDto,
} from '@modules/AccessControl/Infrastructure/Dtos/AccessControlDtos';
import { AccessControlMapper } from '@modules/AccessControl/Infrastructure/Mappers/AccessControlMapper';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function paging(filter: { page?: number; pageSize?: number } = {}) {
  return {
    Page: !filter.page || filter.page < 1 ? 1 : filter.page,
    PageSize:
      !filter.pageSize || filter.pageSize < 1
        ? DEFAULT_PAGE_SIZE
        : Math.min(filter.pageSize, MAX_PAGE_SIZE),
  };
}

/** The single place that touches `httpClient` for the access-control surface. */
export class AccessControlRepository implements IAccessControlRepository {
  constructor(private readonly http: HttpClient) {}

  async getRole(roleCode: RoleCode): Promise<RoleDetail> {
    const dto = await this.http.get<RoleDto>(ACCESS_CONTROL_ENDPOINTS.ROLE_BY_CODE(roleCode));
    return AccessControlMapper.toRoleDetail(dto);
  }

  async listAllPermissions(filter: PermissionListFilter = {}): Promise<Permission[]> {
    const all: Permission[] = [];
    let page = filter.page ?? 1;
    // Page through the catalog so the matrix axes are never silently truncated (PageSize ≤ 100).
    for (;;) {
      const dto = await this.http.get<PagedDto<PermissionDto>>(ACCESS_CONTROL_ENDPOINTS.PERMISSIONS, {
        params: { Page: page, PageSize: MAX_PAGE_SIZE, Action: filter.action, ObjectType: filter.objectType },
      });
      const items = dto?.Items ?? [];
      all.push(...items.map((item) => AccessControlMapper.toPermission(item)));
      const totalPages = dto?.Meta?.TotalPages ?? 1;
      if (page >= totalPages || items.length === 0) break;
      page += 1;
    }
    return all;
  }

  async listUsers(filter: UserListFilter = {}): Promise<PaginatedResponse<UserSummary>> {
    const dto = await this.http.get<PagedDto<UserDto>>(ACCESS_CONTROL_ENDPOINTS.USERS, {
      params: paging(filter),
    });
    return AccessControlMapper.toPaged(dto, (item) => AccessControlMapper.toUser(item));
  }

  async getUserEffectivePermissions(userId: string): Promise<EffectivePermissions> {
    const dto = await this.http.get<EffectivePermissionsDto>(
      ACCESS_CONTROL_ENDPOINTS.USER_EFFECTIVE(userId),
    );
    return AccessControlMapper.toEffectivePermissions(dto);
  }

  async listUserDataScopes(userId: string): Promise<UserDataScope[]> {
    const dto = await this.http.get<DataScopeDto[]>(
      ACCESS_CONTROL_ENDPOINTS.USER_DATA_SCOPES(userId),
    );
    return (dto ?? []).map((item) => AccessControlMapper.toDataScope(item));
  }

  async assignRole(userId: string, input: AssignRoleInput): Promise<void> {
    await this.http.post<unknown>(
      ACCESS_CONTROL_ENDPOINTS.USER_ROLES(userId),
      AccessControlMapper.toAssignRoleRequest(input),
    );
  }

  async removeRole(userId: string, roleCode: RoleCode): Promise<void> {
    await this.http.delete<void>(ACCESS_CONTROL_ENDPOINTS.USER_ROLE(userId, roleCode));
  }

  async assignDataScope(userId: string, input: AssignDataScopeInput): Promise<UserDataScope> {
    const dto = await this.http.post<DataScopeDto>(
      ACCESS_CONTROL_ENDPOINTS.USER_DATA_SCOPES(userId),
      AccessControlMapper.toAssignDataScopeRequest(input),
    );
    return AccessControlMapper.toDataScope(dto);
  }

  async removeDataScope(userId: string, scopeId: string): Promise<void> {
    await this.http.delete<void>(ACCESS_CONTROL_ENDPOINTS.USER_DATA_SCOPE(userId, scopeId));
  }
}
