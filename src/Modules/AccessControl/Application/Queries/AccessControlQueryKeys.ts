import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  PermissionListFilter,
  RoleListFilter,
  UserListFilter,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';

/** RH-04 (RH-ASG-01 / D3) version token: a canonical decimal string (PostgreSQL BIGINT). Compared
 * with `BigInt(...)`, never a JS `number` (which loses precision past 2^53). */
export type VersionToken = string;

/** RH-04 committed local intent for one (user, role) item. A reservation/tombstone is released only
 * when a non-manual authoritative recovery snapshot for the same user reaches
 * `EffectiveVersion >= pendingEffectiveVersion` (raw role set matches => confirmation; contradicts
 * => external supersession). last-registered-intent-wins replaces both `state` and the thresholds. */
export type ReservationEntry = {
  state: 'reserved' | 'tombstoned';
  pendingEffectiveVersion: VersionToken;
  ownerRunId: string;
  operation: 'assign' | 'remove';
  intentVersion: VersionToken;
};

/** One shared durable QueryClient entry, bucketed by user id then canonical role code. No immortal
 * per-user query. */
export type ReservedRolesState = Record<string, Record<string, ReservationEntry>>;

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
  /** RH-04 authoritative recovery snapshot for one (user, role) assignment intent. */
  assignmentIntent: (userId: string, canonicalRoleCode: RoleCode) =>
    [...accessControlQueryKeys.all, 'assignmentIntent', userId, canonicalRoleCode] as const,
  userDataScopes: (userId: string) => [...accessControlQueryKeys.all, 'dataScopes', userId] as const,
};
