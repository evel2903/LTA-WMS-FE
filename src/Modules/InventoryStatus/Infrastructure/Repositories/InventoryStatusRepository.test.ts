import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { InventoryStatusRepository } from '@modules/InventoryStatus/Infrastructure/Repositories/InventoryStatusRepository';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    return Promise.resolve({
      Items: [],
      Meta: { Page: 1, PageSize: 50, TotalItems: 0, TotalPages: 0 },
    } as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve({ Id: 'status-new', ...(body as object) } as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({ Id: 'status-updated', ...(body as object) } as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({ Id: 'status-updated', ...(body as object) } as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('InventoryStatusRepository', () => {
  it('normalizes page and caps pageSize at the V1 API guardrail max of 100', async () => {
    const http = new FakeHttpClient();
    const repository = new InventoryStatusRepository(http);

    await repository.list({ page: -2, pageSize: 500 });
    await repository.list({ page: 0, pageSize: 0 });

    expect(http.calls[0]?.config).toMatchObject({ params: { Page: 1, PageSize: 100 } });
    expect(http.calls[1]?.config).toMatchObject({ params: { Page: 1, PageSize: 50 } });
  });
});
