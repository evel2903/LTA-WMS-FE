import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import type { PaginatedResponse } from '@shared/Types/Api';
import {
  isBadRequestError,
  isConflictError,
  isForbiddenError,
  roleMetadataStaleDetails,
  toMutationErrorMessage,
} from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import {
  accessControlQueryKeys,
  type ReservationEntry,
  type ReservedRolesState,
} from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { AssignmentIntentSnapshot } from '@modules/AccessControl/Domain/Types/AssignmentIntentTypes';
import type { Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  AssignDataScopeInput,
  AssignRoleInput,
  CreateRoleInput,
  ResetRolePermissionsInput,
  RolePermissionsResult,
  SetRolePermissionsInput,
  UpdateRoleInput,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import {
  mergeRoleDetailSnapshots,
  mergeRoleSnapshots,
} from '@modules/AccessControl/Application/UseCases/MergeRoleSnapshots';
import { accessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance';

/** Mutation keys for `setRolePermissions`/`resetRolePermissions` — lets `useMutationState`
 * (React Query's mutation-cache query hook) track pending/error state per role/invocation
 * instead of through a single `useMutation()` observer's own reactive fields, which only ever
 * reflect the LATEST call regardless of which role it was for (Review Finding, latest re-review). */
export const ROLE_PERMISSIONS_MUTATION_KEYS = {
  set: ['setRolePermissions'] as const,
  reset: ['resetRolePermissions'] as const,
};
export const ROLE_METADATA_MUTATION_KEY = ['updateRoleMetadata'] as const;

/** Patches the role-detail query cache directly with a PUT/reset response so it's immediately
 * authoritative for THIS role, regardless of which route is on screen or whether this page later
 * unmounts entirely (e.g. back to the roles list and into a detail page again) before some OTHER
 * future refetch would have resolved — a persistent, cache-backed fix, not a component-local one
 * (Review Finding, latest re-review: a component ref cache doesn't survive unmount). Deliberately
 * NOT followed by `invalidateQueries` (see call sites) — the response is already the freshest
 * possible truth, and invalidating would risk a redundant refetch racing/reverting this patch.
 * `id`/`permissionCode` are left as empty-string placeholders (the response only carries
 * `action`/`objectType` pairs, contract §4) — nothing reads them off a role's own grant list, only
 * `buildPermissionMatrix` does, and only via `action`/`objectType`, so this is permanently
 * harmless, not a temporary gap waiting on a refetch to fill in. */
function patchRoleDetailCache(
  queryClient: ReturnType<typeof useQueryClient>,
  roleCode: RoleCode,
  result: RolePermissionsResult,
) {
  queryClient.setQueryData<RoleDetail>(accessControlQueryKeys.roleDetail(roleCode), (old) => {
    if (!old) return old;
    const incoming: RoleDetail = {
      ...old,
      permissions: result.permissions.map((p) => ({
        id: '',
        permissionCode: '',
        action: p.action,
        objectType: p.objectType,
        description: null,
      })),
      permissionsVersion: result.version,
      // Permission responses intentionally carry no role metadata token. The server advances
      // the locked role row, so retaining this older token forces the next metadata PATCH into
      // the 409/refetch path instead of pairing a fresh token with stale metadata fields.
      updatedAt: old.updatedAt,
    };
    return mergeRoleDetailSnapshots(old, incoming);
  });

  const mergePermissionVersion = (role: Role): Role => mergeRoleSnapshots(role, {
    ...role,
    permissionsVersion: result.version,
    updatedAt: role.updatedAt,
  });
  queryClient.setQueriesData<PaginatedResponse<Role>>(
    { queryKey: accessControlQueryKeys.roleLists() },
    (page) => page ? { ...page, items: page.items.map((role) =>
      role.roleCode === roleCode ? mergePermissionVersion(role) : role) } : page,
  );
  for (const key of [accessControlQueryKeys.confirmedRoles()]) {
    queryClient.setQueryData<Role[]>(key, (roles) =>
      roles?.map((role) => role.roleCode === roleCode ? mergePermissionVersion(role) : role),
    );
  }
  if (canPatchVerifiedRoleCatalog(queryClient)) {
    queryClient.setQueryData<Role[]>(accessControlQueryKeys.allRoles(), (roles) =>
      roles?.map((role) => role.roleCode === roleCode ? mergePermissionVersion(role) : role),
    );
  }
}

/** Applies an authoritative role representation to detail + legacy paginated caches without
 * dropping the permission array held only by RoleDetail. Strict `updatedAt` prevents an older
 * GET/mutation response from rolling metadata or its CAS token backward. The verified complete
 * catalog is deliberately never patched here: identity changes must be re-proved by a fresh
 * signed crawl. */
function patchRoleMetadataCaches(queryClient: QueryClient, incoming: Role) {
  queryClient.setQueryData<RoleDetail>(accessControlQueryKeys.roleDetail(incoming.roleCode), (current) => {
    return mergeRoleDetailSnapshots(current, incoming);
  });
  queryClient.setQueriesData<PaginatedResponse<Role>>(
    { queryKey: accessControlQueryKeys.roleLists() },
    (page) =>
      page
        ? {
            ...page,
            items: page.items.map((role) =>
              role.roleCode === incoming.roleCode ? mergeRoleSnapshots(role, incoming) : role,
            ),
          }
        : page,
  );
  queryClient.setQueryData<Role[]>(accessControlQueryKeys.confirmedRoles(), (roles = []) => {
    const index = roles.findIndex((role) => role.roleCode === incoming.roleCode);
    if (index < 0) return [...roles, incoming];
    return roles.map((role, roleIndex) =>
      roleIndex === index ? mergeRoleSnapshots(role, incoming) : role,
    );
  });
}

function patchRoleCatalogDisplayCache(queryClient: QueryClient, incoming: Role) {
  if (!canPatchVerifiedRoleCatalog(queryClient)) return;
  queryClient.setQueryData<Role[]>(accessControlQueryKeys.allRoles(), (roles) =>
    roles?.map((role) =>
      role.roleCode === incoming.roleCode
        ? {
            ...role,
            description: incoming.description,
            permissionsVersion: incoming.permissionsVersion,
            updatedAt: incoming.updatedAt,
          }
        : role,
    ),
  );
}

function canPatchVerifiedRoleCatalog(queryClient: QueryClient): boolean {
  const state = queryClient.getQueryState<Role[]>(accessControlQueryKeys.allRoles());
  return state?.status === 'success' && state.fetchStatus === 'idle' && !state.isInvalidated && state.error == null;
}

function changesRoleCatalogIdentity(input: UpdateRoleInput): boolean {
  return input.roleName !== undefined || input.status !== undefined;
}

function roleCatalogIdentityMayChange(queryClient: QueryClient, roleCode: RoleCode, input: UpdateRoleInput): boolean {
  if (!changesRoleCatalogIdentity(input)) return false;
  const current = queryClient.getQueryData<Role[]>(accessControlQueryKeys.allRoles())
    ?.find((role) => role.roleCode === roleCode);
  if (!current) return true;
  const nameChanged = input.roleName !== undefined && input.roleName.trim() !== current.roleName;
  const statusChanged = input.status !== undefined && input.status !== current.status;
  return nameChanged || statusChanged;
}

/** A canonical unsigned decimal version token (matches the BE `AssignmentVersion` regex). */
const CANONICAL_VERSION = /^(0|[1-9][0-9]*)$/;

/** Parse a version token to bigint, or null for undefined/non-canonical/legacy-shaped values. Used
 * so a malformed token (e.g. a legacy-shaped response missing `effectiveVersion`) can never throw a
 * `TypeError` out of the global QueryCache subscriber (or a render path) and wedge the client. `BigInt`
 * is also lenient (`BigInt('')===0n`, `BigInt('01')===1n`), so the strict regex guards mis-compares
 * too (Review Finding, rounds 1-2). Exported so every version-token comparison routes through it. */
export function canonicalBigInt(token: unknown): bigint | null {
  return typeof token === 'string' && CANONICAL_VERSION.test(token) ? BigInt(token) : null;
}

/** A lowercase UUID v4 run id. `crypto.randomUUID()` exists only in a secure context (HTTPS or
 * localhost); over plain HTTP to a LAN IP it is undefined, but `crypto.getRandomValues` is always
 * available — fall back to it so assign/remove never hard-crash off-secure (Review Finding, round 1). */
function newRunId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 1
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

// QueryClient owns the cache subscription for its whole lifetime. The WeakSet prevents one
// listener per hook instance without retaining QueryClients after their providers are discarded.
const reservationReconcilers = new WeakSet<QueryClient>();

/** RH-04 (RH-ASG-01 / D3): release a committed local reservation/tombstone only after a NON-MANUAL
 * authoritative recovery snapshot for the same (user, role) reaches `EffectiveVersion >=
 * pendingEffectiveVersion` (BigInt compare, never JS number). At/after the threshold the raw server
 * snapshot is authoritative — a matching role set is confirmation, a contradicting one is external
 * supersession; both adopt server truth, so both release the entry. Manual `setQueryData` writes,
 * fetch errors, and below-threshold snapshots never release. Survives unmount/GC/Query rebuild
 * because the subscription lives on the QueryClient, not a component. */
function ensureAssignmentReservationReconciler(queryClient: QueryClient) {
  if (reservationReconcilers.has(queryClient)) return;
  reservationReconcilers.add(queryClient);

  const intentKey = accessControlQueryKeys.assignmentIntent('', '');
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;

    const queryKey = event.query.queryKey as unknown as readonly unknown[];
    const userId = queryKey[2];
    const roleCode = queryKey[3];
    if (
      queryKey.length !== intentKey.length ||
      queryKey[0] !== intentKey[0] ||
      queryKey[1] !== intentKey[1] ||
      typeof userId !== 'string' ||
      userId.length === 0 ||
      typeof roleCode !== 'string'
    ) {
      return;
    }
    const snapshot = event.query.state.data as AssignmentIntentSnapshot | undefined;
    if (!snapshot) return;

    queryClient.setQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles(), (prev) => {
      const entry = prev?.[userId]?.[roleCode];
      if (!entry) return prev;
      // Below the mutation's threshold: this snapshot predates the write — keep the entry. An
      // unparseable token (undefined/legacy-shaped) is treated as "cannot confirm" → keep, never throw.
      const snapshotVersion = canonicalBigInt(snapshot.effectiveVersion);
      const pending = canonicalBigInt(entry.pendingEffectiveVersion);
      if (snapshotVersion === null || pending === null || snapshotVersion < pending) return prev;
      const nextUser = { ...prev[userId] };
      delete nextUser[roleCode];
      const next = { ...prev };
      if (Object.keys(nextUser).length === 0) delete next[userId];
      else next[userId] = nextUser;
      return next;
    });
  });
}

