import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { OverrideLogRepository } from '@modules/OverrideLog/Infrastructure/Repositories/OverrideLogRepository';

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

describe('OverrideLogRepository', () => {
  it('normalizes override list paging to default 50 and max 100', async () => {
    const http = new FakeHttpClient();
    const repository = new OverrideLogRepository(http);

    await repository.list({ page: 0, pageSize: 0 });
    await repository.list({ page: 2, pageSize: 500 });
    await repository.list({ page: 1.5, pageSize: 50.5 });

    expect(http.calls[0]?.config).toMatchObject({ params: { Page: 1, PageSize: 50 } });
    expect(http.calls[1]?.config).toMatchObject({ params: { Page: 2, PageSize: 100 } });
    expect(http.calls[2]?.config).toMatchObject({ params: { Page: 1, PageSize: 50 } });
  });

  it('encodes override detail ids in endpoint paths', async () => {
    const http = new FakeHttpClient();
    const repository = new OverrideLogRepository(http);

    await repository.getById('override/a?#1');

    expect(http.calls[0]?.url).toBe('/overrides/override%2Fa%3F%231');
  });
});
