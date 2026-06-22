import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { TaskExecutionRepository } from '@modules/TaskExecution/Infrastructure/Repositories/TaskExecutionRepository';

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
    return Promise.resolve({ Id: 'task-a', TaskStatus: 'Claimed', ...(body as object) } as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({ Id: 'task-a', ...(body as object) } as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({ Id: 'task-a', ...(body as object) } as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('TaskExecutionRepository', () => {
  it('uses root mobile task endpoints without a hard-coded /api/v1 prefix', async () => {
    const http = new FakeHttpClient();
    const repository = new TaskExecutionRepository(http);

    await repository.list({ warehouseId: 'warehouse-a' });
    await repository.getById('task-a');
    await repository.claim('task-a', { deviceCode: 'RF-01', sessionId: 'session-1' });
    await repository.release('task-a');

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/mobile/tasks'],
      ['get', '/mobile/tasks/task-a'],
      ['post', '/mobile/tasks/task-a/claim'],
      ['post', '/mobile/tasks/task-a/release'],
    ]);
  });

  it('sends only whitelisted filters and enforces V1 page-size guardrail', async () => {
    const http = new FakeHttpClient();
    const repository = new TaskExecutionRepository(http);

    await repository.list({
      page: 2,
      pageSize: 500,
      warehouseId: 'warehouse-a',
      taskType: 'Putaway',
      taskStatus: 'Released',
    });

    expect(http.calls[0]?.config).toEqual({
      params: {
        Page: 2,
        PageSize: 100,
        WarehouseId: 'warehouse-a',
        TaskType: 'Putaway',
        TaskStatus: 'Released',
      },
    });

    await repository.list();
    expect(http.calls[1]?.config).toEqual({ params: { Page: 1, PageSize: 50 } });
  });

  it('builds PascalCase claim payloads', async () => {
    const http = new FakeHttpClient();
    const repository = new TaskExecutionRepository(http);

    await repository.claim('task-a', { deviceCode: 'RF-01', sessionId: 'session-1' });
    await repository.release('task-a');

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/mobile/tasks/task-a/claim',
      body: { DeviceCode: 'RF-01', SessionId: 'session-1' },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'post',
      url: '/mobile/tasks/task-a/release',
      body: {},
    });
  });
});
