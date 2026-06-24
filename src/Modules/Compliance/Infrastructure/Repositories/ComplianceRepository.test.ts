import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { ComplianceRepository } from '@modules/Compliance/Infrastructure/Repositories/ComplianceRepository';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    return Promise.resolve({
      Items: [],
      Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 },
    } as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve({ Id: 'exception-1', ...(body as object) } as T);
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

describe('ComplianceRepository', () => {
  it('normalizes audit and exception list paging to default 20 and max 100', async () => {
    const http = new FakeHttpClient();
    const repository = new ComplianceRepository(http);

    await repository.listAuditLogs({ page: 0, pageSize: 0 });
    await repository.listExceptions({ page: -3, pageSize: -10 });
    await repository.listExceptions({ page: 2, pageSize: 500 });

    expect(http.calls[0]?.config).toMatchObject({ params: { Page: 1, PageSize: 20 } });
    expect(http.calls[1]?.config).toMatchObject({ params: { Page: 1, PageSize: 20 } });
    expect(http.calls[2]?.config).toMatchObject({ params: { Page: 2, PageSize: 100 } });
  });
});
