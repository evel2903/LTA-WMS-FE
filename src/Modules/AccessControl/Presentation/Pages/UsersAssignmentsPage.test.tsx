// @vitest-environment jsdom
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import type {
  EffectivePermissions,
  Role,
  UserDataScope,
  UserSummary,
} from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type { AssignDataScopeInput } from '@modules/AccessControl/Domain/Types/AccessControlTypes';

const repo = vi.hoisted(() => ({ current: null as unknown as IAccessControlRepository }));
vi.mock('@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance', () => ({
  get accessControlRepository() {
    return repo.current;
  },
}));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { error: toastError } }));

import { UsersAssignmentsPage } from '@modules/AccessControl/Presentation/Pages/UsersAssignmentsPage';
import { UserAssignmentDetailPage } from '@modules/AccessControl/Presentation/Pages/UserAssignmentDetailPage';
import { useAccessControlStore } from '@modules/AccessControl/Application/Stores/AccessControlStore';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 };
}

const user: UserSummary = {
  id: 'u1',
  firstName: 'Alice',
  lastName: 'Nguyen',
  email: 'alice@lta.vn',
  createdAt: '2026-06-01',
};

const secondUser: UserSummary = {
  id: 'u2',
  firstName: 'Binh',
  lastName: 'Tran',
  email: 'binh@lta.vn',
  createdAt: '2026-06-02',
};

const CORE_ROLE_CATALOG: Role[] = [
  { id: 'role-wms-admin', roleCode: 'WMS_ADMIN', roleName: 'WMS Admin', description: null, isSystem: true, status: 'ACTIVE', permissionsVersion: 0, updatedAt: '2026-07-22T06:00:00.000Z' },
  { id: 'role-supervisor', roleCode: 'WAREHOUSE_SUPERVISOR', roleName: 'Giám sát kho', description: null, isSystem: true, status: 'ACTIVE', permissionsVersion: 0, updatedAt: '2026-07-22T06:00:00.000Z' },
  { id: 'role-coordinator', roleCode: 'WAREHOUSE_COORDINATOR', roleName: 'Điều phối kho', description: null, isSystem: true, status: 'ACTIVE', permissionsVersion: 0, updatedAt: '2026-07-22T06:00:00.000Z' },
  { id: 'role-operator', roleCode: 'OPERATOR', roleName: 'Nhân viên vận hành', description: null, isSystem: true, status: 'ACTIVE', permissionsVersion: 0, updatedAt: '2026-07-22T06:00:00.000Z' },
  { id: 'role-qc', roleCode: 'QC', roleName: 'QC', description: null, isSystem: true, status: 'ACTIVE', permissionsVersion: 0, updatedAt: '2026-07-22T06:00:00.000Z' },
  { id: 'role-accountant', roleCode: 'INVENTORY_ACCOUNTANT', roleName: 'Kế toán kho', description: null, isSystem: true, status: 'ACTIVE', permissionsVersion: 0, updatedAt: '2026-07-22T06:00:00.000Z' },
];

/** Fake whose per-user roles/scopes mutate, so invalidated queries observe the change. */
class FakeRepository implements Partial<IAccessControlRepository> {
  roles: RoleCode[] = [];
  scopes: UserDataScope[] = [];
  allRoles: Role[] = [...CORE_ROLE_CATALOG];
  /** Grants per role code, keyed like the real BE — set via `grantRole()` in a test to model
   * an actual Save on the role's permission editor (RA-05 Review Finding: AC2 must prove the
   * real grant chain, not a hard-coded "assigned => 1 permission" shortcut). */
  grantsByRole: Record<string, EffectivePermissions['permissions']> = {};
  listRoles = vi.fn(() => Promise.resolve(page(this.allRoles)));
  listAllRoles = vi.fn(() => Promise.resolve(this.allRoles));
  listUsers = vi.fn(() => Promise.resolve(page([user])));
  getUserEffectivePermissions = vi.fn(
    (userId: string): Promise<EffectivePermissions> =>
      Promise.resolve({
        userId,
        roles: [...this.roles],
        permissions: this.roles.flatMap((roleCode) => this.grantsByRole[roleCode] ?? []),
      }),
  );
  listUserDataScopes = vi.fn(() => Promise.resolve([...this.scopes]));
  assignRole = vi.fn((_userId: string, input: { roleCode: RoleCode }) => {
    this.roles.push(input.roleCode);
    return Promise.resolve();
  });
  removeRole = vi.fn((_userId: string, roleCode: RoleCode) => {
    this.roles = this.roles.filter((role) => role !== roleCode);
    return Promise.resolve();
  });
  assignDataScope = vi.fn((_userId: string, input: AssignDataScopeInput) => {
    const scope: UserDataScope = {
      id: `scope-${this.scopes.length + 1}`,
      scopeType: input.scopeType,
      scopeValueId: input.scopeValueId ?? null,
      scopeValueCode: input.scopeValueCode ?? null,
      includeAll: input.includeAll ?? false,
    };
    this.scopes.push(scope);
    return Promise.resolve(scope);
  });
  removeDataScope = vi.fn(() => Promise.resolve());

