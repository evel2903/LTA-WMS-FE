// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import type { Permission, Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type {
  CreateRoleInput,
  RoleListFilter,
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
  updatedAt: '2026-07-22T06:00:00.000Z',
};

const customRole: Role = {
  id: 'role-custom',
  roleCode: 'INVENTORY_LEAD',
  roleName: 'Inventory Lead',
  description: null,
  isSystem: false,
  status: 'ACTIVE',
  permissionsVersion: 0,
  updatedAt: '2026-07-22T06:00:00.000Z',
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
  listRoles = vi.fn((filter: RoleListFilter = {}) => {
    const currentPage = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;
    const start = (currentPage - 1) * pageSize;
    return Promise.resolve({
      items: this.roles.slice(start, start + pageSize),
      page: currentPage,
      pageSize,
      totalItems: this.roles.length,
      totalPages: Math.max(1, Math.ceil(this.roles.length / pageSize)),
    });
  });
  listAllRoles = vi.fn(async () => {
    const first = await this.listRoles({ page: 1, pageSize: 100 });
    const roles = [...first.items];
    for (let currentPage = 2; currentPage <= first.totalPages; currentPage += 1) {
      const next = await this.listRoles({ page: currentPage, pageSize: 100 });
      roles.push(...next.items);
    }
    return roles;
  });
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
      updatedAt: '2026-07-22T06:00:00.001Z',
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
  const rendered = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ROUTES.FOUNDATION.ACCESS.ROLES]}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.ACCESS.ROLES} element={<RolesMasterPage />} />
          <Route path={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL()} element={<RoleDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return Object.assign(rendered, { client });
}

async function findDesktopText(text: string) {
  return within(await screen.findByRole('table')).findByText(text);
}

beforeEach(() => {
  useAccessControlStore.setState({ rolesPage: 1 });
  toastError.mockClear();
  toastSuccess.mockClear();
});
afterEach(() => cleanup());

