import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { AccessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepository';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    return Promise.resolve({
      Items: [],
      Meta: { Page: 1, PageSize: 50, TotalItems: 0, TotalPages: 1 },
    } as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve({} as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({} as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({} as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

class PagedRoleHttpClient extends FakeHttpClient {
  constructor(private readonly pages: Array<{ items: unknown[]; totalPages: number }>) {
    super();
  }

  override get<T>(url: string, config?: { params?: { Page?: number } }): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    const pageNumber = config?.params?.Page ?? 1;
    const page = this.pages[pageNumber - 1] ?? { items: [], totalPages: this.pages.length };
    // Real accumulated count across all pages -- keeps this fixture honest now that
    // `listAllRoles` cross-checks `Meta.TotalItems` against what it actually accumulated.
    const totalItems = this.pages.reduce((sum, p) => sum + p.items.length, 0);
    return Promise.resolve({
      Items: page.items,
      Meta: { Page: pageNumber, PageSize: 100, TotalItems: totalItems, TotalPages: page.totalPages },
    } as T);
  }
}

/** One entry per page, keyed by page number (1-based). Any field left out of an entry falls
 * back to a well-formed default, so each test only needs to override what it's testing. */
class ConfigurableRoleHttpClient extends FakeHttpClient {
  constructor(
    private readonly pages: Array<{
      items?: unknown;
      page?: number;
      totalPages?: unknown;
      totalItems?: unknown;
    }>,
  ) {
    super();
  }

  override get<T>(url: string, config?: { params?: { Page?: number } }): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    const requestedPage = config?.params?.Page ?? 1;
    const entry = this.pages[requestedPage - 1] ?? {};
    return Promise.resolve({
      Items: 'items' in entry ? entry.items : [roleDto(`ROLE_${requestedPage}`)],
      Meta: {
        Page: entry.page ?? requestedPage,
        PageSize: 100,
        TotalItems: 'totalItems' in entry ? entry.totalItems : 0,
        TotalPages: 'totalPages' in entry ? entry.totalPages : this.pages.length,
      },
    } as T);
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
  };
}

describe('AccessControlRepository', () => {
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

  it('listAllRoles pages through the whole role catalog instead of stopping at page 1 (Review Finding)', async () => {
    const http = new PagedRoleHttpClient([
      { items: [roleDto('ROLE_A'), roleDto('ROLE_B')], totalPages: 3 },
      { items: [roleDto('ROLE_C')], totalPages: 3 },
      { items: [roleDto('ROLE_D')], totalPages: 3 },
    ]);
    const repository = new AccessControlRepository(http);

    const roles = await repository.listAllRoles();

    expect(roles.map((role) => role.roleCode)).toEqual(['ROLE_A', 'ROLE_B', 'ROLE_C', 'ROLE_D']);
    expect(http.calls).toHaveLength(3);
    expect(http.calls[0]?.config).toMatchObject({ params: { Page: 1 } });
  });

  it('fails closed instead of silently truncating when TotalPages metadata is missing (Review Finding, re-review round 3)', async () => {
    const http = new ConfigurableRoleHttpClient([{ totalPages: undefined }]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).rejects.toThrow(/TotalPages/);
    expect(http.calls).toHaveLength(1);
  });

  it('fails closed when TotalPages is non-finite or fractional instead of accepting malformed metadata (Review Finding, re-review round 3)', async () => {
    const repositoryInfinite = new AccessControlRepository(
      new ConfigurableRoleHttpClient([{ totalPages: Infinity }]),
    );
    await expect(repositoryInfinite.listAllRoles()).rejects.toThrow(/TotalPages/);

    const repositoryFractional = new AccessControlRepository(
      new ConfigurableRoleHttpClient([{ totalPages: 2.5 }]),
    );
    await expect(repositoryFractional.listAllRoles()).rejects.toThrow(/TotalPages/);
  });

  it('fails closed when Items is missing instead of treating it as an empty/complete page (Review Finding, re-review round 3)', async () => {
    const http = new ConfigurableRoleHttpClient([{ items: undefined, totalPages: 2 }]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).rejects.toThrow(/Items/);
  });

  it('fails closed when the backend echoes a different page than requested (Review Finding, re-review round 3)', async () => {
    const http = new ConfigurableRoleHttpClient([
      { totalPages: 2, totalItems: 2 },
      { page: 1, totalPages: 2 },
    ]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).rejects.toThrow(/echoed page/);
  });

  it('fails closed when an empty page appears before the declared end (Review Finding, re-review round 3)', async () => {
    const http = new ConfigurableRoleHttpClient([
      // TotalItems: 2 -- items ARE expected to exist, so an empty page 2 before the declared
      // end is a real contract violation, not the round-9 "genuinely empty catalog" case.
      { items: [roleDto('ROLE_A')], totalPages: 3, totalItems: 2 },
      { items: [], totalPages: 3 },
    ]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).rejects.toThrow(/empty before the declared end/);
  });

  it('accepts a genuinely empty catalog instead of treating it as an incomplete/malformed response (Review Finding, round 9)', async () => {
    const http = new ConfigurableRoleHttpClient([{ items: [], totalPages: 1, totalItems: 0 }]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).resolves.toEqual([]);
  });

  it('rejects contradictory empty-catalog metadata (TotalItems: 0 with TotalPages > 1) instead of silently returning it as complete (Review Finding, round 10)', async () => {
    const http = new ConfigurableRoleHttpClient([{ items: [], totalPages: 2, totalItems: 0 }]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).rejects.toThrow(/contradictory empty-catalog metadata/);
  });

  it('rejects an implausibly large TotalPages immediately instead of consuming the page bound with a request storm (Review Finding, round 4/5)', async () => {
    const http = new ConfigurableRoleHttpClient([{ totalPages: 999_999 }]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).rejects.toThrow(/exceeds the 1000-page bound/);
    // Fails on the very first response — never issues a second request to find out.
    expect(http.calls).toHaveLength(1);
  });

  it('rejects a duplicate role code across pages instead of silently concatenating overlapping/malformed pages (Review Finding, round 4/5)', async () => {
    const http = new ConfigurableRoleHttpClient([
      { items: [roleDto('ROLE_A'), roleDto('ROLE_B')], totalPages: 2, totalItems: 3 },
      { items: [roleDto('ROLE_A')], totalPages: 2 },
    ]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).rejects.toThrow(/duplicate role code/);
  });

  it('fails closed when TotalItems metadata is malformed instead of accepting it silently (Review Finding, round 6)', async () => {
    const repositoryNegative = new AccessControlRepository(
      new ConfigurableRoleHttpClient([{ totalItems: -1 }]),
    );
    await expect(repositoryNegative.listAllRoles()).rejects.toThrow(/TotalItems/);

    const repositoryFractional = new AccessControlRepository(
      new ConfigurableRoleHttpClient([{ totalItems: 1.5 }]),
    );
    await expect(repositoryFractional.listAllRoles()).rejects.toThrow(/TotalItems/);
  });

  it('rejects a catalog that accumulates fewer unique roles than TotalItems declares instead of returning it as complete (Review Finding, round 6)', async () => {
    const http = new ConfigurableRoleHttpClient([
      { items: [roleDto('ROLE_A'), roleDto('ROLE_B')], totalPages: 1, totalItems: 3 },
    ]);
    const repository = new AccessControlRepository(http);

    await expect(repository.listAllRoles()).rejects.toThrow(/TotalItems/);
  });
});
