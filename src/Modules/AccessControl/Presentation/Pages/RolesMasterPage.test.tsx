// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import type { Permission, Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { CreateRoleInput } from '@modules/AccessControl/Domain/Types/AccessControlTypes';

const repo = vi.hoisted(() => ({ current: null as unknown as IAccessControlRepository }));
vi.mock('@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance', () => ({
  get accessControlRepository() {
    return repo.current;
  },
}));
const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { error: toastError, success: toastSuccess } }));
// RoleDetailPage (RA-04) renders ReasonCodeSelect — mock its query hook so the real repository
// singleton (which reads import.meta.env at module-eval time) never gets constructed.
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: () => ({
    options: [{ value: 'RC-ROLE-PERMISSION-UPDATE', label: 'RC-ROLE-PERMISSION-UPDATE - Cập nhật quyền vai trò' }],
    isLoading: false,
    isError: false,
  }),
}));

import { RolesMasterPage } from '@modules/AccessControl/Presentation/Pages/RolesMasterPage';
import { RoleDetailPage } from '@modules/AccessControl/Presentation/Pages/RoleDetailPage';
import { useAccessControlStore } from '@modules/AccessControl/Application/Stores/AccessControlStore';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

const wmsAdmin: Role = {
  id: 'role-admin',
  roleCode: 'WMS_ADMIN',
  roleName: 'WMS Admin',
  description: null,
  isSystem: true,
  status: 'ACTIVE',
  permissionsVersion: 0,
};

const customRole: Role = {
  id: 'role-custom',
  roleCode: 'INVENTORY_LEAD',
  roleName: 'Inventory Lead',
  description: null,
  isSystem: false,
  status: 'ACTIVE',
  permissionsVersion: 0,
};

const detail = (role: Role, permissionCount: number): RoleDetail => ({
  ...role,
  permissions: Array.from({ length: permissionCount }, (_, index) => ({
    id: `${role.roleCode}-p${index}`,
    permissionCode: `Read:Item${index}`,
    action: 'Read',
    objectType: `Item${index}`,
    description: null,
  })),
});

class FakeRepository implements Partial<IAccessControlRepository> {
  roles: Role[] = [wmsAdmin, customRole];
  listRoles = vi.fn(() => Promise.resolve(page(this.roles)));
  getRole = vi.fn((roleCode: string) => {
    const role = this.roles.find((item) => item.roleCode === roleCode);
    if (!role) return Promise.reject(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'not found' }));
    return Promise.resolve(detail(role, role.roleCode === 'WMS_ADMIN' ? 5 : 2));
  });
  createRole = vi.fn((input: CreateRoleInput) => {
    const created: Role = {
      id: `role-${this.roles.length + 1}`,
      roleCode: input.roleCode,
      roleName: input.roleName,
      description: input.description ?? null,
      isSystem: false,
      status: 'ACTIVE',
      permissionsVersion: 0,
    };
    this.roles = [...this.roles, created];
    return Promise.resolve(created);
  });
  listAllPermissions = vi.fn(() => Promise.resolve<Permission[]>([]));
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ROUTES.FOUNDATION.ACCESS.ROLES]}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.ACCESS.ROLES} element={<RolesMasterPage />} />
          <Route path={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL()} element={<RoleDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAccessControlStore.setState({ rolesPage: 1 });
  toastError.mockClear();
  toastSuccess.mockClear();
});
afterEach(() => cleanup());

