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
    await repository.recordScan('task-a', { scanType: 'Item', rawValue: '(01)01234567890128' });
    await repository.release('task-a');
    await repository.confirmPickTask('task-a', {
      mobileTaskId: 'task-a',
      reasonCode: 'RC-V1-DISCREPANCY',
      idempotencyKey: 'pick-confirm-1',
    });
    await repository.reportPickException('task-a', {
      mobileTaskId: 'task-a',
      exceptionType: 'ShortPick',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['scan:1'],
      idempotencyKey: 'pick-exception-1',
    });
    await repository.requestPickSubstitution('task-a', {
      mobileTaskId: 'task-a',
      substituteSkuId: 'sku-sub',
      quantity: 1,
      policyDecision: 'RequireApproval',
      evidenceRefs: ['scan:1'],
      idempotencyKey: 'pick-substitution-1',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/mobile/tasks'],
      ['get', '/mobile/tasks/task-a'],
      ['post', '/mobile/tasks/task-a/claim'],
      ['post', '/mobile/tasks/task-a/scans'],
      ['post', '/mobile/tasks/task-a/release'],
      ['post', '/mobile/tasks/task-a/confirm'],
      ['post', '/mobile/tasks/task-a/exceptions'],
      ['post', '/mobile/tasks/task-a/substitution'],
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

  it('records scan evidence through the mobile task scan endpoint', async () => {
    const http = new FakeHttpClient();
    const repository = new TaskExecutionRepository(http);

    await repository.recordScan('task-a', {
      scanType: 'Item',
      rawValue: '(01)01234567890128(10)LOT-A',
      manualEntry: false,
      deviceCode: 'RF-01',
      sessionId: 'session-1',
      reasonCode: null,
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/mobile/tasks/task-a/scans',
      body: {
        ScanType: 'Item',
        RawValue: '(01)01234567890128(10)LOT-A',
        ManualEntry: false,
        DeviceCode: 'RF-01',
        SessionId: 'session-1',
      },
    });
  });

  it('posts pick confirmation to the mobile task endpoint with PascalCase payload', async () => {
    const http = new FakeHttpClient();
    const repository = new TaskExecutionRepository(http);

    await repository.confirmPickTask('task-a', {
      mobileTaskId: 'task-a',
      reasonCode: 'RC-V1-DISCREPANCY',
      reasonNote: 'RF evidence accepted',
      deviceCode: 'RF-01',
      idempotencyKey: 'pick-confirm-1',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/mobile/tasks/task-a/confirm',
      body: {
        MobileTaskId: 'task-a',
        ReasonCode: 'RC-V1-DISCREPANCY',
        ReasonNote: 'RF evidence accepted',
        DeviceCode: 'RF-01',
        IdempotencyKey: 'pick-confirm-1',
      },
    });
  });

  it('posts pick exception and substitution actions with PascalCase payloads', async () => {
    const http = new FakeHttpClient();
    const repository = new TaskExecutionRepository(http);

    await repository.reportPickException('task-a', {
      mobileTaskId: 'task-a',
      exceptionType: 'NoStock',
      reasonCode: 'RC-V1-DISCREPANCY',
      reasonNote: 'empty pick face',
      evidenceRefs: ['scan:no-stock'],
      observedQuantity: 0,
      replenishmentTargetLocationId: 'loc-pick-face',
      idempotencyKey: 'pick-exception-1',
    });
    await repository.requestPickSubstitution('task-a', {
      mobileTaskId: 'task-a',
      substituteSkuId: 'sku-sub',
      substituteSkuCode: 'SKU-SUB',
      quantity: 1,
      policyDecision: 'RequireApproval',
      policyReason: 'customer allows with approval',
      evidenceRefs: ['scan:no-stock'],
      idempotencyKey: 'pick-substitution-1',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/mobile/tasks/task-a/exceptions',
      body: {
        MobileTaskId: 'task-a',
        ExceptionType: 'NoStock',
        ReasonCode: 'RC-V1-DISCREPANCY',
        ReasonNote: 'empty pick face',
        EvidenceRefs: ['scan:no-stock'],
        ObservedQuantity: 0,
        ReplenishmentTargetLocationId: 'loc-pick-face',
        IdempotencyKey: 'pick-exception-1',
      },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'post',
      url: '/mobile/tasks/task-a/substitution',
      body: {
        MobileTaskId: 'task-a',
        SubstituteSkuId: 'sku-sub',
        SubstituteSkuCode: 'SKU-SUB',
        Quantity: 1,
        PolicyDecision: 'RequireApproval',
        PolicyReason: 'customer allows with approval',
        EvidenceRefs: ['scan:no-stock'],
        IdempotencyKey: 'pick-substitution-1',
      },
    });
  });
});
