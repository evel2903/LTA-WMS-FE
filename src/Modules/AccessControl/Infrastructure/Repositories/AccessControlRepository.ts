import type { HttpClient } from '@shared/Services/Http/ApiClient';
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
  ResetRolePermissionsInput,
  RoleListFilter,
  SetRolePermissionsInput,
  UserListFilter,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import { ACCESS_CONTROL_ENDPOINTS } from '@modules/AccessControl/Infrastructure/Api/AccessControlEndpoints';
import type {
  DataScopeDto,
  EffectivePermissionsDto,
  EffectivePermissionsResponseDto,
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

  async listRoles(filter: RoleListFilter = {}): Promise<PaginatedResponse<Role>> {
    const dto = await this.http.get<PagedDto<RoleDto>>(ACCESS_CONTROL_ENDPOINTS.ROLES, {
      params: paging(filter),
    });
    return AccessControlMapper.toPaged(dto, (item) => AccessControlMapper.toRole(item));
  }

  // No filter param: this is "the whole catalog", not a page — a caller-supplied page/pageSize
  // would contradict that contract by silently skipping earlier pages (Review Finding).
  //
  // Fails closed (throws) on any pagination-contract violation instead of returning a
  // partial/unprovable catalog as if it were complete (Review Finding, re-review round 3) —
  // `PagedDto.Items`/`Meta.TotalPages` are typed as always-present for this endpoint, so a
  // response that doesn't honor that at runtime is a genuine contract break, not a case to
  // silently tolerate. `useAllRoles()`'s caller already renders a real error state for this.
  async listAllRoles(): Promise<Role[]> {
    const all: Role[] = [];
    const seenRoleCodes = new Set<string>();
    // Defensive bound — a real role catalog never approaches 100k rows; this only guards
    // against a malformed/looping backend response, not real usage.
    const MAX_PAGES = 1000;
    let totalPages: number | undefined;
    let totalItems: number | undefined;
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const dto = await this.http.get<PagedDto<RoleDto>>(ACCESS_CONTROL_ENDPOINTS.ROLES, {
        params: { Page: page, PageSize: MAX_PAGE_SIZE },
      });
      if (!Array.isArray(dto?.Items)) {
        throw new Error(`listAllRoles: malformed response at page ${page} — Items is not an array`);
      }
      if (dto.Meta?.Page !== page) {
        throw new Error(
          `listAllRoles: backend echoed page ${dto.Meta?.Page} for a page ${page} request — cannot trust the accumulated result`,
        );
      }
      const reportedTotalPages = dto.Meta?.TotalPages;
      if (!Number.isInteger(reportedTotalPages) || reportedTotalPages <= 0) {
        throw new Error(`listAllRoles: malformed TotalPages at page ${page} (${reportedTotalPages})`);
      }
      // Same "lock from first page only" rationale as `totalPages` below — validates the
      // metadata shape at this boundary, not cross-page consistency (Review Finding, round 6).
      const reportedTotalItems = dto.Meta?.TotalItems;
      if (!Number.isInteger(reportedTotalItems) || reportedTotalItems < 0) {
        throw new Error(`listAllRoles: malformed TotalItems at page ${page} (${reportedTotalItems})`);
      }
      // Captured once, from the first page — later drift (concurrent inserts/deletes shifting
      // the real boundary) is a separate, already-deferred risk, not something this call can
      // detect or fix without a backend cursor/snapshot.
      if (totalPages === undefined) {
        // Reject an implausible total up front — otherwise an obviously-wrong huge number
        // still burns all `MAX_PAGES` sequential requests before the loop bound catches it
        // (Review Finding, round 4/5).
        if (reportedTotalPages > MAX_PAGES) {
          throw new Error(
            `listAllRoles: TotalPages (${reportedTotalPages}) exceeds the ${MAX_PAGES}-page bound — refusing to issue a request storm for an implausible catalog size`,
          );
        }
        totalPages = reportedTotalPages;
        totalItems = reportedTotalItems;
        // The only valid BE empty-catalog contract is exactly one empty page (`TotalItems: 0`
        // paired with `TotalPages: 1`) — `TotalItems: 0` with `TotalPages > 1` is self-
        // contradictory (a truly empty catalog can't span more than one page) and must fail
        // closed here rather than being silently accepted as complete (Review Finding, round 10).
        if (totalItems === 0 && totalPages !== 1) {
          throw new Error(
            `listAllRoles: contradictory empty-catalog metadata — TotalItems=0 but TotalPages=${totalPages}`,
          );
        }
      }

      if (dto.Items.length === 0) {
        // A genuinely empty catalog (`TotalItems: 0`) legitimately reports a single empty page
        // as both the first AND the declared end (BE `ToPagedResult()` contract) — that is not
        // an incomplete response, so only fail closed here when items were actually expected
        // (Review Finding, round 9).
        // `totalItems` is always assigned in lockstep with `totalPages` above (same `if`
        // block), which TS has already narrowed by this point — the `!` reflects that same
        // invariant for the one variable TS can't co-narrow on its own.
        if (page <= totalPages && totalItems! > 0) {
          throw new Error(
            `listAllRoles: page ${page} was empty before the declared end (TotalPages=${totalPages})`,
          );
        }
        if (all.length !== totalItems) {
          throw new Error(
            `listAllRoles: accumulated ${all.length} unique role(s) but TotalItems declared ${totalItems} — refusing to return a mismatched catalog`,
          );
        }
        return all;
      }
      const roles = dto.Items.map((item) => AccessControlMapper.toRole(item));
      // A role repeated across pages means the offset pagination overlapped/shifted — fail
      // fast instead of silently rendering duplicate options in the assignment dropdown
      // (Review Finding, round 4/5).
      for (const role of roles) {
        if (seenRoleCodes.has(role.roleCode)) {
          throw new Error(
            `listAllRoles: duplicate role code "${role.roleCode}" at page ${page} — malformed/overlapping pagination`,
          );
        }
        seenRoleCodes.add(role.roleCode);
      }
      all.push(...roles);
      if (page >= totalPages) {
        // `TotalPages`/empty-page checks alone don't guarantee every page was fully
        // utilized — a non-final page could under-report items without any single-page
        // check catching it. Cross-check the accumulated unique count against
        // `Meta.TotalItems` before trusting the catalog is really complete (Review Finding,
        // round 6).
        if (all.length !== totalItems) {
          throw new Error(
            `listAllRoles: accumulated ${all.length} unique role(s) but TotalItems declared ${totalItems} — refusing to return a mismatched catalog`,
          );
        }
        return all;
      }
    }
    throw new Error(
      `listAllRoles: exceeded ${MAX_PAGES} pages without reaching the declared end — refusing to return a possibly-truncated catalog`,
    );
  }

  async getRole(roleCode: RoleCode): Promise<RoleDetail> {
    const dto = await this.http.get<RoleDto>(ACCESS_CONTROL_ENDPOINTS.ROLE_BY_CODE(roleCode));
    return AccessControlMapper.toRoleDetail(dto);
  }

  async createRole(input: CreateRoleInput): Promise<Role> {
    const dto = await this.http.post<RoleDto>(
      ACCESS_CONTROL_ENDPOINTS.ROLES,
      AccessControlMapper.toCreateRoleRequest(input),
    );
    return AccessControlMapper.toRole(dto);
  }

  async setRolePermissions(
    id: string,
    input: SetRolePermissionsInput,
  ): Promise<{ permissions: { action: string; objectType: string }[]; version: number }> {
    const dto = await this.http.put<EffectivePermissionsResponseDto>(
      ACCESS_CONTROL_ENDPOINTS.ROLE_PERMISSIONS(id),
      AccessControlMapper.toSetRolePermissionsRequest(input),
    );
    return AccessControlMapper.toEffectivePermissionsResult(dto);
  }

  async resetRolePermissions(
    id: string,
    input: ResetRolePermissionsInput,
  ): Promise<{ permissions: { action: string; objectType: string }[]; version: number }> {
    const dto = await this.http.post<EffectivePermissionsResponseDto>(
      ACCESS_CONTROL_ENDPOINTS.ROLE_PERMISSIONS_RESET(id),
      AccessControlMapper.toResetRolePermissionsRequest(input),
    );
    return AccessControlMapper.toEffectivePermissionsResult(dto);
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
