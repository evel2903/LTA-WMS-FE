// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { ROLE_PERMISSIONS_MUTATION_KEYS } from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import type { Permission, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type {
  ResetRolePermissionsInput,
  SetRolePermissionsInput,
} from '@modules/AccessControl/Domain/Types/AccessControlTypes';

const repo = vi.hoisted(() => ({ current: null as unknown as IAccessControlRepository }));
vi.mock('@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance', () => ({
  get accessControlRepository() {
    return repo.current;
  },
}));
const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { error: toastError, success: toastSuccess } }));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: () => ({
    options: [{ value: 'RC-ROLE-PERMISSION-UPDATE', label: 'RC-ROLE-PERMISSION-UPDATE - Cập nhật quyền vai trò' }],
    isLoading: false,
    isError: false,
  }),
}));

import { RoleDetailPage } from '@modules/AccessControl/Presentation/Pages/RoleDetailPage';

const permission = (action: string, objectType: string): Permission => ({
  id: `${action}-${objectType}`,
  permissionCode: `${objectType}.${action}`,
  action,
  objectType,
  description: null,
});

const CATALOG: Permission[] = [
  permission('Read', 'SKU'),
  permission('Update', 'SKU'),
  permission('Create', 'SKU'),
  permission('Read', 'Owner'),
  permission('Update', 'Owner'),
  permission('Read', 'Role'),
  permission('Update', 'Role'),
  permission('Create', 'Role'),
];

const customRole: RoleDetail = {
  id: 'role-custom',
  roleCode: 'INVENTORY_LEAD',
  roleName: 'Inventory Lead',
  description: null,
  isSystem: false,
  status: 'ACTIVE',
  permissionsVersion: 0,
  permissions: [permission('Read', 'SKU')],
};

const wmsAdmin: RoleDetail = {
  id: 'role-admin',
  roleCode: 'WMS_ADMIN',
  roleName: 'WMS Admin',
  description: null,
  isSystem: true,
  status: 'ACTIVE',
  permissionsVersion: 0,
  permissions: [permission('Read', 'SKU'), permission('Update', 'SKU'), permission('Read', 'Role'), permission('Update', 'Role')],
};

class FakeRepository implements Partial<IAccessControlRepository> {
  roles: RoleDetail[] = [customRole, wmsAdmin];
  getRole = vi.fn((roleCode: string) => {
    const role = this.roles.find((item) => item.roleCode === roleCode);
    if (!role) return Promise.reject(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'not found' }));
    return Promise.resolve(role);
  });
  listAllPermissions = vi.fn(() => Promise.resolve(CATALOG));
  setRolePermissions = vi.fn(
    (
      _id: string,
      _input: SetRolePermissionsInput,
    ): Promise<{ permissions: { action: string; objectType: string }[]; version: number }> =>
      Promise.resolve({ permissions: [], version: 1 }),
  );
  resetRolePermissions = vi.fn(
    (
      _id: string,
      _input: ResetRolePermissionsInput,
    ): Promise<{ permissions: { action: string; objectType: string }[]; version: number }> =>
      Promise.resolve({ permissions: [], version: 1 }),
  );
}

function renderPage(roleCode: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(roleCode)]}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL()} element={<RoleDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Same tree as `renderPage`, plus an in-app link to a second role so a test can navigate
 * between two role-detail URLs WITHOUT unmounting `RoleDetailPage` (the route has no `key`
 * tied to `roleCode`, mirroring real navigation via `RolesMasterPage`'s "Chi tiết" links). */
function renderPageWithNav(initialRoleCode: string, otherRoleCode: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(initialRoleCode)]}>
        <Link to={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(otherRoleCode)}>Sang vai trò khác</Link>
        <Routes>
          <Route path={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL()} element={<RoleDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Like `renderPageWithNav`, but with links BOTH ways so a test can navigate A -> B -> A. */
function renderPageWithBidirectionalNav(roleCodeA: string, roleCodeB: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(roleCodeA)]}>
        <Link to={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(roleCodeB)}>Sang B</Link>
        <Link to={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(roleCodeA)}>Sang A</Link>
        <Routes>
          <Route path={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL()} element={<RoleDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function checkbox(name: string): HTMLInputElement {
  return screen.getByRole('checkbox', { name });
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name });
}

