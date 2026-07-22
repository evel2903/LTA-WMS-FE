import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  PermissionListFilter,
  RoleListFilter,
  UserListFilter,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';

/** Local-only assignment reservations, grouped by user id and then role code. A reservation
 * exists until the QueryClient-level reconciler observes a later authoritative
 * `userEffective(userId)` fetch success. */
export type ReservedRolesState = Record<string, Record<string, true>>;

export const accessControlQueryKeys = {
  all: [QUERY_NAMESPACES.ACCESS_CONTROL] as const,
  roleLists: () => [...accessControlQueryKeys.all, 'roles'] as const,
  roles: (filter?: RoleListFilter) => [...accessControlQueryKeys.roleLists(), filter ?? {}] as const,
  allRoles: () => [...accessControlQueryKeys.all, 'allRoles'] as const,
  /** Server-confirmed creation bridge for detail/read-lag bookkeeping only. RH-05 explicitly
   * excludes this bucket from the verified complete-catalog query. */
  confirmedRoles: () => [...accessControlQueryKeys.all, 'confirmedRoles'] as const,
  roleDetail: (roleCode: RoleCode) => [...accessControlQueryKeys.all, 'role', roleCode] as const,
  /** One local-only cache entry for all not-yet-confirmed assignments. Nested user-id buckets
   * isolate users without retaining one immortal query per visited user (Review Findings,
   * rounds 13-14). */
  reservedRoles: () => [...accessControlQueryKeys.all, 'reservedRoles'] as const,
  permissions: (filter?: PermissionListFilter) =>
    [...accessControlQueryKeys.all, 'permissions', filter ?? {}] as const,
  users: (filter?: UserListFilter) => [...accessControlQueryKeys.all, 'users', filter ?? {}] as const,
  userEffective: (userId: string) => [...accessControlQueryKeys.all, 'effective', userId] as const,
  userDataScopes: (userId: string) => [...accessControlQueryKeys.all, 'dataScopes', userId] as const,
};
