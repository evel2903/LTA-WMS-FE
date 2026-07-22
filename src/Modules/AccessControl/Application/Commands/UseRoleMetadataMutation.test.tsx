// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import {
  useAllRoles,
  useRoleDetail,
  useRoles,
} from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import type { Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';

const repo = vi.hoisted(() => ({ current: null as unknown as IAccessControlRepository }));
vi.mock('@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance', () => ({
  get accessControlRepository() {
    return repo.current;
  },
}));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { success: vi.fn(), error: toastError } }));

import { useAccessControlMutations } from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';

const original: RoleDetail = {
  id: 'role-1',
  roleCode: 'CUSTOM_ROLE',
  roleName: 'Original',
  description: null,
  isSystem: false,
  status: 'ACTIVE',
  permissionsVersion: 2,
  updatedAt: '2026-07-22T06:00:00.123Z',
  permissions: [],
};

const updated: Role = {
  ...original,
  roleName: 'Updated',
  updatedAt: '2026-07-22T06:00:00.124Z',
};

function setup(fake: Partial<IAccessControlRepository>) {
  repo.current = fake as IAccessControlRepository;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(accessControlQueryKeys.roleDetail(original.roleCode), original);
  client.setQueryData<Role[]>(accessControlQueryKeys.allRoles(), [original]);
  client.setQueryData<PaginatedResponse<Role>>(accessControlQueryKeys.roles(), {
    items: [original],
    page: 1,
    pageSize: 50,
    totalItems: 1,
    totalPages: 1,
  });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const hook = renderHook(() => useAccessControlMutations(), { wrapper });
  return { client, hook, wrapper };
}

