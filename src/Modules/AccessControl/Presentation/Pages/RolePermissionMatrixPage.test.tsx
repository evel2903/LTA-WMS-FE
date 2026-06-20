// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import type { Permission, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';

const repo = vi.hoisted(() => ({ current: null as unknown as IAccessControlRepository }));
vi.mock('@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance', () => ({
  get accessControlRepository() {
    return repo.current;
  },
}));
vi.mock('@shared/Components/Ui/Sonner', () => ({ toast: { error: vi.fn() } }));

import { RolePermissionMatrixPage } from '@modules/AccessControl/Presentation/Pages/RolePermissionMatrixPage';
import { useAccessControlStore } from '@modules/AccessControl/Application/Stores/AccessControlStore';

const perm = (action: string, objectType: string): Permission => ({
  id: `${action}-${objectType}`,
  permissionCode: `${objectType}.${action}`,
  action,
  objectType,
  description: null,
});

class FakeRepository implements Partial<IAccessControlRepository> {
  listAllPermissions = vi.fn(() => Promise.resolve([perm('Read', 'SKU'), perm('Create', 'SKU')]));
  getRole = vi.fn(
    (roleCode: RoleCode): Promise<RoleDetail> =>
      Promise.resolve({
        roleCode,
        roleName: roleCode,
        description: null,
        isSystem: true,
        status: 'ACTIVE',
        // Only WMS_ADMIN holds the Create SKU permission in this fixture.
        permissions:
          roleCode === 'WMS_ADMIN' ? [perm('Read', 'SKU'), perm('Create', 'SKU')] : [perm('Read', 'SKU')],
      }),
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RolePermissionMatrixPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAccessControlStore.setState({ selectedUserId: null, objectTypeFilter: 'ALL', page: 1 });
});
afterEach(() => cleanup());

describe('RolePermissionMatrixPage (C10 AC1 / AC3)', () => {
  it('renders the matrix with a granted cell for the role that holds the permission', async () => {
    repo.current = new FakeRepository() as unknown as IAccessControlRepository;
    renderPage();

    // A (object, action) row from the catalog renders…
    expect(await screen.findByText('Create')).toBeTruthy();
    // …and WMS Admin's Create-SKU cell is granted while QC's is not.
    expect(screen.getByLabelText('WMS Admin có quyền Create SKU')).toBeTruthy();
    expect(screen.getByLabelText('QC không có quyền Create SKU')).toBeTruthy();
  });

  it('shows a permission-denied state when the permission catalog 403s (AC3)', async () => {
    const fake = new FakeRepository();
    fake.listAllPermissions = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IAccessControlRepository;
    renderPage();

    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
  });
});
