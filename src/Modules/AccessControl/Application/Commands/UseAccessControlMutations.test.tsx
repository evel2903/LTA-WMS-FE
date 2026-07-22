// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import type { EffectivePermissions, Role } from '@modules/AccessControl/Domain/Entities/AccessControl';
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
  useUserEffectivePermissions,
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

  it('keeps an assignment reservation scoped to the user it was submitted for, never leaking into a different user shown on the SAME hook instance (Review Finding, round 13)', async () => {
    let resolveAssign: (() => void) | undefined;
    const fake: Partial<IAccessControlRepository> = {
      assignRole: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveAssign = resolve;
          }),
      ),
      getUserEffectivePermissions: vi.fn(() =>
        Promise.resolve({ userId: 'A', roles: [], permissions: [] }),
      ),
      listUserDataScopes: vi.fn(() => Promise.resolve([])),
    };
    repo.current = fake as IAccessControlRepository;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }

    // `useAccessControlMutations()` is a single hook instance not scoped to any one user (it
    // doesn't remount on a route userId change) -- assign QC for user A and keep it pending,
    // exactly like it would still be in flight if the admin navigated to a different user B
    // before it settled.
    const { result } = renderHook(() => useAccessControlMutations(), { wrapper });
    act(() => {
      result.current.assignRole.mutate({ userId: 'A', input: { roleCode: 'QC' } });
    });
    await waitFor(() => expect(fake.assignRole).toHaveBeenCalledTimes(1));

    act(() => {
      resolveAssign?.();
    });
    await waitFor(() => expect(result.current.assignRole.isSuccess).toBe(true));

    // A's own reservation exists...
    const reservations = client.getQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles());
    const reservedA = reservations?.A;
    expect(Object.keys(reservedA ?? {})).toEqual(['QC']);
    expect(reservedA?.QC).toBe(true);
    // ...but B's bucket was never touched, no matter that this settled after a hypothetical
    // navigation to B.
    expect(reservations?.B).toBeUndefined();
  });

  it('keeps a reservation alive across a full unmount + remount of the consuming hook, since it lives on the query client, not component state (Review Finding, round 13)', async () => {
    const fake: Partial<IAccessControlRepository> = {
      assignRole: vi.fn(() => Promise.resolve()),
      getUserEffectivePermissions: vi.fn(() =>
        Promise.resolve({ userId: 'A', roles: [], permissions: [] }),
      ),
    };
    repo.current = fake as IAccessControlRepository;

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
    // effective-permissions refetch this triggered has necessarily resolved.
    first.unmount();

    renderHook(() => useAccessControlMutations(), { wrapper });

    const reservedA = client.getQueryData<ReservedRolesState>(accessControlQueryKeys.reservedRoles())?.A;
    expect(Object.keys(reservedA ?? {})).toEqual(['QC']);
    expect(reservedA?.QC).toBe(true);
  });

  it('keeps a reservation durable past the default 5-minute query GC window after the consuming page unmounts (Review Finding, round 13, adversarial follow-up)', async () => {
    vi.useFakeTimers();
    try {
      const fake: Partial<IAccessControlRepository> = {
        assignRole: vi.fn(() => Promise.resolve()),
      };
      repo.current = fake as IAccessControlRepository;

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

  it('clears a reservation only for an authoritative effective-permissions fetch success, not a manual cache write (Review Finding, round 15)', async () => {
    let effectiveCallCount = 0;
    let resolveEffective: (() => void) | undefined;
    const fake: Partial<IAccessControlRepository> = {
      assignRole: vi.fn(() => Promise.resolve()),
      getUserEffectivePermissions: vi.fn((userId: string): Promise<EffectivePermissions> => {
        effectiveCallCount += 1;
        if (effectiveCallCount === 1) {
          return Promise.resolve({ userId, roles: [], permissions: [] });
        }
        return new Promise((resolve) => {
          resolveEffective = () => resolve({ userId, roles: [], permissions: [] });
        });
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
      () => ({
        mutations: useAccessControlMutations(),
        effective: useUserEffectivePermissions('A'),
        reserved: useReservedRoleCodes('A'),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.effective.data).toBeDefined());
    await act(async () => {
      await result.current.mutations.assignRole.mutateAsync({ userId: 'A', input: { roleCode: 'QC' } });
    });
    await waitFor(() => expect(effectiveCallCount).toBe(2));
    await waitFor(() => expect(result.current.reserved.data?.QC).toBe(true));

    // A manual cache patch is not proof that the repository was read after assignment.
    act(() => {
      client.setQueryData(
        accessControlQueryKeys.userEffective('A'),
        client.getQueryData(accessControlQueryKeys.userEffective('A')),
      );
    });
    expect(result.current.reserved.data?.QC).toBe(true);

    // Only the actual pending repository read is allowed to release the reservation.
    act(() => resolveEffective?.());
    await waitFor(() => expect(result.current.reserved.data).toEqual({}));
  });

  it('does not let an effective-permissions request started before assignment release the new reservation (Review Finding, round 15)', async () => {
    let effectiveCallCount = 0;
    let resolvePreAssignment: (() => void) | undefined;
    let resolvePostAssignment: (() => void) | undefined;
    const fake: Partial<IAccessControlRepository> = {
      assignRole: vi.fn(() => Promise.resolve()),
      getUserEffectivePermissions: vi.fn((userId: string): Promise<EffectivePermissions> => {
        effectiveCallCount += 1;
        if (effectiveCallCount === 1) {
          return Promise.resolve({ userId, roles: [], permissions: [] });
        }
        if (effectiveCallCount === 2) {
          return new Promise((resolve) => {
            resolvePreAssignment = () => resolve({ userId, roles: [], permissions: [] });
          });
        }
        return new Promise((resolve) => {
          resolvePostAssignment = () => resolve({ userId, roles: [], permissions: [] });
        });
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
      () => ({
        mutations: useAccessControlMutations(),
        effective: useUserEffectivePermissions('A'),
        reserved: useReservedRoleCodes('A'),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.effective.data).toBeDefined());

    // Start a background read before the assignment succeeds. The mutation must cancel this
    // request before installing the reservation, even if the request's promise resolves later.
    void client.refetchQueries({ queryKey: accessControlQueryKeys.userEffective('A'), exact: true });
    await waitFor(() => expect(effectiveCallCount).toBe(2));
    await act(async () => {
      await result.current.mutations.assignRole.mutateAsync({ userId: 'A', input: { roleCode: 'QC' } });
    });
    await waitFor(() => expect(effectiveCallCount).toBe(3));
    expect(result.current.reserved.data?.QC).toBe(true);

    // The canceled pre-assignment response is not authoritative for this reservation.
    act(() => resolvePreAssignment?.());
    expect(result.current.reserved.data?.QC).toBe(true);

    act(() => resolvePostAssignment?.());
    await waitFor(() => expect(result.current.reserved.data).toEqual({}));
  });

  it('keeps local reservation data intact when a broad invalidation runs (Review Finding, round 14)', async () => {
    const fake: Partial<IAccessControlRepository> = {
      assignRole: vi.fn(() => Promise.resolve()),
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