describe('role metadata mutation', () => {
  it('patches detail and catalog caches with the exact authoritative response token', async () => {
    const updateRole = vi.fn(() => Promise.resolve(updated));
    const { client, hook } = setup({ updateRole });
    const mutation = hook.result.current as typeof hook.result.current & {
      updateRole: {
        mutateAsync: (variables: {
          id: string;
          roleCode: string;
          input: { expectedUpdatedAt: string; roleName: string };
        }) => Promise<Role>;
      };
    };

    await act(async () => {
      await mutation.updateRole.mutateAsync({
        id: original.id,
        roleCode: original.roleCode,
        input: { expectedUpdatedAt: original.updatedAt, roleName: 'Updated' },
      });
    });

    expect(updateRole).toHaveBeenCalledTimes(1);
    expect(client.getQueryData<RoleDetail>(accessControlQueryKeys.roleDetail(original.roleCode))).toEqual({
      ...original,
      ...updated,
    });
    expect(client.getQueryData<Role[]>(accessControlQueryKeys.allRoles())).toEqual([updated]);
    expect(client.getQueryData<PaginatedResponse<Role>>(accessControlQueryKeys.roles())?.items).toEqual([updated]);
  });

  it('on ROLE_METADATA_STALE refetches once, preserves the rejected draft outside cache, and never retries', async () => {
    const current: RoleDetail = {
      ...original,
      roleName: 'Changed elsewhere',
      updatedAt: '2026-07-22T06:00:00.125Z',
    };
    const updateRole = vi.fn(() =>
      Promise.reject(
        new ApiError({
          status: 409,
          code: 'CONFLICT',
          message: 'Stale',
          details: { Reason: 'ROLE_METADATA_STALE', CurrentUpdatedAt: current.updatedAt },
        }),
      ),
    );
    const getRole = vi.fn(() => Promise.resolve(current));
    const { client, hook } = setup({ updateRole, getRole });
    const mutation = hook.result.current as typeof hook.result.current & {
      updateRole: {
        mutateAsync: (variables: {
          id: string;
          roleCode: string;
          input: { expectedUpdatedAt: string; roleName: string };
        }) => Promise<Role>;
      };
    };

    await act(async () => {
      await expect(
        mutation.updateRole.mutateAsync({
          id: original.id,
          roleCode: original.roleCode,
          input: { expectedUpdatedAt: original.updatedAt, roleName: 'My unsaved draft' },
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    expect(updateRole).toHaveBeenCalledTimes(1);
    expect(getRole).toHaveBeenCalledTimes(1);
    expect(client.getQueryData<RoleDetail>(accessControlQueryKeys.roleDetail(original.roleCode))).toEqual(current);
  });

  it('does not let an older in-flight GET roll back a newer metadata token already in cache', async () => {
    const newer: RoleDetail = {
      ...original,
      roleName: 'Newer cached role',
      updatedAt: '2026-07-22T06:00:00.130Z',
    };
    const getRole = vi.fn(() => Promise.resolve(original));
    const { client, wrapper } = setup({ getRole });
    client.setQueryData(accessControlQueryKeys.roleDetail(original.roleCode), newer);

    const query = renderHook(() => useRoleDetail(original.roleCode), { wrapper });

    await waitFor(() => expect(getRole).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(query.result.current.isFetching).toBe(false));
    expect(query.result.current.data).toEqual(newer);
    expect(client.getQueryData(accessControlQueryKeys.roleDetail(original.roleCode))).toEqual(newer);
  });

  it('fences late paginated/full-catalog GETs and restores a PATCH-confirmed role missing from allRoles', async () => {
    let resolvePage!: (value: PaginatedResponse<Role>) => void;
    let resolveCatalog!: (value: Role[]) => void;
    const listRoles = vi.fn(
      () => new Promise<PaginatedResponse<Role>>((resolve) => { resolvePage = resolve; }),
    );
    const listAllRoles = vi.fn(() => new Promise<Role[]>((resolve) => { resolveCatalog = resolve; }));
    const updateRole = vi.fn(() => Promise.resolve(updated));
    const { client, hook, wrapper } = setup({ listRoles, listAllRoles, updateRole });
    client.setQueryData<Role[]>(accessControlQueryKeys.allRoles(), []);

    const pageQuery = renderHook(() => useRoles(), { wrapper });
    const catalogQuery = renderHook(() => useAllRoles(), { wrapper });
    await waitFor(() => expect(listRoles).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listAllRoles).toHaveBeenCalledTimes(1));

    await act(async () => {
      await hook.result.current.updateRole.mutateAsync({
        id: original.id,
        roleCode: original.roleCode,
        input: { expectedUpdatedAt: original.updatedAt, roleName: updated.roleName },
      });
    });

    resolvePage({ items: [original], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 });
    resolveCatalog([original]);
    await waitFor(() => expect(pageQuery.result.current.isFetching).toBe(false));
    await waitFor(() => expect(catalogQuery.result.current.isFetching).toBe(false));

    expect(client.getQueryData<PaginatedResponse<Role>>(accessControlQueryKeys.roles())?.items).toEqual([updated]);
    expect(client.getQueryData<Role[]>(accessControlQueryKeys.allRoles())).toEqual([updated]);
  });

  it('reconciles metadata and permissions as independent monotonic dimensions', async () => {
    const cachedPermissionFresh: RoleDetail = {
      ...original,
      permissionsVersion: 5,
      permissions: [{
        id: 'permission-1',
        permissionCode: 'SKU.Update',
        action: 'Update',
        objectType: 'SKU',
        description: null,
      }],
    };
    const fetchedMetadataFresh: RoleDetail = {
      ...original,
      roleName: 'Metadata from newer GET',
      permissionsVersion: 4,
      updatedAt: '2026-07-22T06:00:00.124Z',
      permissions: [],
    };
    const getRole = vi.fn(() => Promise.resolve(fetchedMetadataFresh));
    const { client, wrapper } = setup({ getRole });
    client.setQueryData(accessControlQueryKeys.roleDetail(original.roleCode), cachedPermissionFresh);

    const query = renderHook(() => useRoleDetail(original.roleCode), { wrapper });
    await waitFor(() => expect(query.result.current.isFetching).toBe(false));

    expect(query.result.current.data).toEqual({
      ...fetchedMetadataFresh,
      permissionsVersion: 5,
      permissions: cachedPermissionFresh.permissions,
    });
  });

  it('keeps the prior metadata token when a permission-only response carries no metadata provenance', async () => {
    const setRolePermissions = vi.fn(() => Promise.resolve({
      permissions: [{ action: 'Update', objectType: 'SKU' }],
      version: 3,
      updatedAt: '2026-07-22T06:00:00.125Z',
    }));
    const { client, hook } = setup({ setRolePermissions });

    await act(async () => {
      await hook.result.current.setRolePermissions.mutateAsync({
        id: original.id,
        roleCode: original.roleCode,
        input: { permissions: [], version: 2, reasonCode: 'RC-ROLE-PERMISSION-UPDATE' },
      });
    });

    expect(client.getQueryData<RoleDetail>(accessControlQueryKeys.roleDetail(original.roleCode))).toMatchObject({
      permissionsVersion: 3,
      updatedAt: original.updatedAt,
    });
  });

  it('leaves metadata mutation errors to the form instead of duplicating them as a toast', async () => {
    toastError.mockClear();
    const updateRole = vi.fn(() => Promise.reject(
      new ApiError({ status: 500, code: 'UNKNOWN', message: 'Server unavailable' }),
    ));
    const { hook } = setup({ updateRole });

    await act(async () => {
      await expect(hook.result.current.updateRole.mutateAsync({
        id: original.id,
        roleCode: original.roleCode,
        input: { expectedUpdatedAt: original.updatedAt, roleName: 'Draft' },
      })).rejects.toMatchObject({ status: 500 });
    });

    expect(toastError).not.toHaveBeenCalled();
  });
});
