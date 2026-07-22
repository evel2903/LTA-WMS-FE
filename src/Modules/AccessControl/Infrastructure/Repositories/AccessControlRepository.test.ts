import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { AccessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepository';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  public get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    return Promise.resolve({
      Items: [],
      Meta: { Page: 1, PageSize: 50, TotalItems: 0, TotalPages: 1 },
    } as T);
  }

  public post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve({} as T);
  }

  public put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({} as T);
  }

  public patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({} as T);
  }

  public delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

function roleDto(roleCode: string) {
  return {
    Id: `role-${roleCode}`,
    RoleCode: roleCode,
    RoleName: roleCode,
    Description: null,
    IsSystem: false,
    Status: 'ACTIVE',
    PermissionsVersion: 0,
    UpdatedAt: '2026-07-22T06:00:00.123Z',
  };
}

describe('AccessControlRepository', () => {
  it('PATCHes role metadata with ExpectedUpdatedAt and maps the authoritative response token', async () => {
    class RolePatchHttpClient extends FakeHttpClient {
      public override patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
        this.calls.push({ method: 'patch', url, body, config });
        return Promise.resolve({
          ...roleDto('CUSTOM_ROLE'),
          RoleName: 'Updated role',
          UpdatedAt: '2026-07-22T06:00:00.124Z',
        } as T);
      }
    }
    const http = new RolePatchHttpClient();
    const repository = new AccessControlRepository(http);

    const result = await repository.updateRole('role-1', {
      expectedUpdatedAt: '2026-07-22T06:00:00.123Z',
      roleName: 'Updated role',
    });

    expect(http.calls).toEqual([{
      method: 'patch',
      url: '/access-control/roles/role-1',
      body: { ExpectedUpdatedAt: '2026-07-22T06:00:00.123Z', RoleName: 'Updated role' },
      config: undefined,
    }]);
    expect(result).toMatchObject({ roleName: 'Updated role', updatedAt: '2026-07-22T06:00:00.124Z' });
  });

  it('preserves the lower-camel permission response contract without promoting metadata tokens', async () => {
    class PermissionWriteHttpClient extends FakeHttpClient {
      public override put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
        this.calls.push({ method: 'put', url, body, config });
        return Promise.resolve({
          permissions: [{ action: 'Read', objectType: 'SKU' }],
          version: 3,
          updatedAt: '2026-07-22T06:00:00.125Z',
        } as T);
      }
    }
    const repository = new AccessControlRepository(new PermissionWriteHttpClient());
    const result = await repository.setRolePermissions('role-1', {
      permissions: [{ action: 'Read', objectType: 'SKU' }],
      version: 2,
      reasonCode: 'RC-ROLE-PERMISSION-UPDATE',
    });
    expect(result).toMatchObject({ version: 3 });
    expect(result).not.toHaveProperty('updatedAt');
  });

  it('normalizes user list paging to the V1 guardrail', async () => {
    const http = new FakeHttpClient();
    const repository = new AccessControlRepository(http);
    await repository.listUsers({ page: 0, pageSize: 500 });
    await repository.listUsers({ page: -2, pageSize: -10 });
    await repository.listUsers();
    expect(http.calls[0]?.config).toEqual({ params: { Page: 1, PageSize: 100 } });
    expect(http.calls[1]?.config).toEqual({ params: { Page: 1, PageSize: 50 } });
    expect(http.calls[2]?.config).toEqual({ params: { Page: 1, PageSize: 50 } });
  });
});
