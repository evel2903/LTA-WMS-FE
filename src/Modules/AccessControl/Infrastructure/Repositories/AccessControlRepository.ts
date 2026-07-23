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
  RolePermissionsResult,
  RoleListFilter,
  SetRolePermissionsInput,
  UpdateRoleInput,
  UserListFilter,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import { ACCESS_CONTROL_ENDPOINTS } from '@modules/AccessControl/Infrastructure/Api/AccessControlEndpoints';
import type {
  ApplyIntentResult,
  AssignmentIntentSnapshot,
  IntentOperation,
  RegisterIntentResult,
} from '@modules/AccessControl/Domain/Types/AssignmentIntentTypes';

interface RegisterIntentDto {
  RunId: string;
  Operation: IntentOperation;
  Status: RegisterIntentResult['status'];
  IntentVersion: string;
  EffectiveVersion: string;
  IsCurrent: boolean;
}
interface ApplyIntentDto {
  Status: ApplyIntentResult['status'];
  RunId: string;
  IntentVersion: string;
  EffectiveVersion: string;
  RoleCode: RoleCode;
  Assigned?: boolean;
  Removed?: boolean;
}
interface AssignmentIntentSnapshotDto {
  UserId: string;
  RoleCode: RoleCode;
  RunId: string | null;
  Operation: IntentOperation | null;
  Status: AssignmentIntentSnapshot['status'];
  IntentVersion: string;
  EffectiveVersion: string;
  AssignedRoleCodes: RoleCode[];
  IsOwnedByCurrentActor: boolean;
}
import type {
  CompleteRoleCatalogDto,
  DataScopeDto,
  EffectivePermissionsDto,
  EffectivePermissionsResponseDto,
  PagedDto,
  PermissionDto,
  RoleDto,
  UserDto,
} from '@modules/AccessControl/Infrastructure/Dtos/AccessControlDtos';
import { AccessControlMapper } from '@modules/AccessControl/Infrastructure/Mappers/AccessControlMapper';
import { ApiError } from '@shared/Services/Http/ApiError';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_CATALOG_TOKEN_LENGTH = 4096;
const BASE64URL_SEGMENT = /^[A-Za-z0-9_-]+$/;
const CANONICAL_UPDATED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.CrawlVerifiedRoleCatalog();
      } catch (error) {
        if (attempt === 0 && this.IsCatalogRestartError(error)) continue;
        throw error;
      }
    }
    throw new Error('listAllRoles: role catalog restart bound exhausted');
  }

  private async CrawlVerifiedRoleCatalog(): Promise<Role[]> {
    const all: Role[] = [];
    const seen = new Set<string>();
    let expectedTotalItems: number | undefined;
    let expectedTotalPages: number | undefined;
    let token: string | undefined;
    let previousCode: string | undefined;

    for (let page = 1; ; page += 1) {
      const params = {
        CompleteCatalog: true as const,
        Page: page,
        PageSize: MAX_PAGE_SIZE,
        ...(token ? { CatalogToken: token } : {}),
      };
      const dto = await this.FetchCatalogPage(params);
      this.AssertCatalogPage(dto, page);

      if (expectedTotalItems === undefined) {
        expectedTotalItems = dto.TotalItems;
        expectedTotalPages = dto.TotalPages;
      } else if (dto.TotalItems !== expectedTotalItems || dto.TotalPages !== expectedTotalPages) {
        throw new Error('listAllRoles: catalog totals changed within a signed attempt');
      }

      const roles = dto.Items.map((item) => AccessControlMapper.toRole(item));
      for (const role of roles) {
        if (seen.has(role.roleCode)) throw new Error(`listAllRoles: duplicate role code "${role.roleCode}"`);
        if (previousCode !== undefined && this.CompareUtf8(previousCode, role.roleCode) >= 0) {
          throw new Error('listAllRoles: role codes are not in canonical byte order');
        }
        seen.add(role.roleCode);
        previousCode = role.roleCode;
        all.push(role);
      }

      if (dto.CatalogToken === null) {
        if (page !== expectedTotalPages || all.length !== expectedTotalItems) {
          throw new Error('listAllRoles: final page/count geometry is inconsistent');
        }
        return all;
      }
      token = dto.CatalogToken;
    }
    throw new Error('listAllRoles: exceeded role catalog page safety bound');
  }

  private async FetchCatalogPage(params: {
    CompleteCatalog: true;
    Page: number;
    PageSize: number;
    CatalogToken?: string;
  }): Promise<CompleteRoleCatalogDto> {
    try {
      return await this.http.get<CompleteRoleCatalogDto>(ACCESS_CONTROL_ENDPOINTS.ROLES, { params });
    } catch (error) {
      if (this.IsCatalogRestartError(error)) throw error;
      if (!this.IsTransientCatalogError(error)) throw error;
      return await this.http.get<CompleteRoleCatalogDto>(ACCESS_CONTROL_ENDPOINTS.ROLES, { params });
    }
  }

  private AssertCatalogPage(dto: CompleteRoleCatalogDto, requestedPage: number): void {
    if (!Array.isArray(dto?.Items)) throw new Error('listAllRoles: Items is not an array');
    if (dto.Page !== requestedPage) throw new Error('listAllRoles: page echo mismatch');
    if (dto.PageSize !== MAX_PAGE_SIZE || dto.CrawlShape?.PageSize !== MAX_PAGE_SIZE) {
      throw new Error('listAllRoles: crawl PageSize mismatch');
    }
    if (dto.CrawlShape?.Order !== 'ROLE_CODE_C_ASC') throw new Error('listAllRoles: crawl order mismatch');
    if (!Number.isSafeInteger(dto.TotalItems) || dto.TotalItems < 0) throw new Error('listAllRoles: invalid TotalItems');
    if (!Number.isSafeInteger(dto.TotalPages) || dto.TotalPages < 1) throw new Error('listAllRoles: invalid TotalPages');
    const computedPages = Math.max(1, Math.ceil(dto.TotalItems / MAX_PAGE_SIZE));
    if (computedPages !== dto.TotalPages || requestedPage > dto.TotalPages) {
      throw new Error('listAllRoles: invalid page geometry');
    }
    const expectedItems = dto.TotalItems === 0
      ? 0
      : requestedPage < dto.TotalPages
        ? MAX_PAGE_SIZE
        : dto.TotalItems - (requestedPage - 1) * MAX_PAGE_SIZE;
    if (dto.Items.length !== expectedItems) throw new Error('listAllRoles: page item count mismatch');
    for (const item of dto.Items) this.AssertCatalogRoleItem(item);
    if (requestedPage < dto.TotalPages) {
      if (!this.IsCatalogToken(dto.CatalogToken)) {
        throw new Error('listAllRoles: missing successor token');
      }
    } else if (dto.CatalogToken !== null) {
      throw new Error('listAllRoles: final page must have a null token');
    }
  }

  private AssertCatalogRoleItem(item: unknown): asserts item is RoleDto {
    if (!item || typeof item !== 'object') throw new Error('listAllRoles: role item is not an object');
    const role = item as Partial<RoleDto>;
    if (typeof role.Id !== 'string' || role.Id.length === 0) {
      throw new Error('listAllRoles: role item has an invalid Id');
    }
    if (typeof role.RoleCode !== 'string' || !/^[A-Z][A-Z0-9_]{1,49}$/.test(role.RoleCode)) {
      throw new Error('listAllRoles: role item has an invalid RoleCode');
    }
    if (typeof role.RoleName !== 'string' || role.RoleName.trim().length === 0) {
      throw new Error('listAllRoles: role item has an invalid RoleName');
    }
    if (role.Description !== null && typeof role.Description !== 'string') {
      throw new Error('listAllRoles: role item has an invalid Description');
    }
    if (typeof role.IsSystem !== 'boolean') {
      throw new Error('listAllRoles: role item has an invalid IsSystem');
    }
    if (role.Status !== 'ACTIVE' && role.Status !== 'INACTIVE') {
      throw new Error('listAllRoles: role item has an invalid Status');
    }
    if (!Number.isSafeInteger(role.PermissionsVersion) || (role.PermissionsVersion ?? -1) < 0) {
      throw new Error('listAllRoles: role item has an invalid PermissionsVersion');
    }
    if (
      typeof role.UpdatedAt !== 'string' ||
      !CANONICAL_UPDATED_AT.test(role.UpdatedAt) ||
      new Date(role.UpdatedAt).toISOString() !== role.UpdatedAt
    ) {
      throw new Error('listAllRoles: role item has an invalid UpdatedAt');
    }
  }

  private IsCatalogToken(value: unknown): value is string {
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_CATALOG_TOKEN_LENGTH) return false;
    const parts = value.split('.');
    return parts.length === 2 && parts.every((part) => part.length > 0 && part.length % 4 !== 1 && BASE64URL_SEGMENT.test(part));
  }

  private IsCatalogRestartError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false;
    const reason = (error.details as { Reason?: unknown } | undefined)?.Reason;
    return reason === 'CATALOG_TOKEN_MISMATCH' || reason === 'CATALOG_TOKEN_INVALID';
  }

  private IsTransientCatalogError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return true;
    if (error.code === 'CATALOG_VERSION_EXHAUSTED' || error.code === 'CATALOG_METADATA_RANGE') return false;
    return error.code === 'NETWORK_ERROR' || error.status === 0 || error.status >= 500;
  }

  private CompareUtf8(left: string, right: string): number {
    const encoder = new TextEncoder();
    const a = encoder.encode(left);
    const b = encoder.encode(right);
    const length = Math.min(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      if (a[index] !== b[index]) return a[index] - b[index];
    }
    return a.length - b.length;
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

  async updateRole(id: string, input: UpdateRoleInput): Promise<Role> {
    const dto = await this.http.patch<RoleDto>(
      ACCESS_CONTROL_ENDPOINTS.ROLE_BY_ID(id),
      AccessControlMapper.toUpdateRoleRequest(input),
    );
    return AccessControlMapper.toRole(dto);
  }

  async setRolePermissions(
    id: string,
    input: SetRolePermissionsInput,
  ): Promise<RolePermissionsResult> {
    const dto = await this.http.put<EffectivePermissionsResponseDto>(
      ACCESS_CONTROL_ENDPOINTS.ROLE_PERMISSIONS(id),
      AccessControlMapper.toSetRolePermissionsRequest(input),
    );
    return AccessControlMapper.toEffectivePermissionsResult(dto);
  }

  async resetRolePermissions(
    id: string,
    input: ResetRolePermissionsInput,
  ): Promise<RolePermissionsResult> {
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

  // RH-04 (RH-ASG-01 / D3) intent protocol.
  async registerAssignmentIntent(
    userId: string,
    canonicalRoleCode: RoleCode,
    input: { operation: IntentOperation; runId: string },
  ): Promise<RegisterIntentResult> {
    const dto = await this.http.post<RegisterIntentDto>(
      ACCESS_CONTROL_ENDPOINTS.USER_ROLE_INTENT(userId, canonicalRoleCode),
      { Operation: input.operation, RunId: input.runId },
    );
    return {
      runId: dto.RunId,
      operation: dto.Operation,
      status: dto.Status,
      intentVersion: dto.IntentVersion,
      effectiveVersion: dto.EffectiveVersion,
      isCurrent: dto.IsCurrent,
    };
  }

  async applyAssignIntent(
    userId: string,
    input: { roleCode: RoleCode; runId: string; intentVersion: string },
  ): Promise<ApplyIntentResult> {
    const dto = await this.http.post<ApplyIntentDto>(ACCESS_CONTROL_ENDPOINTS.USER_ROLES(userId), {
      RoleCode: input.roleCode,
      RunId: input.runId,
      IntentVersion: input.intentVersion,
    });
    return AccessControlRepository.toApply(dto);
  }

  async applyRemoveIntent(
    userId: string,
    canonicalRoleCode: RoleCode,
    input: { runId: string; intentVersion: string },
  ): Promise<ApplyIntentResult> {
    const dto = await this.http.delete<ApplyIntentDto>(
      ACCESS_CONTROL_ENDPOINTS.USER_ROLE(userId, canonicalRoleCode),
      { data: { RunId: input.runId, IntentVersion: input.intentVersion } },
    );
    return AccessControlRepository.toApply(dto);
  }

  async recoverAssignmentIntent(userId: string, canonicalRoleCode: RoleCode): Promise<AssignmentIntentSnapshot> {
    const dto = await this.http.get<AssignmentIntentSnapshotDto>(
      ACCESS_CONTROL_ENDPOINTS.USER_ROLE_INTENT(userId, canonicalRoleCode),
    );
    return {
      userId: dto.UserId,
      roleCode: dto.RoleCode,
      runId: dto.RunId,
      operation: dto.Operation,
      status: dto.Status,
      intentVersion: dto.IntentVersion,
      effectiveVersion: dto.EffectiveVersion,
      assignedRoleCodes: dto.AssignedRoleCodes,
      isOwnedByCurrentActor: dto.IsOwnedByCurrentActor,
    };
  }

  private static toApply(dto: ApplyIntentDto): ApplyIntentResult {
    return {
      status: dto.Status,
      runId: dto.RunId,
      intentVersion: dto.IntentVersion,
      effectiveVersion: dto.EffectiveVersion,
      roleCode: dto.RoleCode,
      assigned: dto.Assigned,
      removed: dto.Removed,
    };
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
