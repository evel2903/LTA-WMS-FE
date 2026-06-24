import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { AccessControlRepository } from '@modules/AccessControl/Infrastructure/Repositories/AccessControlRepository';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    return Promise.resolve({
      Items: [],
      Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 },
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

describe('AccessControlRepository', () => {
  it('normalizes user list paging to the V1 guardrail', async () => {
    const http = new FakeHttpClient();
    const repository = new AccessControlRepository(http);

    await repository.listUsers({ page: 0, pageSize: 500 });
    await repository.listUsers({ page: -2, pageSize: -10 });
    await repository.listUsers();

    expect(http.calls[0]?.config).toEqual({ params: { Page: 1, PageSize: 100 } });
    expect(http.calls[1]?.config).toEqual({ params: { Page: 1, PageSize: 100 } });
    expect(http.calls[2]?.config).toEqual({ params: { Page: 1, PageSize: 100 } });
  });
});
