import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { ApprovalRepository } from '@modules/Approval/Infrastructure/Repositories/ApprovalRepository';

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
    return Promise.resolve({ Id: 'approval-1', ...(body as object) } as T);
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

describe('ApprovalRepository', () => {
  it('normalizes approval list paging to default 20 and max 100', async () => {
    const http = new FakeHttpClient();
    const repository = new ApprovalRepository(http);

    await repository.list({ page: 0, pageSize: 0 });
    await repository.list({ page: -3, pageSize: -10 });
    await repository.list({ page: 2, pageSize: 500 });

    expect(http.calls[0]?.config).toMatchObject({ params: { Page: 1, PageSize: 50 } });
    expect(http.calls[1]?.config).toMatchObject({ params: { Page: 1, PageSize: 50 } });
    expect(http.calls[2]?.config).toMatchObject({ params: { Page: 2, PageSize: 100 } });
  });
});