/** Write a committed reservation/tombstone with last-registered-intent-wins: a newer server ordinal
 * (higher intentVersion) always replaces an older one; a stale late result never overwrites it. */
function writeReservation(
  queryClient: QueryClient,
  userId: string,
  roleCode: RoleCode,
  entry: ReservationEntry,
) {
  queryClient.setQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles(), (prev) => {
    const existing = prev?.[userId]?.[roleCode];
    const existingVersion = existing ? canonicalBigInt(existing.intentVersion) : null;
    const incomingVersion = canonicalBigInt(entry.intentVersion);
    // A newer registered ordinal wins; an unparseable existing/incoming token falls through to the
    // write (the fresh entry is the caller's current intent) rather than throwing.
    if (existingVersion !== null && incomingVersion !== null && existingVersion > incomingVersion) return prev;
    return { ...prev, [userId]: { ...prev?.[userId], [roleCode]: entry } };
  });
}

export function useAccessControlMutations() {
  const queryClient = useQueryClient();
  ensureAssignmentReservationReconciler(queryClient);
  // `confirmedRoles()` is a durable app-lifecycle bridge (Review Finding, round 12), not really
  // "fetched" data — it has no observer (only ever read imperatively via `getQueryData` inside
  // `useAllRoles()`'s `select`), so under the app's default 5-minute `gcTime` it would silently
  // evict itself 5 minutes after the FIRST write, undoing the very durability it exists for
  // (Review Finding, round 13). Must be registered before that first write; calling it here —
  // top of every render, before any mutation can fire — guarantees that as cheaply as possible:
  // it's an idempotent Map upsert, safe (and correct, per-QueryClient-instance) to repeat.
  queryClient.setQueryDefaults(accessControlQueryKeys.confirmedRoles(), { gcTime: Infinity });
  // The single local-only reservation entry must outlive page unmounts until a later effective
  // read confirms it. Keeping all user buckets inside this one durable query avoids unbounded
  // query-count growth while preserving cross-user isolation (Review Finding, round 14).
  queryClient.setQueryDefaults(accessControlQueryKeys.reservedRoles(), { gcTime: Infinity });
  const invalidate = (key: readonly unknown[]) => queryClient.invalidateQueries({ queryKey: key });
  const cancelRoleCatalogReads = async (): Promise<void> => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: accessControlQueryKeys.roleLists() }),
      queryClient.cancelQueries({ queryKey: accessControlQueryKeys.allRoles(), exact: true }),
    ]);
  };

  // 409 CONFLICT is a distinct INLINE state and 403 FORBIDDEN demotes the panel to
  // read-only (AC3) — neither is toasted (single-surface per error). Everything else toasts.
  const notifyHandled = (error: unknown) => {
    if (!isConflictError(error) && !isForbiddenError(error)) toast.error(toMutationErrorMessage(error));
  };

  // Role/data-scope changes alter the user's effective capability + scope; refetch
  // exactly those narrow branches (no cross-user / cross-module invalidation).
  const invalidateUser = (userId: string) => {
    void invalidate(accessControlQueryKeys.userEffective(userId));
    void invalidate(accessControlQueryKeys.userDataScopes(userId));
  };

  return {
    updateRole: useMutation({
      mutationKey: ROLE_METADATA_MUTATION_KEY,
      retry: false,
      onMutate: (variables) =>
        roleCatalogIdentityMayChange(queryClient, variables.roleCode, variables.input)
          ? cancelRoleCatalogReads()
          : Promise.resolve(),
      mutationFn: ({ id, input }: { id: string; roleCode: RoleCode; input: UpdateRoleInput }) =>
        accessControlRepository.updateRole(id, input),
      onSuccess: async (role, variables) => {
        const identityChanged = roleCatalogIdentityMayChange(queryClient, variables.roleCode, variables.input);
        if (identityChanged) await cancelRoleCatalogReads();
        patchRoleMetadataCaches(queryClient, role);
        if (identityChanged) void invalidate(accessControlQueryKeys.allRoles());
        else patchRoleCatalogDisplayCache(queryClient, role);
        toast.success('Đã cập nhật vai trò');
      },
      onError: async (error, variables) => {
        if (roleMetadataStaleDetails(error)) {
          try {
            // Refetch once to acquire a fresh server-issued token. This only updates cache;
            // the form owns and preserves its dirty draft, and no automatic resubmit occurs.
            const authoritative = await accessControlRepository.getRole(variables.roleCode);
            patchRoleMetadataCaches(queryClient, authoritative);
          } catch {
            // The form keeps the draft and exposes an in-place retry; it owns this error surface.
          }
          // A stale identity conflict can arrive after another tab has changed the catalog. The
          // one-shot GET above refreshes only this role detail; the complete identity catalog must
          // still be re-verified before assignment controls reopen.
          if (changesRoleCatalogIdentity(variables.input)) void invalidate(accessControlQueryKeys.allRoles());
          return;
        }
        if (changesRoleCatalogIdentity(variables.input)) void invalidate(accessControlQueryKeys.allRoles());
      },
    }),
    // 409 (dup code) and 400 (bad role_code format — real BE error is BUSINESS_RULE, not
    // VALIDATION, so this checks HTTP status not code) are inline form states (AC2); 403
    // demotes the "Tạo vai trò" action for subsequent renders — neither toasts. Only an
    // unexpected failure (5xx/network) does.
    createRole: useMutation({
      mutationFn: (input: CreateRoleInput) => accessControlRepository.createRole(input),
      onSuccess: async (role) => {
        // This bridge is detail/read-lag bookkeeping only. `useAllRoles()` never consumes it,
        // so it cannot turn a locally confirmed creation into a falsely complete catalog.
        const confirmed = queryClient.getQueryData<Role[]>(accessControlQueryKeys.confirmedRoles()) ?? [];
        if (!confirmed.some((existing) => existing.roleCode === role.roleCode)) {
          queryClient.setQueryData<Role[]>(accessControlQueryKeys.confirmedRoles(), [...confirmed, role]);
        }
        void invalidate(accessControlQueryKeys.roles());
        // `roles()` (paginated, RolesMasterPage) and `allRoles()` (full catalog, the
        // assignment-flow dropdown) are two separate cache entries backed by the same
        // endpoint — both must be invalidated, or an already-open assignment flow won't see
        // a just-created custom role until the app-wide 30s staleTime elapses (Review Finding).
        await invalidate(accessControlQueryKeys.allRoles());
        toast.success('Đã tạo vai trò');
      },
      onError: (error) => {
        if (!isConflictError(error) && !isBadRequestError(error) && !isForbiddenError(error)) {
          toast.error(toMutationErrorMessage(error));
        }
      },
    }),
    // 400 (N/A/rider/add-only violation) is an inline form state for RolePermissionEditor, not a
    // toast (mirrors createRole's AC2 pattern); 403 demotes the Save/Reset actions instead.
    setRolePermissions: useMutation({
      mutationKey: ROLE_PERMISSIONS_MUTATION_KEYS.set,
      mutationFn: ({ id, input }: { id: string; roleCode: RoleCode; input: SetRolePermissionsInput }) =>
        accessControlRepository.setRolePermissions(id, input),
      // No `invalidate()` here on purpose: the response IS the authoritative fresh state (it's
      // the literal return value of the PUT that just succeeded), so `patchRoleDetailCache`
      // alone keeps the cache correct. Also invalidating would trigger a redundant background
      // refetch that could race the patch and silently revert to older data (e.g. read-replica
      // lag), undermining the very consistency this patch exists for.
      onSuccess: (result, variables) => {
        patchRoleDetailCache(queryClient, variables.roleCode, result);
        toast.success('Đã lưu thay đổi quyền');
      },
      onError: (error) => {
        if (!isBadRequestError(error) && !isForbiddenError(error) && !isConflictError(error)) {
          toast.error(toMutationErrorMessage(error));
        }
      },
    }),
    resetRolePermissions: useMutation({
      mutationKey: ROLE_PERMISSIONS_MUTATION_KEYS.reset,
      mutationFn: ({ id, input }: { id: string; roleCode: RoleCode; input: ResetRolePermissionsInput }) =>
        accessControlRepository.resetRolePermissions(id, input),
      // Same rationale as `setRolePermissions` above -- no `invalidate()`, the response is
      // already authoritative and `patchRoleDetailCache` alone keeps the cache correct.
      onSuccess: (result, variables) => {
        patchRoleDetailCache(queryClient, variables.roleCode, result);
        toast.success('Đã khôi phục quyền về mặc định');
      },
      onError: (error) => {
        if (!isBadRequestError(error) && !isForbiddenError(error)) {
          toast.error(toMutationErrorMessage(error));
        }
      },
    }),
    // RH-04 (RH-ASG-01 / D3): each assign/remove is one logical intent — register a server ordinal
    // (RunId + IntentVersion), then apply it. The committed local reservation/tombstone is keyed by
    // the mutation's OWN userId+roleCode and carries the ownerRunId + intentVersion + the
    // pendingEffectiveVersion returned by apply, so a stale late result can't overwrite a newer
    // registered intent (writeReservation's last-registered-wins), and the reconciler only releases
    // it once an authoritative recovery snapshot reaches that version. Duplicate assign (409) /
    // absent remove (200 no-op) are handled by the BE ticket and surface inline, not as a badge.
    assignRole: useMutation({
      mutationFn: async ({ userId, input }: { userId: string; input: AssignRoleInput }) => {
        const runId = newRunId();
        const registered = await accessControlRepository.registerAssignmentIntent(userId, input.roleCode, {
          operation: 'assign',
          runId,
        });
        const applied = await accessControlRepository.applyAssignIntent(userId, {
          roleCode: input.roleCode,
          runId,
          intentVersion: registered.intentVersion,
        });
        return { roleCode: input.roleCode, runId, intentVersion: applied.intentVersion, pendingEffectiveVersion: applied.effectiveVersion };
      },
      onSuccess: (result, variables) => {
        // A recovery fetch already in flight from before this apply must not release the fresh
        // reservation; cancel it so only a post-write snapshot can reach the reconciler.
        void queryClient.cancelQueries({
          queryKey: accessControlQueryKeys.assignmentIntent(variables.userId, result.roleCode),
          exact: true,
        });
        writeReservation(queryClient, variables.userId, result.roleCode, {
          state: 'reserved',
          pendingEffectiveVersion: result.pendingEffectiveVersion,
          ownerRunId: result.runId,
          operation: 'assign',
          intentVersion: result.intentVersion,
        });
        void invalidate(accessControlQueryKeys.assignmentIntent(variables.userId, result.roleCode));
        invalidateUser(variables.userId);
      },
      onError: notifyHandled,
    }),
    removeRole: useMutation({
      mutationFn: async ({ userId, roleCode }: { userId: string; roleCode: RoleCode }) => {
        const runId = newRunId();
        const registered = await accessControlRepository.registerAssignmentIntent(userId, roleCode, {
          operation: 'remove',
          runId,
        });
        const applied = await accessControlRepository.applyRemoveIntent(userId, roleCode, {
          runId,
          intentVersion: registered.intentVersion,
        });
        return { roleCode, runId, intentVersion: applied.intentVersion, pendingEffectiveVersion: applied.effectiveVersion };
      },
      onSuccess: (result, variables) => {
        void queryClient.cancelQueries({
          queryKey: accessControlQueryKeys.assignmentIntent(variables.userId, result.roleCode),
          exact: true,
        });
        writeReservation(queryClient, variables.userId, result.roleCode, {
          state: 'tombstoned',
          pendingEffectiveVersion: result.pendingEffectiveVersion,
          ownerRunId: result.runId,
          operation: 'remove',
          intentVersion: result.intentVersion,
        });
        void invalidate(accessControlQueryKeys.assignmentIntent(variables.userId, result.roleCode));
        invalidateUser(variables.userId);
      },
      onError: notifyHandled,
    }),
    assignDataScope: useMutation({
      mutationFn: ({ userId, input }: { userId: string; input: AssignDataScopeInput }) =>
        accessControlRepository.assignDataScope(userId, input),
      onSuccess: (_scope, variables) => invalidateUser(variables.userId),
      onError: notifyHandled,
    }),
    removeDataScope: useMutation({
      mutationFn: ({ userId, scopeId }: { userId: string; scopeId: string }) =>
        accessControlRepository.removeDataScope(userId, scopeId),
      onSuccess: (_void, variables) => invalidateUser(variables.userId),
      onError: notifyHandled,
    }),
  };
}
