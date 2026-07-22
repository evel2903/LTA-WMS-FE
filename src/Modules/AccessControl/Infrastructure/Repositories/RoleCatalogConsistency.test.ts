import { describe, expect, it } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { AccessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepository';

function roleDto(code: string) {
  return {
    Id: `id-${code}`,
    RoleCode: code,
    RoleName: code,
    Description: null,
    IsSystem: false,
    Status: 'ACTIVE',
    PermissionsVersion: 0,
    UpdatedAt: '2026-07-22T00:00:00.000Z',
  };
}

function page(params: {
  page: number;
  items: ReturnType<typeof roleDto>[];
  totalItems: number;
  totalPages: number;
  token: string | null;
}) {
  return {
    Items: params.items,
    Page: params.page,
    PageSize: 100,
    TotalItems: params.totalItems,
    TotalPages: params.totalPages,
    CatalogToken: params.token,
    CrawlShape: { PageSize: 100, Order: 'ROLE_CODE_C_ASC' },
  };
}

class ScriptedHttpClient implements HttpClient {
  public readonly calls: Array<{ url: string; config?: unknown }> = [];

  constructor(private readonly script: unknown[]) {}

  public get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ url, config });
    const next = this.script.shift();
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next as T);
  }

  public post<T>(): Promise<T> { return Promise.resolve(undefined as T); }
  public put<T>(): Promise<T> { return Promise.resolve(undefined as T); }
  public patch<T>(): Promise<T> { return Promise.resolve(undefined as T); }
  public delete<T>(): Promise<T> { return Promise.resolve(undefined as T); }
}

const mismatch = () => new ApiError({
  status: 409,
  code: 'CONFLICT',
  message: 'catalog changed',
  details: { Reason: 'CATALOG_TOKEN_MISMATCH' },
});