describe('RolesMasterPage (RA-03)', () => {
  it('lists roles from the API with type/status/permission count columns', async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage();

    expect(await screen.findByText('WMS Admin')).toBeTruthy();
    expect(screen.getByText('WMS_ADMIN')).toBeTruthy();
    expect(screen.getByText('Hệ thống')).toBeTruthy();
    expect(screen.getByText('Tuỳ chỉnh')).toBeTruthy();
    // Permission counts come from useRoleDetails, populated after the detail fetches resolve.
    expect(await screen.findByText('5')).toBeTruthy();
    expect(await screen.findByText('2')).toBeTruthy();
  });

  it('shows an empty state with no roles', async () => {
    const fake = new FakeRepository();
    fake.roles = [];
    fake.listRoles = vi.fn(() => Promise.resolve(page([])));
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    expect(await screen.findByText('Chưa có vai trò.')).toBeTruthy();
  });

  it('creates a role via the modal and refetches the list (AC2)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findByText('WMS Admin');
    await actor.click(screen.getByRole('button', { name: 'Tạo vai trò' }));
    await actor.type(screen.getByLabelText('Mã vai trò'), 'QC_LEAD');
    await actor.type(screen.getByLabelText('Tên vai trò'), 'QC Lead');
    await actor.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo vai trò' }));

    expect(fake.createRole).toHaveBeenCalledWith({
      roleCode: 'QC_LEAD',
      roleName: 'QC Lead',
      description: undefined,
    });
    // Modal closes on success.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toastSuccess).toHaveBeenCalledWith('Đã tạo vai trò');
  });

  it('surfaces a 409 conflict inline, not as a toast, and keeps the modal open', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.createRole = vi.fn(() =>
      Promise.reject(new ApiError({ status: 409, code: 'CONFLICT', message: 'Mã vai trò đã tồn tại' })),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findByText('WMS Admin');
    await actor.click(screen.getByRole('button', { name: 'Tạo vai trò' }));
    await actor.type(screen.getByLabelText('Mã vai trò'), 'WMS_ADMIN');
    await actor.type(screen.getByLabelText('Tên vai trò'), 'Dup');
    await actor.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo vai trò' }));

    expect(await screen.findByText('Mã vai trò đã tồn tại')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('surfaces any HTTP 400 inline, not as a toast, even for BUSINESS_RULE codes (AC2)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    // Real BE role_code format check throws BusinessRuleException, not a VALIDATION 400.
    fake.createRole = vi.fn(() =>
      Promise.reject(new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'role_code không đúng định dạng' })),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findByText('WMS Admin');
    await actor.click(screen.getByRole('button', { name: 'Tạo vai trò' }));
    await actor.type(screen.getByLabelText('Mã vai trò'), 'bad code');
    await actor.type(screen.getByLabelText('Tên vai trò'), 'Bad');
    await actor.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo vai trò' }));

    expect(await screen.findByText('role_code không đúng định dạng')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('blocks submit and shows an inline error when description exceeds 500 characters', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findByText('WMS Admin');
    await actor.click(screen.getByRole('button', { name: 'Tạo vai trò' }));
    await actor.type(screen.getByLabelText('Mã vai trò'), 'QC_LEAD');
    await actor.type(screen.getByLabelText('Tên vai trò'), 'QC Lead');
    fireEvent.change(screen.getByLabelText('Mô tả'), { target: { value: 'a'.repeat(501) } });
    await actor.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo vai trò' }));

    expect(await screen.findByText('String must contain at most 500 character(s)')).toBeTruthy();
    expect(fake.createRole).not.toHaveBeenCalled();
  });

  it('clears a stale create error when the modal is reopened (AC2 regression)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.createRole = vi.fn(() =>
      Promise.reject(new ApiError({ status: 409, code: 'CONFLICT', message: 'Mã vai trò đã tồn tại' })),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findByText('WMS Admin');
    await actor.click(screen.getByRole('button', { name: 'Tạo vai trò' }));
    await actor.type(screen.getByLabelText('Mã vai trò'), 'WMS_ADMIN');
    await actor.type(screen.getByLabelText('Tên vai trò'), 'Dup');
    await actor.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo vai trò' }));
    expect(await screen.findByText('Mã vai trò đã tồn tại')).toBeTruthy();

    await actor.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await actor.click(screen.getByRole('button', { name: 'Tạo vai trò' }));
    expect(screen.queryByText('Mã vai trò đã tồn tại')).toBeNull();
  });

  it('demotes the create action and closes the modal on 403 (AC2)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.createRole = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findByText('WMS Admin');
    await actor.click(screen.getByRole('button', { name: 'Tạo vai trò' }));
    await actor.type(screen.getByLabelText('Mã vai trò'), 'X');
    await actor.type(screen.getByLabelText('Tên vai trò'), 'X');
    await actor.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo vai trò' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tạo vai trò' })).toBeNull();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('navigates to the role detail editor on "Chi tiết", fetching by role code (not navigation state)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findByText('WMS Admin');
    const [detailLink] = await screen.findAllByRole('link', { name: 'Chi tiết' });
    expect(detailLink.getAttribute('href')).toBe('/foundation/access/roles/WMS_ADMIN');
    await actor.click(detailLink);

    expect(await screen.findByText('Ma trận quyền')).toBeTruthy();
    expect(fake.getRole).toHaveBeenCalledWith('WMS_ADMIN');
  });
});
