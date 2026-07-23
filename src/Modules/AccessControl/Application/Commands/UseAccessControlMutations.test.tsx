// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import type { Role } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type {
  ApplyIntentResult,
  AssignmentIntentSnapshot,
  IntentOperation,
  RegisterIntentResult,
} from '@modules/AccessControl/Domain/Types/AssignmentIntentTypes';
import {
  accessControlQueryKeys,
  type ReservedRolesState,
} from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';

const repo = vi.hoisted(() => ({ current: null as unknown as IAccessControlRepository }));
vi.mock('@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance', () => ({
  get accessControlRepository() {
    return repo.current;
  },
}));
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useAccessControlMutations } from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';
import {
  useAllRoles,
  useReservedRoleCodes,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';

const existingRole: Role = {
  id: 'role-1',
  roleCode: 'OPERATOR',
  roleName: 'Operator',
  description: null,
  isSystem: true,
  status: 'ACTIVE',
  permissionsVersion: 0,
  updatedAt: '2026-07-22T06:00:00.000Z',
};

const newRole: Role = {
  id: 'role-2',
  roleCode: 'NEW_ROLE',
  roleName: 'New Role',
  description: null,
  isSystem: false,
  status: 'ACTIVE',
  permissionsVersion: 0,
  updatedAt: '2026-07-22T06:00:00.000Z',
};

// RH-04 (RH-ASG-01 / D3): assignRole/removeRole no longer call `repository.assignRole`; each drives
// register→apply, and the committed local entry is a `ReservationEntry` object (never `true`),
// released only by a NON-MANUAL recovery snapshot reaching `pendingEffectiveVersion`. These fakes
// model the two-call flow at a fixed effective version so the reservation-lifecycle tests below
// assert real D3 behaviour rather than the superseded RA-05 single-call flow.
function intentFakes(effectiveVersion = '5'): Partial<IAccessControlRepository> {
  return {
    registerAssignmentIntent: vi.fn(
      (_userId: string, _roleCode: RoleCode, input: { operation: IntentOperation; runId: string }) =>
        Promise.resolve<RegisterIntentResult>({
          runId: input.runId,
          operation: input.operation,
          status: 'Registered',
          intentVersion: '1',
          effectiveVersion,
          isCurrent: true,
        }),
    ),
    applyAssignIntent: vi.fn(
      (_userId: string, input: { roleCode: RoleCode; runId: string; intentVersion: string }) =>
        Promise.resolve<ApplyIntentResult>({
          status: 'Applied',
          runId: input.runId,
          intentVersion: input.intentVersion,
          effectiveVersion,
          roleCode: input.roleCode,
          assigned: true,
        }),
    ),
  };
}

function assignedSnapshot(effectiveVersion = '5'): AssignmentIntentSnapshot {
  return {
    userId: 'A',
    roleCode: 'QC',
    runId: 'recovered-run',
    operation: 'assign',
    status: 'Applied',
    intentVersion: '1',
    effectiveVersion,
    assignedRoleCodes: ['QC'],
    isOwnedByCurrentActor: true,
  };
}

describe('useAccessControlMutations', () => {
  it('does not promote an unconfirmed catalog when a permission-only mutation succeeds', async () => {
    let catalogRead = Promise.resolve([existingRole]);
    const listAllRoles = vi.fn(() => catalogRead);
    const fake: Partial<IAccessControlRepository> = {
      listAllRoles,
      setRolePermissions: vi.fn(() => Promise.resolve({
        permissions: [{ action: 'Read', objectType: 'SKU' }],
        version: 1,
        updatedAt: existingRole.updatedAt,
      })),
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), rolesQuery: useAllRoles() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));
    catalogRead = new Promise(() => { /* keep the invalidated catalog unconfirmed */ });
    void client.invalidateQueries({ queryKey: accessControlQueryKeys.allRoles(), exact: true });
    await waitFor(() => expect(client.getQueryState(accessControlQueryKeys.allRoles())?.isInvalidated).toBe(true));

    await act(async () => {
      await result.current.mutations.setRolePermissions.mutateAsync({
        id: existingRole.id,
        roleCode: existingRole.roleCode,
        input: { permissions: [], version: 0, reasonCode: 'RC-ROLE-PERMISSION-UPDATE' },
      });
    });

    expect(client.getQueryData<Role[]>(accessControlQueryKeys.allRoles())).toEqual([existingRole]);
    expect(client.getQueryState(accessControlQueryKeys.allRoles())?.isInvalidated).toBe(true);
  });

  it('invalidates the full role catalog (allRoles), not only the paginated roles() list, after creating a role (Review Finding)', async () => {
    const listAllRoles = vi.fn(() => Promise.resolve([existingRole]));
    const fake: Partial<IAccessControlRepository> = {
      createRole: vi.fn(() => Promise.resolve(newRole)),
      listAllRoles,
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), rolesQuery: useAllRoles() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));

    // Once the create succeeds, a same-session `useAllRoles()` observer (e.g. an already-open
    // assignment flow) must see the new role WITHOUT waiting for the app-wide 30s staleTime.
    listAllRoles.mockResolvedValueOnce([existingRole, newRole]);
    await act(async () => {
      await result.current.mutations.createRole.mutateAsync({
        roleCode: 'NEW_ROLE',
        roleName: 'New Role',
      });
    });

    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole, newRole]));
    expect(result.current.rolesQuery.isCatalogVerified).toBe(true);
    expect(listAllRoles).toHaveBeenCalledTimes(2);
  });

  it('reconciles the newly created role into the cached catalog even if the invalidated refetch then fails (Review Finding, round 4/5)', async () => {
    const listAllRoles = vi.fn(() => Promise.resolve([existingRole]));
    const fake: Partial<IAccessControlRepository> = {
      createRole: vi.fn(() => Promise.resolve(newRole)),
      listAllRoles,
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), rolesQuery: useAllRoles() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));

    // The refetch that `invalidate()` triggers fails outright -- the new role must still be
    // visible, because `onSuccess` already patched the cache directly with the mutation's own
    // response, independent of whatever this background refetch does afterward.
    listAllRoles.mockRejectedValueOnce(new Error('network blip'));
    await act(async () => {
      await result.current.mutations.createRole.mutateAsync({
        roleCode: 'NEW_ROLE',
        roleName: 'New Role',
      });
    });

    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));
    expect(result.current.rolesQuery.isCatalogUnconfirmed).toBe(true);
  });

  it('reconciles the newly created role into the cache even if the invalidated refetch SUCCEEDS with a stale catalog missing it (Review Finding, round 6)', async () => {
    const listAllRoles = vi.fn(() => Promise.resolve([existingRole]));
    const fake: Partial<IAccessControlRepository> = {
      createRole: vi.fn(() => Promise.resolve(newRole)),
      listAllRoles,
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), rolesQuery: useAllRoles() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));

    // The refetch that `invalidate()` triggers SUCCEEDS, but with a catalog that doesn't yet
    // include the new role (e.g. read-replica lag) -- unlike the network-failure test above,
    // this refetch resolves normally and would silently win a naive "patch once, then
    // invalidate and forget" implementation.
    listAllRoles.mockResolvedValueOnce([existingRole]);
    await act(async () => {
      await result.current.mutations.createRole.mutateAsync({
        roleCode: 'NEW_ROLE',
        roleName: 'New Role',
      });
    });

    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));
  });

  it('preserves EVERY locally confirmed create across consecutive creates, even when each one\'s own refetch is independently stale (Review Finding, round 11)', async () => {
    const roleA: Role = {
      id: 'role-a',
      roleCode: 'ROLE_A',
      roleName: 'Role A',
      description: null,
      isSystem: false,
      status: 'ACTIVE',
      permissionsVersion: 0,
      updatedAt: '2026-07-22T06:00:00.001Z',
    };
    const roleB: Role = {
      id: 'role-b',
      roleCode: 'ROLE_B',
      roleName: 'Role B',
      description: null,
      isSystem: false,
      status: 'ACTIVE',
      permissionsVersion: 0,
      updatedAt: '2026-07-22T06:00:00.002Z',
    };
    const listAllRoles = vi.fn(() => Promise.resolve([existingRole]));
    const createRole = vi.fn().mockResolvedValueOnce(roleA).mockResolvedValueOnce(roleB);
    const fake: Partial<IAccessControlRepository> = { createRole, listAllRoles };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), rolesQuery: useAllRoles() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));

    // Create A -- ITS OWN invalidated refetch is stale (still just [existingRole]).
    listAllRoles.mockResolvedValueOnce([existingRole]);
    await act(async () => {
      await result.current.mutations.createRole.mutateAsync({ roleCode: 'ROLE_A', roleName: 'Role A' });
    });
    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));

    // Create B -- its OWN refetch is ALSO stale, and (being a generic catalog re-read) has no
    // idea A was ever created either.
    listAllRoles.mockResolvedValueOnce([existingRole]);
    await act(async () => {
      await result.current.mutations.createRole.mutateAsync({ roleCode: 'ROLE_B', roleName: 'Role B' });
    });

    // Both A and B must survive -- B's own stale-refetch reconcile must not silently drop A,
    // which a naive "only remember THIS invocation's role" implementation would do.
    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));
    expect(client.getQueryData(accessControlQueryKeys.confirmedRoles())).toEqual([roleA, roleB]);
  });

  it('keeps a confirmed role visible to a DIFFERENT hook instance after the creating one unmounts, even if the next catalog read is stale (Review Finding, round 12)', async () => {
    const listAllRoles = vi.fn(() => Promise.resolve([existingRole]));
    const fake: Partial<IAccessControlRepository> = {
      createRole: vi.fn(() => Promise.resolve(newRole)),
      listAllRoles,
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    // Simulates RolesMasterPage: its OWN hook instance creates the role, then the page (and
    // this hook instance) unmounts on navigation -- `allRoles()` was never even observed
    // here, so its cache is still completely empty at this point.
    const rolesPage = renderHook(() => useAccessControlMutations(), { wrapper });
    await act(async () => {
      await rolesPage.result.current.createRole.mutateAsync({
        roleCode: 'NEW_ROLE',
        roleName: 'New Role',
      });
    });
    rolesPage.unmount();

    // Simulates navigating to User Assignment: a FRESH hook instance whose first-ever
    // `allRoles()` fetch resolves WITHOUT the new role (e.g. read-replica lag) -- nothing
    // from the creating page's own local state survives to reconcile it anymore.
    listAllRoles.mockResolvedValueOnce([existingRole]);
    const assignmentPage = renderHook(() => useAllRoles(), { wrapper });

    await waitFor(() => expect(assignmentPage.result.current.data).toEqual([existingRole]));
    expect(client.getQueryData(accessControlQueryKeys.confirmedRoles())).toEqual([newRole]);
  });

  it('keeps a confirmed role durable past the default 5-minute query GC window, even though nothing ever observes it directly (Review Finding, round 13)', async () => {
    vi.useFakeTimers();
    try {
      const fake: Partial<IAccessControlRepository> = {
        createRole: vi.fn(() => Promise.resolve(newRole)),
        listAllRoles: vi.fn(() => Promise.resolve([existingRole])),
      };
      repo.current = fake as IAccessControlRepository;

      const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
      }

      // Nothing ever mounts `useQuery({queryKey: confirmedRoles()})` in production -- it is
      // written via `setQueryData` in `createRole`'s `onSuccess` and read imperatively via
      // `getQueryData` inside `useAllRoles()`'s `select`. Mirror that exactly: render only the
      // mutations hook (not `useAllRoles()`), create a role, then unmount -- the bucket must
      // survive on the shared `client` with zero observers of its own.
      const { result, unmount } = renderHook(() => useAccessControlMutations(), { wrapper });
      await act(async () => {
        await result.current.createRole.mutateAsync({ roleCode: 'NEW_ROLE', roleName: 'New Role' });
      });
      unmount();

      expect(client.getQueryData(accessControlQueryKeys.confirmedRoles())).toEqual([newRole]);

      // The app's real default `gcTime` is 5 minutes (QueryClient.ts) -- advance exactly past
      // it. A query with zero observers is GC-eligible from the moment it's created, so an
      // un-registered `confirmedRoles()` bucket is evicted right here.
      vi.advanceTimersByTime(5 * 60_000 + 1);

      expect(client.getQueryData(accessControlQueryKeys.confirmedRoles())).toEqual([newRole]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('prunes a confirmed role out of the durable bridge once the raw catalog authoritatively contains it, instead of retaining it forever (Review Finding, round 13)', async () => {
    const listAllRoles = vi.fn(() => Promise.resolve([existingRole]));
    const fake: Partial<IAccessControlRepository> = {
      createRole: vi.fn(() => Promise.resolve(newRole)),
      listAllRoles,
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), rolesQuery: useAllRoles() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.rolesQuery.data).toEqual([existingRole]));

    // Create's own invalidated refetch is stale (still missing the new role) -- confirmedRoles()
    // must hold it.
    listAllRoles.mockResolvedValueOnce([existingRole]);
    await act(async () => {
      await result.current.mutations.createRole.mutateAsync({ roleCode: 'NEW_ROLE', roleName: 'New Role' });
    });
    await waitFor(() => expect(client.getQueryData(accessControlQueryKeys.confirmedRoles())).toEqual([newRole]));

    // The server catches up on a LATER, independent refetch (e.g. the app-wide staleTime
    // elapsing) -- once the raw catalog itself authoritatively contains the role, the bridge no
    // longer needs to hold it (unbounded growth otherwise, since nothing else ever removes an
    // entry once added).
    listAllRoles.mockResolvedValueOnce([existingRole, newRole]);
    await act(async () => {
      await client.refetchQueries({ queryKey: accessControlQueryKeys.allRoles() });
    });

    await waitFor(() => expect(client.getQueryData(accessControlQueryKeys.confirmedRoles())).toEqual([]));
    // The merged view stays correct throughout (no duplicate NEW_ROLE entries).
    expect(result.current.rolesQuery.data).toEqual([existingRole, newRole]);
  });

  it('keeps an assignment reservation scoped to the user it was submitted for, never leaking into a different user shown on the SAME hook instance (Review Finding, round 13; RH-04 D3)', async () => {
    repo.current = intentFakes() as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    // `useAccessControlMutations()` is a single hook instance not scoped to any one user (it
    // doesn't remount on a route userId change) -- a settled reservation must land under the
    // userId the mutation was submitted for, never a different user the admin later navigates to.
    const { result } = renderHook(() => useAccessControlMutations(), { wrapper });
    await act(async () => {
      await result.current.assignRole.mutateAsync({ userId: 'A', input: { roleCode: 'QC' } });
    });

    // A's own reservation exists...
    const reservations = client.getQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles());
    const reservedA = reservations?.A;
    expect(Object.keys(reservedA ?? {})).toEqual(['QC']);
    expect(reservedA?.QC.state).toBe('reserved');
    expect(reservedA?.QC.operation).toBe('assign');
    // ...but B's bucket was never touched.
    expect(reservations?.B).toBeUndefined();
  });

  it('keeps a reservation alive across a full unmount + remount of the consuming hook, since it lives on the query client, not component state (Review Finding, round 13; RH-04 D3)', async () => {
    repo.current = intentFakes() as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const first = renderHook(() => useAccessControlMutations(), { wrapper });
    await act(async () => {
      await first.result.current.assignRole.mutateAsync({ userId: 'A', input: { roleCode: 'QC' } });
    });
    // Simulates leaving the page entirely (not just a userId route-param change) before the
    // recovery snapshot this triggered has necessarily resolved.
    first.unmount();

    renderHook(() => useAccessControlMutations(), { wrapper });

    const reservedA = client.getQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles())?.A;
    expect(Object.keys(reservedA ?? {})).toEqual(['QC']);
    expect(reservedA?.QC.state).toBe('reserved');
  });

  it('keeps a reservation durable past the default 5-minute query GC window after the consuming page unmounts (Review Finding, round 13, adversarial follow-up; RH-04 D3)', async () => {
    vi.useFakeTimers();
    try {
      repo.current = intentFakes() as IAccessControlRepository;

      const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
      }

      // Mirrors the confirmedRoles() durability test above -- `reservedRoles()` must
      // survive the app's default 5-minute gcTime the same way, or a reservation whose
      // effective-permissions confirmation is delayed/failed past that window (e.g. the admin
      // navigated away and the invalidateUser refetch never lands) is silently evicted,
      // reopening exactly the "unmount before confirmation, duplicate submission reopens" gap
      // the reservation redesign exists to close.
      const { result, unmount } = renderHook(() => useAccessControlMutations(), { wrapper });
      await act(async () => {
        await result.current.assignRole.mutateAsync({ userId: 'A', input: { roleCode: 'QC' } });
      });
      unmount();

      expect(
        Object.keys(
          client.getQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles())?.A ?? {},
        ),
      ).toEqual(['QC']);

      vi.advanceTimersByTime(5 * 60_000 + 1);

      expect(
        Object.keys(
          client.getQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles())?.A ?? {},
        ),
      ).toEqual(['QC']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('releases a reservation only for a non-manual authoritative recovery snapshot at/after its pending version, not a manual cache write (Review Finding, round 15; RH-04 D3)', async () => {
    const snapshot = assignedSnapshot('5');
    const fake: Partial<IAccessControlRepository> = {
      ...intentFakes('5'),
      recoverAssignmentIntent: vi.fn(() => Promise.resolve(snapshot)),
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), reserved: useReservedRoleCodes('A') }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutations.assignRole.mutateAsync({ userId: 'A', input: { roleCode: 'QC' } });
    });
    await waitFor(() => expect(result.current.reserved.data?.QC?.state).toBe('reserved'));

    // A manual cache patch -- even one carrying an at-threshold snapshot -- is NOT proof the
    // server was read; the reconciler ignores `manual` success events, so the entry stays.
    act(() => {
      client.setQueryData(accessControlQueryKeys.assignmentIntent('A', 'QC'), snapshot);
    });
    expect(result.current.reserved.data?.QC?.state).toBe('reserved');

    // Only an actual (non-manual) recovery fetch reaching the pending version releases it.
    await act(async () => {
      await client.fetchQuery({
        queryKey: accessControlQueryKeys.assignmentIntent('A', 'QC'),
        queryFn: () => repo.current.recoverAssignmentIntent('A', 'QC'),
      });
    });
    await waitFor(() => expect(result.current.reserved.data).toEqual({}));
  });

  it('does not let a recovery fetch started before the assignment release the new reservation — the mutation cancels it first (Review Finding, round 15; RH-04 D3)', async () => {
    const snapshot = assignedSnapshot('5');
    let recoverCalls = 0;
    let resolvePre: (() => void) | undefined;
    const fake: Partial<IAccessControlRepository> = {
      ...intentFakes('5'),
      recoverAssignmentIntent: vi.fn((): Promise<AssignmentIntentSnapshot> => {
        recoverCalls += 1;
        if (recoverCalls === 1) {
          return new Promise((resolve) => {
            resolvePre = () => resolve(snapshot);
          });
        }
        return Promise.resolve(snapshot);
      }),
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), reserved: useReservedRoleCodes('A') }),
      { wrapper },
    );

    // A recovery read is already in flight (started before the assignment settles). The mutation
    // must cancel it before installing the reservation, even if its promise resolves later.
    void client
      .fetchQuery({
        queryKey: accessControlQueryKeys.assignmentIntent('A', 'QC'),
        queryFn: () => repo.current.recoverAssignmentIntent('A', 'QC'),
      })
      .catch(() => {});
    await waitFor(() => expect(recoverCalls).toBe(1));

    await act(async () => {
      await result.current.mutations.assignRole.mutateAsync({ userId: 'A', input: { roleCode: 'QC' } });
    });
    await waitFor(() => expect(result.current.reserved.data?.QC?.state).toBe('reserved'));

    // The canceled pre-assignment snapshot resolves late — it is discarded, never releasing the
    // fresh reservation.
    act(() => resolvePre?.());
    await waitFor(() => expect(result.current.reserved.data?.QC?.state).toBe('reserved'));

    // A post-assignment recovery fetch reaching the pending version does release it.
    await act(async () => {
      await client.fetchQuery({
        queryKey: accessControlQueryKeys.assignmentIntent('A', 'QC'),
        queryFn: () => repo.current.recoverAssignmentIntent('A', 'QC'),
      });
    });
    await waitFor(() => expect(result.current.reserved.data).toEqual({}));
  });

  it('keeps local reservation data intact when a broad invalidation runs (Review Finding, round 14; RH-04 D3)', async () => {
    // A below-threshold recovery snapshot: even if a broad invalidation somehow triggered a
    // refetch, it must not release the reservation (pending version 5 > snapshot version 4).
    const fake: Partial<IAccessControlRepository> = {
      ...intentFakes('5'),
      recoverAssignmentIntent: vi.fn(() => Promise.resolve(assignedSnapshot('4'))),
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () => ({ mutations: useAccessControlMutations(), reserved: useReservedRoleCodes('A') }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.reserved.data).toEqual({}));
    await act(async () => {
      await result.current.mutations.assignRole.mutateAsync({ userId: 'A', input: { roleCode: 'QC' } });
    });
    await waitFor(() => expect(Object.keys(result.current.reserved.data ?? {})).toEqual(['QC']));

    await act(async () => {
      await client.invalidateQueries();
    });

    expect(
      Object.keys(
        client.getQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles())?.A ?? {},
      ),
    ).toEqual(['QC']);
  });

  it('uses one durable reservation cache entry instead of retaining one immortal query per visited user (Review Finding, round 14)', () => {
    const fake: Partial<IAccessControlRepository> = {};
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    for (const userId of ['A', 'B', 'C']) {
      const hook = renderHook(
        () => ({ mutations: useAccessControlMutations(), reserved: useReservedRoleCodes(userId) }),
        { wrapper },
      );
      hook.unmount();
    }

    const reservationQueries = client.getQueryCache().findAll({
      queryKey: [...accessControlQueryKeys.all, 'reservedRoles'],
    });
    expect(reservationQueries).toHaveLength(1);
  });
});