describe('RolesMasterPage (RA-03)', () => {
  it('keeps the role type column display-only and never exposes it as a sort control', async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /Loại/i })).toBeNull();
  });

  it('retains the last verified catalog with an explicit warning after a background refresh fails', async () => {
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    const { client } = renderPage();
    await findDesktopText('WMS Admin');

    fake.listAllRoles.mockRejectedValueOnce(new Error('catalog refresh failed'));
    await client.refetchQueries({ queryKey: accessControlQueryKeys.allRoles() });

    expect(await screen.findByText('Danh mục vai trò chưa được xác nhận lại')).toBeTruthy();
    expect(await findDesktopText('WMS Admin')).toBeTruthy();
  });
  it('lists roles from the API with type/status/permission count columns', async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('WMS Admin')).toBeTruthy();
    expect(within(table).getByText('WMS_ADMIN')).toBeTruthy();
    expect(within(table).getByText('Hệ thống')).toBeTruthy();
    expect(within(table).getByText('Tùy chỉnh')).toBeTruthy();
    // Permission counts come from useRoleDetails, populated after the detail fetches resolve.
    expect(await within(table).findByText('5')).toBeTruthy();
    expect(await within(table).findByText('2')).toBeTruthy();
    expect(screen.getAllByLabelText('Trạng thái: Đang hoạt động').length).toBeGreaterThan(0);
  });

  it('renders each visible role as a responsive mobile row card with its detail action (RA-06 AC5)', async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    const { container } = renderPage();

    await findDesktopText('WMS Admin');
    const mobileRows = container.querySelectorAll('[data-catalog-mobile-row]');
    expect(mobileRows).toHaveLength(2);
    expect(within(mobileRows[0] as HTMLElement).getByText('WMS_ADMIN')).toBeTruthy();
    expect(
      within(mobileRows[0] as HTMLElement).getByRole('link', { name: 'Chi tiết' }).getAttribute('href'),
    ).toBe('/foundation/access/roles/WMS_ADMIN');
  });

  it('shows an empty state with no roles', async () => {
    const fake = new FakeRepository();
    fake.roles = [];
    fake.listRoles = vi.fn(() => Promise.resolve(page([])));
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    expect(await screen.findByText('Chưa có vai trò.')).toBeTruthy();
  });

  it('searches and filters the complete role catalog, including a role outside the first API page (RA-06 AC2/AC7)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.roles = Array.from({ length: 101 }, (_, index) => ({
      ...customRole,
      id: `role-${index + 1}`,
      roleCode: `ROLE_${String(index + 1).padStart(3, '0')}`,
      roleName: index === 100 ? 'Vai trò ngoài trang đầu' : `Vai trò ${index + 1}`,
      status: index === 100 ? 'INACTIVE' : 'ACTIVE',
    }));
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findAllByText('Vai trò 1');
    expect(screen.queryByText('Vai trò ngoài trang đầu')).toBeNull();

    await actor.type(screen.getByLabelText('Tìm'), 'ngoài trang đầu');
    expect((await screen.findAllByText('Vai trò ngoài trang đầu')).length).toBeGreaterThan(0);
    expect(fake.listRoles).toHaveBeenCalledWith({ page: 2, pageSize: 100 });

    await actor.click(screen.getByRole('combobox', { name: 'Trạng thái' }));
    await actor.click(screen.getByRole('option', { name: 'Ngừng hoạt động' }));
    expect(screen.getAllByText('Vai trò ngoài trang đầu').length).toBeGreaterThan(0);

    // Search by roleCode specifically -- "ROLE_050" is not a substring of its own roleName
    // ("Vai trò 50"), so a match here can only come from the roleCode branch of
    // filterRoles's `[role.roleCode, role.roleName].some(...)` check (RA-06 AC7).
    await actor.click(screen.getByRole('combobox', { name: 'Trạng thái' }));
    await actor.click(screen.getByRole('option', { name: 'Tất cả' }));
    await actor.clear(screen.getByLabelText('Tìm'));
    await actor.type(screen.getByLabelText('Tìm'), 'ROLE_050');
    await findDesktopText('Vai trò 50');
    expect(screen.queryByText('Vai trò 51')).toBeNull();
  });

  it('distinguishes an empty catalog from a filter with no matches (RA-06 AC2/AC6)', async () => {
    const actor = userEvent.setup();
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage();

    await findDesktopText('WMS Admin');
    await actor.type(screen.getByLabelText('Tìm'), 'không tồn tại');

    expect(await screen.findByText('Không tìm thấy vai trò phù hợp với bộ lọc hiện tại.')).toBeTruthy();
    expect(screen.queryByText('Chưa có vai trò.')).toBeNull();
  });

  it('cycles stable role-code sorting through ascending, descending, then source order (RA-06 AC3)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    // Source order (GAMMA, ALPHA, BETA) is deliberately distinct from BOTH its ascending
    // (ALPHA, BETA, GAMMA) and descending (GAMMA, BETA, ALPHA) sort — with only two roles,
    // descending and source order coincide, which lets a broken third-click reset (stuck at
    // descending instead of returning to null) pass unnoticed (Review Finding).
    fake.roles = [
      { ...customRole, id: 'role-gamma', roleCode: 'GAMMA', roleName: 'Gamma' },
      { ...customRole, id: 'role-alpha', roleCode: 'ALPHA', roleName: 'Alpha' },
      { ...customRole, id: 'role-beta', roleCode: 'BETA', roleName: 'Beta' },
    ];
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findAllByText('GAMMA');
    const codeOrder = () =>
      within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0]?.textContent);
    const sortButton = screen.getByRole('button', { name: /Mã vai trò/i });

    expect(codeOrder()).toEqual(['GAMMA', 'ALPHA', 'BETA']);
    await actor.click(sortButton);
    expect(codeOrder()).toEqual(['ALPHA', 'BETA', 'GAMMA']);
    await actor.click(sortButton);
    expect(codeOrder()).toEqual(['GAMMA', 'BETA', 'ALPHA']);
    await actor.click(sortButton);
    expect(codeOrder()).toEqual(['GAMMA', 'ALPHA', 'BETA']);
  });

  it('paginates after filtering and only loads role details for visible rows (RA-06 AC4)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.roles = Array.from({ length: 21 }, (_, index) => ({
      ...customRole,
      id: `role-${index + 1}`,
      roleCode: `ROLE_${String(index + 1).padStart(3, '0')}`,
      roleName: `Vai trò ${index + 1}`,
    }));
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await screen.findAllByText('ROLE_001');
    await waitFor(() => expect(fake.getRole).toHaveBeenCalledTimes(20));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(21);

    await actor.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(await screen.findAllByText('ROLE_021')).toHaveLength(2);
    await waitFor(() => expect(fake.getRole).toHaveBeenCalledTimes(21));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2);

    await actor.selectOptions(screen.getByLabelText('Số dòng/trang'), '50');
    expect(await screen.findAllByText('ROLE_001')).toHaveLength(2);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(22);
  });

  it('creates a role via the modal and refetches the list (AC2)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await findDesktopText('WMS Admin');
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

    await findDesktopText('WMS Admin');
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

    await findDesktopText('WMS Admin');
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

    await findDesktopText('WMS Admin');
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

    await findDesktopText('WMS Admin');
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

    await findDesktopText('WMS Admin');
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

    await findDesktopText('WMS Admin');
    const [detailLink] = await screen.findAllByRole('link', { name: 'Chi tiết' });
    expect(detailLink.getAttribute('href')).toBe('/foundation/access/roles/WMS_ADMIN');
    await actor.click(detailLink);

    expect(await screen.findByText('Ma trận quyền')).toBeTruthy();
    expect(fake.getRole).toHaveBeenCalledWith('WMS_ADMIN');
  });

  it("navigates straight to the newly created role's detail page on success, seeding its cache so a stale/failed roles() list refetch never blocks the AC3 create -> detail -> permission chain (Review Finding, round 13)", async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    let resolveGetRoleForNewRole: (() => void) | undefined;
    const originalGetRole = fake.getRole;
    fake.getRole = vi.fn((roleCode: string) => {
      if (roleCode === 'QC_LEAD') {
        return new Promise<RoleDetail>((resolve) => {
          resolveGetRoleForNewRole = () =>
            resolve({
              id: 'role-qc-lead',
              roleCode: 'QC_LEAD',
              roleName: 'QC Lead',
              description: null,
              isSystem: false,
              status: 'ACTIVE',
              permissionsVersion: 0,
              updatedAt: '2026-07-22T06:00:00.001Z',
              permissions: [],
            });
        });
      }
      return originalGetRole(roleCode);
    });
    // The roles() paginated list refetch that create's onSuccess triggers fails outright -- the
    // new role would never appear in the table, so there'd be no "Chi tiết" link to click.
    fake.listRoles = vi
      .fn()
      .mockResolvedValueOnce(page(fake.roles))
      .mockRejectedValue(new Error('network blip'));
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await findDesktopText('WMS Admin');
    await actor.click(screen.getByRole('button', { name: 'Tạo vai trò' }));
    await actor.type(screen.getByLabelText('Mã vai trò'), 'QC_LEAD');
    await actor.type(screen.getByLabelText('Tên vai trò'), 'QC Lead');
    await actor.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tạo vai trò' }));

    // Lands directly on QC_LEAD's OWN detail page -- the matrix renders from the seeded cache
    // immediately, without waiting on the still-pending `getRole('QC_LEAD')` GET, and despite
    // the roles() list refetch having failed.
    expect(await screen.findByText('Ma trận quyền')).toBeTruthy();
    expect(screen.getByText('QC Lead')).toBeTruthy();
    expect(screen.getByText('Mã: QC_LEAD — Tuỳ chỉnh')).toBeTruthy();

    resolveGetRoleForNewRole?.();
  });
});