async function chooseReason(actor: ReturnType<typeof userEvent.setup>) {
  const combo = screen.getByRole('combobox', { name: 'Lý do' });
  await actor.click(combo);
  // Scoped to the open dialog -- a previously-chosen reason still shows as the trigger's
  // current-value text on screen, which would otherwise collide with the dropdown's own
  // option text (ambiguous `screen.findByText`) when choosing a reason a second time.
  const dialog = await screen.findByRole('dialog');
  await actor.click(within(dialog).getByText('RC-ROLE-PERMISSION-UPDATE - Cập nhật quyền vai trò'));
}

beforeEach(() => {
  toastError.mockClear();
  toastSuccess.mockClear();
});
afterEach(() => cleanup());

describe('RoleDetailPage (RA-04) — catalog-loading race (Review Finding, verification)', () => {
  it('still initializes correct baseline/pending grants when the role resolves before the permission catalog', async () => {
    const fake = new FakeRepository();
    let resolveCatalog: (value: Permission[]) => void = () => {};
    fake.listAllPermissions = vi.fn(
      () => new Promise<Permission[]>((resolve) => { resolveCatalog = resolve; }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    // Role resolves; catalog is still pending (matrix.rows/objectTypes empty, but grants
    // is built from role.permissions, independent of the catalog — see BuildPermissionMatrix.ts).
    await screen.findByText('Inventory Lead');
    // Catalog arrives late.
    resolveCatalog(CATALOG);
    await screen.findByRole('checkbox', { name: 'SKU Xem' });

    const readSku = checkbox('SKU Xem');
    expect(readSku.checked).toBe(true); // customRole's baseline grant (Read:SKU) survived the race
  });
});

describe('RoleDetailPage (RA-04)', () => {
  it('fetches the role by roleCode directly (works on a fresh URL, not just navigation state)', async () => {
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    expect(await screen.findByText('Inventory Lead')).toBeTruthy();
    expect(fake.getRole).toHaveBeenCalledWith('INVENTORY_LEAD');
  });

  it('renders N/A for a catalog-absent cell and a plain checked cell for a granted one', async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    await screen.findByText('Inventory Lead');
    // DeleteCancel:SKU is not in the catalog fixture -> N/A.
    expect(screen.getByLabelText('SKU Xóa/Hủy không áp dụng')).toBeTruthy();
    expect(checkbox('SKU Xem').checked).toBe(true);
  });

  it('auto-ticks and locks Read when a sibling action is granted', async () => {
    const actor = userEvent.setup();
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));

    expect(checkbox('SKU Xem').checked).toBe(true);
    expect(checkbox('SKU Xem').disabled).toBe(true);
  });

  it('rider-locks Update:Role even though it is currently granted on the system role', async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage('WMS_ADMIN');

    await screen.findByText('WMS Admin');
    expect(checkbox('Vai trò Cập nhật').checked).toBe(true);
    expect(checkbox('Vai trò Cập nhật').disabled).toBe(true);
  });

  it('baseline-locks a granted, non-rider cell on a system role, but a newly ticked cell in this session stays untickable-free', async () => {
    const actor = userEvent.setup();
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage('WMS_ADMIN');

    await screen.findByText('WMS Admin');
    expect(checkbox('SKU Cập nhật').checked).toBe(true);
    expect(checkbox('SKU Cập nhật').disabled).toBe(true); // baseline-granted on a system role -> add-only

    expect(checkbox('SKU Tạo mới').disabled).toBe(false);
    await actor.click(checkbox('SKU Tạo mới'));
    expect(checkbox('SKU Tạo mới').checked).toBe(true);
    expect(checkbox('SKU Tạo mới').disabled).toBe(false); // newly granted this session, not baseline -> still editable
    await actor.click(checkbox('SKU Tạo mới'));
    expect(checkbox('SKU Tạo mới').checked).toBe(false);
  });

  it('bulk row toggle only affects editable cells for that object', async () => {
    const actor = userEvent.setup();
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage('WMS_ADMIN');

    await screen.findByText('WMS Admin');
    const skuRow = checkbox('SKU Tạo mới').closest('tr') as HTMLElement;
    await actor.click(within(skuRow).getByRole('button', { name: 'Tất cả' }));

    expect(checkbox('SKU Tạo mới').checked).toBe(true);
    // Already-locked cells are untouched by bulk (still locked, not toggled off).
    expect(checkbox('SKU Cập nhật').disabled).toBe(true);
  });

  it('Save sends the FULL currently-ticked set (not a diff), including auto-ticked Read', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    await screen.findByText('Inventory Lead');
    await actor.click(screen.getByRole('checkbox', { name: 'SKU Cập nhật' }));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(fake.setRolePermissions).toHaveBeenCalledTimes(1);
    const [id, input] = fake.setRolePermissions.mock.calls[0];
    expect(id).toBe('role-custom');
    expect(input.reasonCode).toBe('RC-ROLE-PERMISSION-UPDATE');
    expect(input.version).toBe(0); // customRole's permissionsVersion (RA-04 review, Decision #1)
    expect(input.permissions).toHaveLength(2);
    expect(input.permissions).toEqual(
      expect.arrayContaining([
        { action: 'Read', objectType: 'SKU' },
        { action: 'Update', objectType: 'SKU' },
      ]),
    );
  });

  it('reconciles local state from the save response (server-side Read auto-add wins)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.setRolePermissions = vi.fn(() =>
      Promise.resolve({
        permissions: [
          { action: 'Read', objectType: 'SKU' },
          { action: 'Update', objectType: 'SKU' },
          { action: 'Read', objectType: 'Owner' },
        ],
        version: 1,
      }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    await screen.findByText('Inventory Lead');
    await actor.click(screen.getByRole('checkbox', { name: 'SKU Cập nhật' }));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(toastSuccess).toHaveBeenCalledWith('Đã lưu thay đổi quyền');
    const readOwner = await screen.findByRole('checkbox', { name: 'Chủ hàng Xem' });
    expect((readOwner as HTMLInputElement).checked).toBe(true);
  });

  it('surfaces a 400 (N/A/rider/add-only) inline, not as a toast', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.setRolePermissions = vi.fn(() =>
      Promise.reject(new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Cặp quyền không hợp lệ' })),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    await screen.findByText('Inventory Lead');
    await actor.click(screen.getByRole('checkbox', { name: 'SKU Cập nhật' }));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(await screen.findByText('Cặp quyền không hợp lệ')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('surfaces a 409 (stale version) inline with a reload action, not as a toast (RA-04 review, Decision #1)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.setRolePermissions = vi.fn(() =>
      Promise.reject(
        new ApiError({
          status: 409,
          code: 'CONFLICT',
          message: 'Role permissions changed since this page was loaded. Reload and reapply your changes.',
        }),
      ),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    await screen.findByText('Inventory Lead');
    await actor.click(screen.getByRole('checkbox', { name: 'SKU Cập nhật' }));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(
      await screen.findByText('Role permissions changed since this page was loaded. Reload and reapply your changes.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tải lại trang' })).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows "Khôi phục về mặc định" only for a system role', async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');
    await screen.findByText('Inventory Lead');
    expect(screen.queryByRole('button', { name: 'Khôi phục về mặc định' })).toBeNull();
    cleanup();

    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage('WMS_ADMIN');
    await screen.findByText('WMS Admin');
    expect(screen.getByRole('button', { name: 'Khôi phục về mặc định' })).toBeTruthy();
  });

  it('Reset calls resetRolePermissions after confirmation', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage('WMS_ADMIN');

    await screen.findByText('WMS Admin');
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Khôi phục về mặc định' }));

    expect(fake.resetRolePermissions).toHaveBeenCalledWith(
      'role-admin',
      expect.objectContaining({ reasonCode: 'RC-ROLE-PERMISSION-UPDATE' }),
    );
    vi.restoreAllMocks();
  });
});