describe('RH-05 verified role catalog crawl', () => {
  it('chains the exact signed token and publishes only the fully verified attempt', async () => {
    const http = new ScriptedHttpClient([
      page({ page: 1, items: Array.from({ length: 100 }, (_, i) => roleDto(`AA${String(i).padStart(3, '0')}`)), totalItems: 101, totalPages: 2, token: 'eyJ2IjoxfQ.c2ln' }),
      page({ page: 2, items: [roleDto('B000')], totalItems: 101, totalPages: 2, token: null }),
    ]);

    const roles = await new AccessControlRepository(http).listAllRoles();

    expect(roles).toHaveLength(101);
    expect(http.calls[0]?.config).toEqual({ params: { CompleteCatalog: true, Page: 1, PageSize: 100 } });
    expect(http.calls[1]?.config).toEqual({ params: { CompleteCatalog: true, Page: 2, PageSize: 100, CatalogToken: 'eyJ2IjoxfQ.c2ln' } });
  });

  it('discards a drifted attempt, restarts page one once, and never mixes its pages', async () => {
    const http = new ScriptedHttpClient([
      page({ page: 1, items: Array.from({ length: 100 }, (_, i) => roleDto(`OLD${String(i).padStart(3, '0')}`)), totalItems: 101, totalPages: 2, token: 'eyJ2IjoxfQ.b2xk' }),
      mismatch(),
      page({ page: 1, items: [roleDto('NEW000')], totalItems: 1, totalPages: 1, token: null }),
    ]);

    const roles = await new AccessControlRepository(http).listAllRoles();

    expect(roles.map((role) => role.roleCode)).toEqual(['NEW000']);
    expect(http.calls.filter((call) => (call.config as { params: { Page: number } }).params.Page === 1)).toHaveLength(2);
  });

  it('retries a transient page with the exact same cursor and replaces rather than appends it', async () => {
    const transient = new ApiError({ status: 503, code: 'CATALOG_VERSION_UNAVAILABLE', message: 'retry' });
    const first = page({ page: 1, items: Array.from({ length: 100 }, (_, i) => roleDto(`AA${String(i).padStart(3, '0')}`)), totalItems: 101, totalPages: 2, token: 'eyJ2IjoxfQ.c2FtZQ' });
    const http = new ScriptedHttpClient([
      first,
      transient,
      page({ page: 2, items: [roleDto('B000')], totalItems: 101, totalPages: 2, token: null }),
    ]);

    const roles = await new AccessControlRepository(http).listAllRoles();

    expect(roles).toHaveLength(101);
    expect(http.calls[1]?.config).toEqual(http.calls[2]?.config);
  });

  it('accepts exactly one empty final page', async () => {
    const http = new ScriptedHttpClient([
      page({ page: 1, items: [], totalItems: 0, totalPages: 1, token: null }),
    ]);
    await expect(new AccessControlRepository(http).listAllRoles()).resolves.toEqual([]);
    expect(http.calls).toHaveLength(1);
  });

  it.each([
    ['unsafe totals', { TotalItems: Number.MAX_SAFE_INTEGER + 1 }],
    ['fractional totals', { TotalItems: 1.5 }],
    ['wrong page echo', { Page: 2 }],
    ['wrong page size', { PageSize: 50 }],
    ['wrong crawl order', { CrawlShape: { PageSize: 100, Order: 'ROLE_NAME_ASC' } }],
    ['non-null final token', { CatalogToken: 'unexpected' }],
  ])('fails closed for %s', async (_label, override) => {
    const valid = page({ page: 1, items: [roleDto('AA')], totalItems: 1, totalPages: 1, token: null });
    const http = new ScriptedHttpClient([{ ...valid, ...override }]);
    await expect(new AccessControlRepository(http).listAllRoles()).rejects.toThrow();
  });

  it('rejects missing successor tokens, duplicates, out-of-order roles, and count drift', async () => {
    const firstHundred = Array.from({ length: 100 }, (_, i) => roleDto(`AA${String(i).padStart(3, '0')}`));
    const missingToken = new ScriptedHttpClient([
      page({ page: 1, items: firstHundred, totalItems: 101, totalPages: 2, token: null }),
    ]);
    await expect(new AccessControlRepository(missingToken).listAllRoles()).rejects.toThrow(/successor token/);

    const duplicate = new ScriptedHttpClient([
      page({ page: 1, items: firstHundred, totalItems: 101, totalPages: 2, token: 'eyJ2IjoxfQ.bmV4dA' }),
      page({ page: 2, items: [roleDto('AA099')], totalItems: 101, totalPages: 2, token: null }),
    ]);
    await expect(new AccessControlRepository(duplicate).listAllRoles()).rejects.toThrow(/duplicate/);

    const outOfOrder = new ScriptedHttpClient([
      page({ page: 1, items: [roleDto('BB'), roleDto('AA')], totalItems: 2, totalPages: 1, token: null }),
    ]);
    await expect(new AccessControlRepository(outOfOrder).listAllRoles()).rejects.toThrow(/canonical byte order/);

    const countDrift = new ScriptedHttpClient([
      page({ page: 1, items: [], totalItems: 1, totalPages: 1, token: null }),
    ]);
    await expect(new AccessControlRepository(countDrift).listAllRoles()).rejects.toThrow(/item count/);
  });

  it('bounds restart to one attempt and does not retry non-transient authorization failures', async () => {
    const first = page({
      page: 1,
      items: Array.from({ length: 100 }, (_, i) => roleDto(`AA${String(i).padStart(3, '0')}`)),
      totalItems: 101,
      totalPages: 2,
      token: 'eyJ2IjoxfQ.c3RhcnQ',
    });
    const drift = new ScriptedHttpClient([first, mismatch(), first, mismatch()]);
    await expect(new AccessControlRepository(drift).listAllRoles()).rejects.toMatchObject({
      details: { Reason: 'CATALOG_TOKEN_MISMATCH' },
    });
    expect(drift.calls).toHaveLength(4);

    const forbidden = new ScriptedHttpClient([
      new ApiError({ status: 403, code: 'FORBIDDEN', message: 'forbidden' }),
    ]);
    await expect(new AccessControlRepository(forbidden).listAllRoles()).rejects.toMatchObject({ status: 403 });
    expect(forbidden.calls).toHaveLength(1);
  });

  it.each([
    ['missing role name', { RoleName: undefined }],
    ['blank role name', { RoleName: '   ' }],
    ['invalid role status', { Status: 'DELETED' }],
    ['invalid system marker', { IsSystem: 'false' }],
    ['unsafe permission version', { PermissionsVersion: Number.MAX_SAFE_INTEGER + 1 }],
    ['invalid update timestamp', { UpdatedAt: 'not-a-date' }],
  ])('rejects a catalog item with %s before publication', async (_label, override) => {
    const malformed = { ...roleDto('AA'), ...override };
    const http = new ScriptedHttpClient([
      page({ page: 1, items: [malformed] as never, totalItems: 1, totalPages: 1, token: null }),
    ]);
    await expect(new AccessControlRepository(http).listAllRoles()).rejects.toThrow(/role item/i);
  });

  it.each(['CATALOG_VERSION_EXHAUSTED', 'CATALOG_METADATA_RANGE']) (
    'does not retry deterministic %s failures',
    async (code) => {
      const deterministic = new ApiError({
        status: 503,
        code: code as 'CATALOG_VERSION_EXHAUSTED' | 'CATALOG_METADATA_RANGE',
        message: 'deterministic failure',
      });
      const http = new ScriptedHttpClient([deterministic]);
      await expect(new AccessControlRepository(http).listAllRoles()).rejects.toBe(deterministic);
      expect(http.calls).toHaveLength(1);
    },
  );
});
