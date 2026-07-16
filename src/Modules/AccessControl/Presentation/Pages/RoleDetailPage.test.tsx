// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
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

function checkbox(name: string): HTMLInputElement {
  return screen.getByRole('checkbox', { name });
}

async function chooseReason(actor: ReturnType<typeof userEvent.setup>) {
  const combo = screen.getByRole('combobox', { name: 'Lý do' });
  await actor.click(combo);
  await actor.click(await screen.findByText('RC-ROLE-PERMISSION-UPDATE - Cập nhật quyền vai trò'));
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
