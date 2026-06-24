// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import type {
  EffectivePermissions,
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

/** Fake whose per-user roles/scopes mutate, so invalidated queries observe the change. */
class FakeRepository implements Partial<IAccessControlRepository> {
  roles: RoleCode[] = [];
  scopes: UserDataScope[] = [];
  listUsers = vi.fn(() => Promise.resolve(page([user])));
  getUserEffectivePermissions = vi.fn(
    (userId: string): Promise<EffectivePermissions> =>
      Promise.resolve({ userId, roles: [...this.roles], permissions: [] }),
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
}

function renderPage(initialPath = ROUTES.FOUNDATION.ACCESS.USERS) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
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
}

beforeEach(() => {
  useAccessControlStore.setState({ selectedUserId: null, objectTypeFilter: 'ALL', page: 1 });
  toastError.mockClear();
});
afterEach(() => cleanup());

describe('UsersAssignmentsPage (C10 AC5 / AC3)', () => {
  it('assigns a role and re-reads the user effective permissions (AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await actor.click(await screen.findByText('Alice Nguyen'));
    await actor.click(await screen.findByRole('link', { name: 'Edit assignments' }));
    expect(await screen.findByText('Chưa gán role nào.')).toBeTruthy();

    await actor.click(screen.getByRole('button', { name: 'Gán role' }));

    // The default selection is the first available core role (WMS Admin). After the
    // mutation invalidates the effective query, the panel re-reads and shows it.
    expect(await screen.findByText('WMS Admin')).toBeTruthy();
    expect(fake.assignRole).toHaveBeenCalledWith('u1', { roleCode: 'WMS_ADMIN' });
  });

  it('assigns a data scope and re-reads the user data scopes (AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await actor.click(await screen.findByText('Alice Nguyen'));
    await actor.click(await screen.findByRole('link', { name: 'Edit assignments' }));
    expect(await screen.findByText('Chưa gán data scope nào.')).toBeTruthy();

    // IncludeAll satisfies the XOR validation without a value (default scopeType = WAREHOUSE).
    await actor.click(await screen.findByLabelText(/IncludeAll/i));
    await actor.click(screen.getByRole('button', { name: 'Gán scope' }));

    // After invalidate→refetch the new scope renders in the panel as a removable row
    // ("Gỡ" only appears for a listed scope; "Tất cả" is its includeAll value label).
    expect(await screen.findByRole('button', { name: 'Gỡ' })).toBeTruthy();
    expect(await screen.findByText('Tất cả')).toBeTruthy();
    expect(fake.assignDataScope).toHaveBeenCalled();
  });

  it('shows a permission-denied detail state when effective-permissions 403s (AC3)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.getUserEffectivePermissions = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await actor.click(await screen.findByText('Alice Nguyen'));
    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
  });

  it('surfaces a 409 data-scope conflict inline, not as a toast (AC4)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.assignDataScope = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 409, code: 'CONFLICT', message: 'User already has this data scope' }),
      ),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    await actor.click(await screen.findByText('Alice Nguyen'));
    await actor.click(await screen.findByRole('link', { name: 'Edit assignments' }));
    // IncludeAll satisfies the XOR validation without a value.
    await actor.click(await screen.findByLabelText(/IncludeAll/i));
    await actor.click(screen.getByRole('button', { name: 'Gán scope' }));

    expect(await screen.findByText('User already has this data scope')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });
});