  // RH-04 (RH-ASG-01 / D3) intent protocol fakes modeling BE semantics over `this.roles`.
  effectiveVersion = 0;
  headVersion: Record<string, number> = {};
  private itemKey(userId: string, roleCode: string) {
    return `${userId}:${roleCode}`;
  }
  registerAssignmentIntent = vi.fn(
    (userId: string, roleCode: RoleCode, input: { operation: 'assign' | 'remove'; runId: string }) => {
      const key = this.itemKey(userId, roleCode);
      this.headVersion[key] = (this.headVersion[key] ?? 0) + 1;
      return Promise.resolve({
        runId: input.runId,
        operation: input.operation,
        status: 'Registered' as const,
        intentVersion: String(this.headVersion[key]),
        effectiveVersion: String(this.effectiveVersion),
        isCurrent: true,
      });
    },
  );
  applyAssignIntent = vi.fn((_userId: string, input: { roleCode: RoleCode; runId: string; intentVersion: string }) => {
    if (this.roles.includes(input.roleCode)) {
      return Promise.reject(new ApiError({ status: 409, code: 'CONFLICT', message: 'User already has this role' }));
    }
    this.roles.push(input.roleCode);
    this.effectiveVersion += 1;
    return Promise.resolve({
      status: 'Applied' as const,
      runId: input.runId,
      intentVersion: input.intentVersion,
      effectiveVersion: String(this.effectiveVersion),
      roleCode: input.roleCode,
      assigned: true,
    });
  });
  applyRemoveIntent = vi.fn((_userId: string, roleCode: RoleCode, input: { runId: string; intentVersion: string }) => {
    const had = this.roles.includes(roleCode);
    if (had) {
      this.roles = this.roles.filter((role) => role !== roleCode);
      this.effectiveVersion += 1;
    }
    return Promise.resolve({
      status: had ? ('Applied' as const) : ('SatisfiedNoChange' as const),
      runId: input.runId,
      intentVersion: input.intentVersion,
      effectiveVersion: String(this.effectiveVersion),
      roleCode,
      removed: had,
    });
  });
  recoverAssignmentIntent = vi.fn((userId: string, roleCode: RoleCode) =>
    Promise.resolve({
      userId,
      roleCode,
      runId: null,
      operation: null as 'assign' | 'remove' | null,
      status: 'Idle' as const,
      intentVersion: String(this.headVersion[this.itemKey(userId, roleCode)] ?? 0),
      effectiveVersion: String(this.effectiveVersion),
      assignedRoleCodes: [...this.roles],
      isOwnedByCurrentActor: true,
    }),
  );
}

function JumpButton({ label, to }: { label: string; to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      {label}
    </button>
  );
}

function renderPage(
  initialPath: string = ROUTES.FOUNDATION.ACCESS.USERS,
  jump?: { label: string; to: string },
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        {jump ? <JumpButton label={jump.label} to={jump.to} /> : null}
        <Routes>
          <Route path={ROUTES.FOUNDATION.ACCESS.USERS} element={<UsersAssignmentsPage />} />
          <Route
            path={ROUTES.FOUNDATION.ACCESS.USER_DETAIL()}
            element={<UserAssignmentDetailPage mode="detail" />}
          />
          <Route
            path={ROUTES.FOUNDATION.ACCESS.USER_EDIT()}
            element={<UserAssignmentDetailPage mode="edit" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, client };
}

function selectByLabel(label: string): Promise<HTMLSelectElement> {
  return screen.findByLabelText(label);
}

beforeEach(() => {
  useAccessControlStore.setState({ selectedUserId: null, objectTypeFilter: 'ALL', page: 1 });
  toastError.mockClear();
});
afterEach(() => cleanup());
// Safety net for the offline-paused test below — never let a mid-test failure leave the
// global onlineManager stuck offline for later tests in this (or another) file.
afterEach(() => onlineManager.setOnline(true));

async function openUserDetail(actor: ReturnType<typeof userEvent.setup>) {
  const [openButton] = await screen.findAllByRole('button', {
    name: 'Mở chi tiết phân quyền của Alice Nguyen',
  });
  await actor.click(openButton);
}