describe('RoleDetailPage (RA-04) — re-review 2026-07-16', () => {
  it('sends the FRESH version from the last Save response on an immediate second Save, not the stale initial one', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.setRolePermissions = vi.fn(() =>
      Promise.resolve({ permissions: [{ action: 'Read', objectType: 'SKU' }], version: 7 }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage('INVENTORY_LEAD');

    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(fake.setRolePermissions).toHaveBeenCalledTimes(1);
    expect(fake.setRolePermissions.mock.calls[0][1].version).toBe(0); // customRole's initial permissionsVersion

    // Immediate second edit + Save, before any query refetch could possibly land.
    await actor.click(checkbox('SKU Tạo mới'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(fake.setRolePermissions).toHaveBeenCalledTimes(2);
    expect(fake.setRolePermissions.mock.calls[1][1].version).toBe(7); // from the FIRST response, not stale 0
  });

  it('ignores a Save that resolves for a DIFFERENT role after navigating away (no stale reconcile/error leak)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let resolveSave: (value: { permissions: { action: string; objectType: string }[]; version: number }) => void =
      () => {};
    fake.setRolePermissions = vi.fn(
      () =>
        new Promise<{ permissions: { action: string; objectType: string }[]; version: number }>((resolve) => {
          resolveSave = resolve;
        }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPageWithNav('INVENTORY_LEAD', 'WMS_ADMIN');

    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(fake.setRolePermissions).toHaveBeenCalledTimes(1);

    // Navigate to a different role WHILE the Save above is still in flight.
    await actor.click(screen.getByRole('link', { name: 'Sang vai trò khác' }));
    await screen.findByText('WMS Admin');

    // The stale Save now resolves -- must not touch WMS_ADMIN's displayed state.
    resolveSave({ permissions: [{ action: 'Update', objectType: 'SKU' }], version: 99 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // WMS_ADMIN's own real baseline (Update:Role granted) must still show, untouched by the
    // stale INVENTORY_LEAD reconcile overwriting pendingGrants/baselineGrants with keys that
    // don't even match WMS_ADMIN's matrix (matrixCellKey embeds roleCode) -- so a leaked
    // reconcile would make every WMS_ADMIN cell look unchecked instead of its true baseline.
    expect(checkbox('Vai trò Cập nhật').checked).toBe(true);
  });
});

describe('RoleDetailPage (RA-04) — re-review of post-merge fixes 2026-07-16', () => {
  it("keeps a role's Save result across navigation even before its query cache has refetched (return-to-role race)", async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.setRolePermissions = vi.fn(() =>
      Promise.resolve({
        permissions: [
          { action: 'Read', objectType: 'SKU' },
          { action: 'Update', objectType: 'SKU' },
        ],
        version: 5,
      }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPageWithBidirectionalNav('INVENTORY_LEAD', 'WMS_ADMIN');

    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(fake.setRolePermissions).toHaveBeenCalledTimes(1);

    // Navigate away and back -- FakeRepository.getRole keeps returning the ORIGINAL fixture
    // (permissionsVersion: 0, no Update:SKU) every time, simulating a query cache that never
    // caught up with the Save that just happened (e.g. the invalidated GET hasn't resolved yet).
    await actor.click(screen.getByRole('link', { name: 'Sang B' }));
    await screen.findByText('WMS Admin');
    await actor.click(screen.getByRole('link', { name: 'Sang A' }));
    await screen.findByText('Inventory Lead');

    // The Save's real result (Update:SKU granted) must still show, not the stale pre-Save fixture.
    expect(checkbox('SKU Cập nhật').checked).toBe(true);

    // A follow-up Save must use the cached fresh version (5), not the stale fixture's (0).
    await actor.click(checkbox('SKU Tạo mới'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(fake.setRolePermissions).toHaveBeenCalledTimes(2);
    expect(fake.setRolePermissions.mock.calls[1][1].version).toBe(5);
  });
});

describe('RoleDetailPage (RA-04) — final re-review 2026-07-16', () => {
  it("reconciles Role A's own Save result even when Role B's Save starts before A settles (mutate() per-call callback overwrite, TanStack Query)", async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    const resolvers = new Map<
      string,
      (value: { permissions: { action: string; objectType: string }[]; version: number }) => void
    >();
    fake.setRolePermissions = vi.fn(
      (id: string) =>
        new Promise<{ permissions: { action: string; objectType: string }[]; version: number }>((resolve) => {
          resolvers.set(id, resolve);
        }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPageWithBidirectionalNav('INVENTORY_LEAD', 'WMS_ADMIN');

    // Start Save on Role A (customRole, id 'role-custom') -- leave it pending.
    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(fake.setRolePermissions).toHaveBeenCalledTimes(1);

    // Navigate to Role B WHILE A is still pending, then ALSO start a Save on B (id
    // 'role-admin') before A settles -- both now share the SAME underlying mutation object.
    await actor.click(screen.getByRole('link', { name: 'Sang B' }));
    await screen.findByText('WMS Admin');
    await actor.click(checkbox('SKU Tạo mới')); // Create:SKU -- not in wmsAdmin's baseline, editable
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(fake.setRolePermissions).toHaveBeenCalledTimes(2);

    // Resolve A's Save AFTER B's was already started (realistic -- network order isn't call order).
    resolvers.get('role-custom')!({
      permissions: [
        { action: 'Read', objectType: 'SKU' },
        { action: 'Update', objectType: 'SKU' },
      ],
      version: 9,
    });
    resolvers.get('role-admin')!({
      permissions: [
        { action: 'Read', objectType: 'SKU' },
        { action: 'Update', objectType: 'SKU' },
        { action: 'Read', objectType: 'Role' },
        { action: 'Update', objectType: 'Role' },
        { action: 'Create', objectType: 'SKU' },
      ],
      version: 3,
    });

    // Navigate back to Role A -- its OWN Save result must have been reconciled (cached), not
    // silently dropped because Role B's later mutate() call reused the same mutation object.
    await actor.click(screen.getByRole('link', { name: 'Sang A' }));
    await screen.findByText('Inventory Lead');
    expect(checkbox('SKU Cập nhật').checked).toBe(true);
  });
});

describe('RoleDetailPage (RA-04) — re-review after final fixes 2026-07-16', () => {
  it("keeps Role A's own pending state visible (Reset disabled by isPending, not isDirty) when returning to A while its Save is still in flight, even after Role B's Save has since become the mutation cache's latest entry", async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    const resolvers = new Map<
      string,
      (value: { permissions: { action: string; objectType: string }[]; version: number }) => void
    >();
    fake.setRolePermissions = vi.fn(
      (id: string) =>
        new Promise<{ permissions: { action: string; objectType: string }[]; version: number }>((resolve) => {
          resolvers.set(id, resolve);
        }),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPageWithBidirectionalNav('WMS_ADMIN', 'INVENTORY_LEAD');

    // Start Save on Role A (WMS_ADMIN, a system role -- has a Reset button) -- leave it pending.
    await screen.findByText('WMS Admin');
    await actor.click(checkbox('SKU Tạo mới'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(fake.setRolePermissions).toHaveBeenCalledTimes(1);

    // Navigate to Role B and also start a Save there -- this becomes the mutation cache's
    // LATEST entry (by submittedAt) across ALL roles, but must not affect A's own pending state.
    await actor.click(screen.getByRole('link', { name: 'Sang B' }));
    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(fake.setRolePermissions).toHaveBeenCalledTimes(2);

    // Return to A WHILE its own Save is still genuinely pending. Reset is disabled only by
    // `!reasonCode || isPending` (never `isDirty`), which isolates whether `isPending` is scoped
    // to THIS role rather than reflecting whichever role's mutate() call ran last.
    await actor.click(screen.getByRole('link', { name: 'Sang A' }));
    await screen.findByText('WMS Admin');
    expect(button('Khôi phục về mặc định').disabled).toBe(true);

    resolvers.get('role-admin')!({ permissions: [], version: 1 });
    resolvers.get('role-custom')!({ permissions: [], version: 1 });
  });

  it("keeps Role A's own Save failure visible (inline error) when returning to A, even after Role B's Save has since succeeded and become the mutation cache's latest entry", async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.setRolePermissions = vi.fn((id: string) => {
      if (id === 'role-custom') {
        return Promise.reject(
          new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Cặp quyền A không hợp lệ' }),
        );
      }
      return Promise.resolve({ permissions: [], version: 1 });
    });
    repo.current = fake as unknown as IAccessControlRepository;
    renderPageWithBidirectionalNav('INVENTORY_LEAD', 'WMS_ADMIN');

    // Role A (INVENTORY_LEAD) Saves and fails right away.
    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Cặp quyền A không hợp lệ')).toBeTruthy();

    // Navigate to Role B and Save it successfully -- this becomes the mutation cache's LATEST
    // entry across ALL roles.
    await actor.click(screen.getByRole('link', { name: 'Sang B' }));
    await screen.findByText('WMS Admin');
    await actor.click(checkbox('SKU Tạo mới'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Đã lưu thay đổi quyền'));

    // Return to A -- its OWN earlier failure must still be visible, not hidden by B's later
    // success becoming the shared observer's "current" mutation.
    await actor.click(screen.getByRole('link', { name: 'Sang A' }));
    await screen.findByText('Inventory Lead');
    expect(await screen.findByText('Cặp quyền A không hợp lệ')).toBeTruthy();
  });

  it("keeps a role's Save result after this page fully unmounts and remounts through a shared QueryClient (e.g. via the roles list), not just across in-app navigation between two roles", async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.setRolePermissions = vi.fn(() =>
      Promise.resolve({
        permissions: [
          { action: 'Read', objectType: 'SKU' },
          { action: 'Update', objectType: 'SKU' },
        ],
        version: 5,
      }),
    );
    repo.current = fake as unknown as IAccessControlRepository;

    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const renderInventoryLead = () =>
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL('INVENTORY_LEAD')]}>
            <Routes>
              <Route path={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL()} element={<RoleDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

    const first = renderInventoryLead();
    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Đã lưu thay đổi quyền'));
    first.unmount(); // simulate leaving this page entirely (e.g. back to the roles list)

    renderInventoryLead(); // fresh mount of the SAME role, reusing the SAME QueryClient
    await screen.findByText('Inventory Lead');
    expect(checkbox('SKU Cập nhật').checked).toBe(true); // must still reflect the earlier Save
  });
});

describe('RoleDetailPage (RA-04) — Review Findings, final verification 2026-07-16', () => {
  it("derives isPending from ANY still-pending mutation for this role, not just whichever one was submitted last", async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL('INVENTORY_LEAD')]}>
          <Routes>
            <Route path={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL()} element={<RoleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('Inventory Lead');

    // Seed the mutation cache directly with 2 invocations for this role -- a disabled Save
    // button legitimately can't be double-clicked in a real browser, so this is the only way to
    // reliably construct "a newer invocation settles while an older one is still pending" and
    // test the DERIVATION logic itself, independent of whether the UI can currently reach it.
    let resolveOlder: (() => void) | undefined;
    const olderMutation = client.getMutationCache().build(client, {
      mutationKey: ROLE_PERMISSIONS_MUTATION_KEYS.set,
      mutationFn: (_vars: { id: string; roleCode: string; input: unknown }) =>
        new Promise<{ permissions: { action: string; objectType: string }[]; version: number }>((resolve) => {
          resolveOlder = () => resolve({ permissions: [], version: 1 });
        }),
    });
    const olderExecution = olderMutation.execute({ id: 'role-custom', roleCode: 'INVENTORY_LEAD', input: {} });
    await waitFor(() => expect(olderMutation.state.status).toBe('pending'));

    const newerMutation = client.getMutationCache().build(client, {
      mutationKey: ROLE_PERMISSIONS_MUTATION_KEYS.set,
      mutationFn: (_vars: { id: string; roleCode: string; input: unknown }) =>
        Promise.resolve({ permissions: [], version: 2 }),
    });
    await newerMutation.execute({ id: 'role-custom', roleCode: 'INVENTORY_LEAD', input: {} });
    // Let React finish re-rendering from the newer mutation's cache update before asserting the
    // STEADY-STATE value below -- `waitFor`'s own first synchronous check can otherwise pass on a
    // transient pre-render DOM snapshot that happens to still show the disabled state left over
    // from BEFORE the newer mutation settled, masking a real regression here.
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The NEWER (later-submitted) invocation already succeeded, but the OLDER one for this SAME
    // role is still genuinely pending -- the editor must stay disabled, not re-enable just
    // because whichever invocation started last has settled.
    expect(checkbox('SKU Cập nhật').disabled).toBe(true);

    resolveOlder!();
    await olderExecution;
  });

  it("never regresses the role-detail cache when a Save/Reset response arrives after a background GET refetch has already gone stale", async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.setRolePermissions = vi.fn(() =>
      Promise.resolve({
        permissions: [
          { action: 'Read', objectType: 'SKU' },
          { action: 'Update', objectType: 'SKU' },
        ],
        version: 5,
      }),
    );
    repo.current = fake as unknown as IAccessControlRepository;

    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const renderInventoryLead = () =>
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL('INVENTORY_LEAD')]}>
            <Routes>
              <Route path={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL()} element={<RoleDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

    const first = renderInventoryLead();
    await screen.findByText('Inventory Lead');
    await actor.click(checkbox('SKU Cập nhật'));
    await chooseReason(actor);
    await actor.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Đã lưu thay đổi quyền'));
    first.unmount();

    // The 2nd mount's own GET resolves LATE and with STALE data (as if it had been in flight
    // since before the Save above committed) -- it must not be allowed to regress the CACHE
    // that the Save's response already patched to the fresher version. Note: the 2nd mount's
    // OWN on-screen checkbox stays correct either way, because its init effect already ran off
    // the cache-hit (fresh) data before the stale GET resolved, and `loadedRoleId` then blocks
    // re-initializing for the same `role.id` — that guard is unrelated to this fix. The
    // regression only becomes OBSERVABLE on a 3rd, later mount that initializes fresh from
    // whatever the cache now actually holds, which is why this test needs three mounts.
    let resolveStaleGet: (() => void) | undefined;
    fake.getRole = vi.fn(
      (roleCode: string) =>
        new Promise((resolve, reject) => {
          resolveStaleGet = () => {
            const role = fake.roles.find((item) => item.roleCode === roleCode);
            if (!role) reject(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'not found' }));
            else resolve(role); // customRole fixture -- permissionsVersion: 0, no Update:SKU
          };
        }),
    );

    const second = renderInventoryLead();
    // The cache-hit render (React Query serves the cached, patched data synchronously before
    // the new GET resolves) must already show the Save's result, not a loading/blank state.
    await screen.findByText('Inventory Lead');
    expect(checkbox('SKU Cập nhật').checked).toBe(true);

    resolveStaleGet!();
    // Let the stale GET's promise resolve and flow through React Query before moving on.
    await new Promise((resolve) => setTimeout(resolve, 50));
    second.unmount();

    // Restore a normal (immediate, correct) getRole for the 3rd mount, matching the CURRENT
    // real database state -- what matters here is what the 3rd mount reads from the CACHE on
    // init, before this new GET could possibly resolve.
    fake.getRole = new FakeRepository().getRole;
    renderInventoryLead();
    await screen.findByText('Inventory Lead');
    // If the stale GET above was allowed to regress the cache, this fresh mount would initialize
    // from that stale data (unchecked) instead of the Save's real result (checked).
    expect(checkbox('SKU Cập nhật').checked).toBe(true);
  });
});