describe('UsersAssignmentsPage (C10 AC5 / AC3)', () => {
  it('assigns a role and re-reads the user effective permissions (AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await openUserDetail(actor);
    expect(await screen.findByText(/Đang ở chế độ xem chi tiết/i)).toBeTruthy();
    expect(screen.queryByText(/Bạn không có quyền chỉnh sửa/i)).toBeNull();
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa phân quyền' }));
    expect(await screen.findByText('Chưa gán vai trò nào.')).toBeTruthy();

    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));

    // The default selection is the first available core role (WMS Admin). After the
    // mutation invalidates the effective query, the panel re-reads and shows it.
    expect(await screen.findByText('WMS Admin')).toBeTruthy();
    expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'WMS_ADMIN' }));
  });

  it("assigns a CUSTOM (non-core) role to a user, showing its real name (not the code or 'undefined') and the exact permission its own grant unlocks (RA-05 AC1/AC2)", async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.allRoles = [
      ...CORE_ROLE_CATALOG,
      {
        id: 'role-custom-1',
        roleCode: 'INVENTORY_LEAD',
        roleName: 'Inventory Lead',
        description: null,
        isSystem: false,
        status: 'ACTIVE',
        permissionsVersion: 3,
        updatedAt: '2026-07-22T06:00:00.003Z',
      },
    ];
    // Models a REAL saved grant on the role's own permission editor (not a hard-coded
    // "role assigned => permission N" shortcut) -- getUserEffectivePermissions derives
    // permissions by looking up each of the user's roles in this same grant table, exactly
    // like the real BE join, proving the full role -> grant -> user-effective chain.
    fake.grantsByRole.INVENTORY_LEAD = [{ permissionCode: 'SKU.Read', action: 'Read', objectType: 'SKU' }];
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await openUserDetail(actor);
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa phân quyền' }));
    expect(await screen.findByText('Chưa gán vai trò nào.')).toBeTruthy();

    // Pick the custom role explicitly -- before the RA-05 fix, CORE_ROLE_CODES meant this
    // option could never even appear in the dropdown.
    await actor.selectOptions(await screen.findByLabelText('Vai trò'), 'INVENTORY_LEAD');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));

    expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'INVENTORY_LEAD' }));
    // Badge shows the custom role's real name -- not its code, and not "undefined" (the
    // pre-fix bug for any role outside the hardcoded ROLE_LABELS map) -- and its remove
    // control's accessible name carries the same real name, not the raw code.
    expect(await screen.findByText('Inventory Lead')).toBeTruthy();
    expect(screen.queryByText(/undefined/i)).toBeNull();
    expect(await screen.findByRole('button', { name: 'Gỡ vai trò Inventory Lead' })).toBeTruthy();
    // Effective permissions re-read after assign reflect EXACTLY the role's own saved grant,
    // not an arbitrary count.
    expect(await screen.findByText('Quyền hiệu lực (1)')).toBeTruthy();
    expect(await screen.findByText('Xem SKU')).toBeTruthy();
  });

  it('shows a loading state for the role catalog instead of falsely claiming all roles are assigned (Review Finding)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let resolveRoles: (roles: Role[]) => void = () => undefined;
    fake.listAllRoles = vi.fn(
      () => new Promise<Role[]>((resolve) => { resolveRoles = resolve; }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await openUserDetail(actor);
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa phân quyền' }));

    // While the catalog is still pending, the panel must say so -- not silently render as if
    // every role were already assigned (the pre-fix bug: `data` is `undefined` while loading,
    // filtered to `[]`, indistinguishable from a genuinely-empty catalog).
    expect(await screen.findByText('Đang tải danh sách vai trò...')).toBeTruthy();
    expect(screen.queryByText('Đã gán tất cả vai trò khả dụng.')).toBeNull();

    resolveRoles(CORE_ROLE_CATALOG);
    expect(await screen.findByLabelText('Vai trò')).toBeTruthy();
  });

  it('shows an error state for the role catalog instead of the empty-catalog message (Review Finding)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.listAllRoles = vi.fn(() => Promise.reject(new Error('network down')));
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await openUserDetail(actor);
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa phân quyền' }));

    expect(await screen.findByText(/Không thể tải danh sách vai trò để gán/)).toBeTruthy();
    expect(screen.queryByText('Đã gán tất cả vai trò khả dụng.')).toBeNull();
  });

  it('keeps the catalog usable when a background refetch fails but a good catalog is already cached (Review Finding)', async () => {
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    const { client } = renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    // Successful first load.
    expect(await screen.findByLabelText('Vai trò')).toBeTruthy();

    // A later background refetch fails -- TanStack Query flips `isError` true
    // (`isRefetchError`) while the previously-fetched catalog is still sitting in `data`.
    fake.listAllRoles = vi.fn(() => Promise.reject(new Error('network blip')));
    await client.refetchQueries({ queryKey: accessControlQueryKeys.allRoles() }).catch(() => undefined);

    // The stale-but-good catalog must still drive the form -- not get replaced by the
    // catalog-error message (the pre-fix bug: any `isError` blocked the form outright).
    expect(await screen.findByLabelText('Vai trò')).toBeTruthy();
    expect(screen.queryByText(/Không thể tải danh sách vai trò để gán/)).toBeNull();
  });

  it('does not treat an offline-paused first load as an already-empty catalog (Review Finding)', async () => {
    onlineManager.setOnline(false);
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    // Paused (no network, no data yet) is NOT "fetching", so a naive `isLoading` check misses
    // it -- the panel must still show a blocked/loading state, not the ready+empty-catalog UI.
    expect(await screen.findByText('Đang tải danh sách vai trò...')).toBeTruthy();
    expect(screen.queryByText('Đã gán tất cả vai trò khả dụng.')).toBeNull();

    onlineManager.setOnline(true);
    expect(await screen.findByLabelText('Vai trò')).toBeTruthy();
  });

  it('keeps an admin’s in-progress (non-first) role selection across a catalog refresh (Review Finding, round 4/5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    const { client } = renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    // QC is neither the first nor the last CORE_ROLE_CATALOG entry.
    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    expect((await selectByLabel('Vai trò')).value).toBe('QC');

    // Another admin creates a custom role elsewhere -- the catalog refetches with a new entry
    // while this panel is still open and mid-selection.
    fake.allRoles = [
      ...CORE_ROLE_CATALOG,
      {
        id: 'role-new',
        roleCode: 'NEW_ROLE',
        roleName: 'New Role',
        description: null,
        isSystem: false,
        status: 'ACTIVE',
        permissionsVersion: 0,
        updatedAt: '2026-07-22T06:00:00.001Z',
      },
    ];
    await client.invalidateQueries({ queryKey: accessControlQueryKeys.allRoles() });
    await waitFor(async () => {
      const select = await selectByLabel('Vai trò');
      expect(Array.from(select.options).some((option) => option.value === 'NEW_ROLE')).toBe(true);
    });

    // The pre-fix bug: the form's `key` included the (now-changed) available-roles list,
    // remounting AssignRoleForm and silently reseeding to the first option.
    expect((await selectByLabel('Vai trò')).value).toBe('QC');
  });

  it('preserves an assigned role’s real name after it becomes inactive (RA-05 AC1/D3 Review Finding)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    const customRole: Role = {
      id: 'role-custom-2',
      roleCode: 'INVENTORY_LEAD',
      roleName: 'Inventory Lead',
      description: null,
      isSystem: false,
      status: 'ACTIVE',
      permissionsVersion: 1,
      updatedAt: '2026-07-22T06:00:00.001Z',
    };
    fake.allRoles = [...CORE_ROLE_CATALOG, customRole];
    repo.current = fake as unknown as IAccessControlRepository;
    const { client } = renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    await actor.selectOptions(await screen.findByLabelText('Vai trò'), 'INVENTORY_LEAD');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    expect(await screen.findByText('Inventory Lead')).toBeTruthy();

    // The role goes Inactive server-side (D3) while still assigned to this user -- force a
    // fresh read of the (now stale) catalog cache, exactly like a real refetch would observe.
    fake.allRoles = [...CORE_ROLE_CATALOG, { ...customRole, status: 'INACTIVE' }];
    await client.invalidateQueries();

    // The badge must still resolve the real name from the full catalog (label lookups are
    // never Active-filtered) -- not fall back to the raw code.
    expect(await screen.findByText('Inventory Lead')).toBeTruthy();
    expect(screen.queryByText('INVENTORY_LEAD')).toBeNull();
  });

  it('excludes an inactive role from the assignable dropdown even when it was never assigned to anyone (RA-05 AC1 Review Finding)', async () => {
    const fake = new FakeRepository();
    fake.allRoles = [
      ...CORE_ROLE_CATALOG,
      {
        id: 'role-custom-3',
        roleCode: 'RETIRED_ROLE',
        roleName: 'Retired Role',
        description: null,
        isSystem: false,
        status: 'INACTIVE',
        permissionsVersion: 0,
        updatedAt: '2026-07-22T06:00:00.001Z',
      },
    ];
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    const select = await selectByLabel('Vai trò');
    expect(Array.from(select.options).some((option) => option.value === 'RETIRED_ROLE')).toBe(false);
    expect(Array.from(select.options).some((option) => option.value === 'WMS_ADMIN')).toBe(true);
  });

  it('excludes a just-assigned role from the dropdown immediately, before the invalidated effective-permissions refetch resolves (Review Finding, round 6)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let effectiveCallCount = 0;
    let resolveEffective: (() => void) | undefined;
    fake.getUserEffectivePermissions = vi.fn((userId: string): Promise<EffectivePermissions> => {
      const compute = () =>
        Promise.resolve({
          userId,
          roles: [...fake.roles],
          permissions: fake.roles.flatMap((roleCode) => fake.grantsByRole[roleCode] ?? []),
        });
      effectiveCallCount += 1;
      // First call is the initial page load; the SECOND is the refetch `invalidateUser()`
      // triggers after `assignRole` succeeds -- keep it pending so the test can observe the
      // window before it resolves.
      if (effectiveCallCount === 1) return compute();
      return new Promise((resolve) => {
        resolveEffective = () => resolve(compute());
      });
    });
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'QC' }));

    // The effective-permissions refetch this assignment triggered is still pending -- without
    // the fix, `assignedRoles` (and therefore the dropdown) wouldn't reflect the new
    // assignment yet, letting an admin submit QC a second time before it settles.
    const select = await selectByLabel('Vai trò');
    await waitFor(() =>
      expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(false),
    );

    resolveEffective?.();
    await waitFor(() => expect(screen.getByText('QC')).toBeTruthy());
  });

  it('optimistically marks an assigned role and blocks its duplicate submission while the permission-count refetch is still pending (Review Finding, round 9; RH-04 D3 decouples assignment from permissions)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.grantsByRole.QC = [{ permissionCode: 'SKU.Read', action: 'Read', objectType: 'SKU' }];
    let effectiveCallCount = 0;
    let resolveEffective: (() => void) | undefined;
    fake.getUserEffectivePermissions = vi.fn((userId: string): Promise<EffectivePermissions> => {
      const compute = () =>
        Promise.resolve({
          userId,
          roles: [...fake.roles],
          permissions: fake.roles.flatMap((roleCode) => fake.grantsByRole[roleCode] ?? []),
        });
      effectiveCallCount += 1;
      // First call is the initial load; the SECOND is the refetch `invalidateUser()` triggers
      // after `assignRole` succeeds -- keep it pending so the test can observe the window.
      if (effectiveCallCount === 1) return compute();
      return new Promise((resolve) => {
        resolveEffective = () => resolve(compute());
      });
    });
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    expect(await screen.findByText('Chưa gán vai trò nào.')).toBeTruthy();
    expect(await screen.findByText('Quyền hiệu lực (0)')).toBeTruthy();

    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'QC' }));

    // RH-04 (D3): the committed reservation optimistically marks QC assigned AND excludes it from
    // the dropdown so it cannot be submitted twice. The permission COUNT comes from the separate
    // effective-permissions query — assignment version and permission content are decoupled, so the
    // badge appearing before the (still-pending) count settles is by design, not the round-6 bug.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gỡ vai trò QC' })).toBeTruthy());
    const select = await selectByLabel('Vai trò');
    expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(false);
    expect(screen.getByText('Quyền hiệu lực (0)')).toBeTruthy(); // count still lagging until effective resolves

    resolveEffective?.();
    // Once the effective-permissions refetch lands, the permission count catches up.
    expect(await screen.findByText('Quyền hiệu lực (1)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gỡ vai trò QC' })).toBeTruthy();
  });

  it('allows reassigning a role after it was removed, instead of leaving it permanently reserved (Review Finding, round 10)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gỡ vai trò QC' })).toBeTruthy());

    await actor.click(screen.getByRole('button', { name: 'Gỡ vai trò QC' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Gỡ vai trò QC' })).toBeNull());

    // QC must be selectable again right away -- not stuck excluded by a stale `success`
    // reservation left over from the FIRST assignment (TanStack Query retains a settled
    // mutation for its whole `gcTime`, independent of what happens to the role afterward).
    const select = await selectByLabel('Vai trò');
    await waitFor(() => expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(true));
  });

  it('preserves the submitted role selection while an assignment is pending and after it fails, so a retry submits the SAME role (Review Finding, round 10)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let rejectAssign: ((error: Error) => void) | undefined;
    fake.applyAssignIntent = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectAssign = reject;
        }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(fake.applyAssignIntent).toHaveBeenCalledTimes(1));

    // Still pending -- the submit button being disabled already prevents a duplicate
    // request, so the dropdown must NOT also remove QC and silently switch the selection.
    expect((await selectByLabel('Vai trò')).value).toBe('QC');

    rejectAssign?.(new Error('network blip'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Gán vai trò' }).hasAttribute('disabled')).toBe(false),
    );
    // After the failure settles, the selection must still be QC -- a retry submits the SAME role.
    expect((await selectByLabel('Vai trò')).value).toBe('QC');
  });

  it('keeps a removed role genuinely reassignable even after an unrelated later assign+remove on a different role (Review Finding, round 11)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    // Assign QC, then remove it.
    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gỡ vai trò QC' })).toBeTruthy());
    await actor.click(screen.getByRole('button', { name: 'Gỡ vai trò QC' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Gỡ vai trò QC' })).toBeNull());

    // An unrelated role (OPERATOR) is later assigned AND removed too -- this must not affect
    // QC's own reservation lifecycle (a mutation-cache-GC-based implementation could evict QC's
    // remove "tombstone" sooner than its assign entry purely because OPERATOR's remove call
    // reassigned the SAME shared removeRole hook away from QC's remove mutation).
    await actor.selectOptions(await selectByLabel('Vai trò'), 'OPERATOR');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gỡ vai trò Nhân viên vận hành' })).toBeTruthy());
    await actor.click(screen.getByRole('button', { name: 'Gỡ vai trò Nhân viên vận hành' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Gỡ vai trò Nhân viên vận hành' })).toBeNull(),
    );

    // QC must still be genuinely assignable -- not silently re-hidden by a stale reservation.
    const select = await selectByLabel('Vai trò');
    await waitFor(() => expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(true));
  });

  it('keeps an assignment protected against duplicate submission even after a DIFFERENT role is assigned on the same page (Review Finding, round 11)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let callCount = 0;
    const pendingResolvers: (() => void)[] = [];
    fake.getUserEffectivePermissions = vi.fn((userId: string): Promise<EffectivePermissions> => {
      const compute = () =>
        Promise.resolve({
          userId,
          roles: [...fake.roles],
          permissions: fake.roles.flatMap((roleCode) => fake.grantsByRole[roleCode] ?? []),
        });
      callCount += 1;
      if (callCount === 1) return compute();
      // Every refetch AFTER the initial load stays pending until explicitly flushed at the end
      // -- keeps the "real" effective-permissions data from updating on its own, so the
      // assertions below genuinely exercise `reservedRoleCodes` and not a lucky coincidental
      // refetch (e.g. OPERATOR's own `invalidateUser` call resolving fast and incidentally
      // already reflecting QC too).
      return new Promise((resolve) => {
        pendingResolvers.push(() => resolve(compute()));
      });
    });
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    // Assign QC -- its own effective-permissions refetch is held pending.
    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'QC' })));

    // Assign a DIFFERENT role (OPERATOR) on the SAME page/hook while QC's refetch is still
    // pending -- this must not expire QC's own protection (a mutation-cache-GC-based
    // implementation could detach QC's "assign" entry from the shared assignRole hook's
    // observer the moment OPERATOR's `.mutate()` call reassigns it).
    await actor.selectOptions(await selectByLabel('Vai trò'), 'OPERATOR');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'OPERATOR' })));

    // QC must still be excluded from the dropdown -- resubmitting it now would be a duplicate.
    const select = await selectByLabel('Vai trò');
    expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(false);

    pendingResolvers.forEach((resolve) => resolve());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gỡ vai trò QC' })).toBeTruthy());
  });

  it('keeps an assignment reservation intact across an Edit -> Detail -> Edit toggle for the SAME user, before the effective-permissions refetch resolves (Review Finding, round 12)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let callCount = 0;
    let resolveEffective: (() => void) | undefined;
    fake.getUserEffectivePermissions = vi.fn((userId: string): Promise<EffectivePermissions> => {
      const compute = () =>
        Promise.resolve({
          userId,
          roles: [...fake.roles],
          permissions: fake.roles.flatMap((roleCode) => fake.grantsByRole[roleCode] ?? []),
        });
      callCount += 1;
      // First call is the initial load; every refetch AFTER it (including the one the
      // assign below triggers) stays pending until explicitly flushed.
      if (callCount === 1) return compute();
      return new Promise((resolve) => {
        resolveEffective = () => resolve(compute());
      });
    });
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'QC' })));

    // Toggle to Detail and back to Edit for the SAME user -- the effective-permissions
    // refetch the assign triggered is still pending throughout.
    await actor.click(await screen.findByRole('link', { name: 'Xem chi tiết' }));
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa phân quyền' }));

    // QC must still be excluded -- the mode toggle must not have cleared the reservation.
    const select = await selectByLabel('Vai trò');
    expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(false);

    resolveEffective?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gỡ vai trò QC' })).toBeTruthy());
  });

  it('makes a role reassignable again after it is removed by someone else, once the authoritative effective-permissions catch up (Review Finding, round 12)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    const { client } = renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gỡ vai trò QC' })).toBeTruthy());

    // QC is removed by a DIFFERENT actor. RH-04 (D3): the FE observes this by re-reading the
    // authoritative recovery snapshot (raw assignedRoleCodes), NOT the effective-permissions query
    // whose roles are not assignment proof.
    fake.roles = fake.roles.filter((role) => role !== 'QC');
    await client.invalidateQueries({ queryKey: accessControlQueryKeys.assignmentIntent('u1', 'QC') });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Gỡ vai trò QC' })).toBeNull());

    // QC must be selectable again -- not stuck excluded by a reservation this hook instance
    // added for its own earlier assign, now stale.
    const select = await selectByLabel('Vai trò');
    await waitFor(() =>
      expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(true),
    );
  });

  it('makes a role reassignable again even when it is removed by someone else BEFORE any effective-permissions read ever observed it as assigned (Review Finding, round 13)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let effectiveCallCount = 0;
    let resolveEffective: (() => void) | undefined;
    fake.getUserEffectivePermissions = vi.fn((userId: string): Promise<EffectivePermissions> => {
      const compute = () =>
        Promise.resolve({
          userId,
          roles: [...fake.roles],
          permissions: fake.roles.flatMap((roleCode) => fake.grantsByRole[roleCode] ?? []),
        });
      effectiveCallCount += 1;
      // First call is the initial load; the SECOND is the refetch `invalidateUser()` triggers
      // after `assignRole` succeeds -- keep it pending so QC can be removed out-of-band before
      // it ever resolves, meaning NO read ever shows QC as assigned.
      if (effectiveCallCount === 1) return compute();
      return new Promise((resolve) => {
        resolveEffective = () => resolve(compute());
      });
    });
    repo.current = fake as unknown as IAccessControlRepository;
    const { client } = renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'));

    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'QC' })));

    // QC is removed by a different actor. RH-04 (D3): a fresh authoritative recovery snapshot,
    // read after the reservation, is what closes the gap — its raw assignedRoleCodes never shows QC.
    fake.roles = fake.roles.filter((role) => role !== 'QC');
    resolveEffective?.();
    await client.invalidateQueries({ queryKey: accessControlQueryKeys.assignmentIntent('u1', 'QC') });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Gỡ vai trò QC' })).toBeNull());

    // QC must be selectable again -- a content-based reconcile (round 12) can never clear this,
    // since QC never appears in any post-assign read; only a "a fetch has landed since the
    // reservation was made" signal, content-agnostic, closes this gap.
    const select = await selectByLabel('Vai trò');
    await waitFor(() =>
      expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(true),
    );
  });

  it('does not permanently stick a reservation after an inactive effective-permissions query is evicted and rebuilt (Review Finding, round 15)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let effectiveCallCount = 0;
    let rejectEffective: ((error: Error) => void) | undefined;
    fake.getUserEffectivePermissions = vi.fn((userId: string): Promise<EffectivePermissions> => {
      const compute = () =>
        Promise.resolve({ userId, roles: [...fake.roles], permissions: [] });
      effectiveCallCount += 1;
      // The SECOND call is the refetch `invalidateUser()` triggers right after `assignRole`
      // succeeds. It fails after the admin leaves, so the query becomes idle and can really be
      // garbage-collected; a forever-fetching query is not naturally GC-eligible.
      if (effectiveCallCount === 2) {
        return new Promise((_resolve, reject) => {
          rejectEffective = reject;
        });
      }
      return compute();
    });
    repo.current = fake as unknown as IAccessControlRepository;
    const returnLabel = 'Quay lại chỉnh sửa người dùng u1';
    const { client } = renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'), {
      label: returnLabel,
      to: ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'),
    });

    await actor.selectOptions(await selectByLabel('Vai trò'), 'QC');
    await actor.click(screen.getByRole('button', { name: 'Gán vai trò' }));
    await waitFor(() => expect(fake.applyAssignIntent).toHaveBeenCalledWith('u1', expect.objectContaining({ roleCode: 'QC' })));
    await waitFor(() => expect(effectiveCallCount).toBe(2));

    // Leave the detail route first so userEffective('u1') has no observer, then settle the
    // outstanding refetch as an error. This reproduces the actual preconditions for query GC
    // without forcing React Query to remove a query during its observer's render lifecycle.
    await actor.click(screen.getByRole('link', { name: 'Quay lại người dùng' }));
    expect(await screen.findByText('Người dùng và phân quyền')).toBeTruthy();
    act(() => {
      rejectEffective?.(new Error('network lost while away'));
    });
    await waitFor(() =>
      expect(client.getQueryState(accessControlQueryKeys.userEffective('u1'))?.fetchStatus).toBe('idle'),
    );
    expect(
      client
        .getQueryCache()
        .find({ queryKey: accessControlQueryKeys.userEffective('u1'), exact: true })
        ?.getObserversCount(),
    ).toBe(0);

    // QC is (for whatever real-world reason -- another actor, a later explicit remove) no
    // longer actually assigned by the time an authoritative read next lands.
    fake.roles = fake.roles.filter((role) => role !== 'QC');

    // `removeQueries` now models the end result of gcTime elapsing on an inactive, idle query.
    // The later route visit constructs a genuinely new Query instance and performs its first
    // authoritative fetch; an instance-local dataUpdateCount restarts at 1 here.
    client.removeQueries({ queryKey: accessControlQueryKeys.userEffective('u1'), exact: true });
    expect(client.getQueryState(accessControlQueryKeys.userEffective('u1'))).toBeUndefined();
    await actor.click(screen.getByRole('button', { name: returnLabel }));

    // The rebuilt query's first result is authoritative. QC is no longer assigned, so it must
    // be selectable again rather than stuck behind state tied to the evicted Query instance.
    const select = await selectByLabel('Vai trò');
    await waitFor(() =>
      expect(Array.from(select.options).some((option) => option.value === 'QC')).toBe(true),
    );
  });

  it('assigns a data scope and re-reads the user data scopes (AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await openUserDetail(actor);
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa phân quyền' }));
    expect(await screen.findByText('Chưa gán phạm vi dữ liệu nào.')).toBeTruthy();

    // Áp dụng tất cả satisfies the XOR validation without a value (default scopeType = WAREHOUSE).
    await actor.click(await screen.findByLabelText(/Áp dụng tất cả giá trị/i));
    await actor.click(screen.getByRole('button', { name: 'Gán phạm vi' }));

    // After invalidate→refetch the new scope renders in the panel as a removable row
    // The remove button includes the scope context in its accessible name.
    expect(await screen.findByRole('button', { name: /Gỡ phạm vi/i })).toBeTruthy();
    expect(await screen.findByText('Tất cả')).toBeTruthy();
    expect(fake.assignDataScope).toHaveBeenCalled();
  });

  it('clears hidden scope values when switching to include-all before submit', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await openUserDetail(actor);
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa phân quyền' }));

    await actor.type(await screen.findByLabelText('Mã giá trị phạm vi'), 'WH-STALE');
    await actor.click(await screen.findByLabelText(/Áp dụng tất cả giá trị/i));
    await actor.click(screen.getByRole('button', { name: 'Gán phạm vi' }));

    await waitFor(() =>
      expect(fake.assignDataScope).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          includeAll: true,
          scopeValueCode: undefined,
          scopeValueId: undefined,
        }),
      ),
    );
  });

  it('shows a permission-denied detail state when effective-permissions 403s (AC3)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.getUserEffectivePermissions = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await openUserDetail(actor);
    expect(await screen.findByText(/không có quyền/i)).toBeTruthy();
  });

  it('surfaces a 409 data-scope conflict inline, not as a toast (AC4)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.assignDataScope = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 409, code: 'CONFLICT', message: 'Người dùng đã có phạm vi dữ liệu này' }),
      ),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await openUserDetail(actor);
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa phân quyền' }));
    // Áp dụng tất cả satisfies the XOR validation without a value.
    await actor.click(await screen.findByLabelText(/Áp dụng tất cả giá trị/i));
    await actor.click(screen.getByRole('button', { name: 'Gán phạm vi' }));

    expect(await screen.findByText('Người dùng đã có phạm vi dữ liệu này')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('clears mutation conflict when navigating to another user assignment route', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.listUsers = vi.fn(() => Promise.resolve(page([user, secondUser])));
    fake.assignDataScope = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 409, code: 'CONFLICT', message: 'Người dùng đã có phạm vi dữ liệu này' }),
      ),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage(ROUTES.FOUNDATION.ACCESS.USER_EDIT('u1'), {
      label: 'Mở phân quyền user thứ hai',
      to: ROUTES.FOUNDATION.ACCESS.USER_EDIT('u2'),
    });

    await actor.click(await screen.findByLabelText(/Áp dụng tất cả giá trị/i));
    await actor.click(screen.getByRole('button', { name: 'Gán phạm vi' }));
    expect(await screen.findByText('Người dùng đã có phạm vi dữ liệu này')).toBeTruthy();

    await actor.click(screen.getByRole('button', { name: 'Mở phân quyền user thứ hai' }));

    expect((await screen.findAllByRole('heading', { name: 'Binh Tran' })).length).toBeGreaterThan(0);
    expect(screen.queryByText('Người dùng đã có phạm vi dữ liệu này')).toBeNull();
  });
});
