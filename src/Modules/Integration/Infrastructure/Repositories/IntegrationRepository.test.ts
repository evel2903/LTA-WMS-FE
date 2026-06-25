import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { IntegrationRepository } from '@modules/Integration/Infrastructure/Repositories/IntegrationRepository';
import {
  outboxDto,
  reconciliationItemDto,
  reconciliationRunDto,
} from '@modules/Integration/Infrastructure/Mappers/IntegrationMapper.test';
import type {
  PagedOutboxMessageDto,
  PagedReconciliationItemDto,
  PagedReconciliationRunDto,
} from '@modules/Integration/Infrastructure/Dtos/IntegrationDtos';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    const page: PagedOutboxMessageDto = {
      Items: [outboxDto],
      Page: 1,
      PageSize: 50,
      TotalItems: 1,
      TotalPages: 1,
    };
    const reconciliationRuns: PagedReconciliationRunDto = {
      Items: [reconciliationRunDto],
      Meta: { Page: 1, PageSize: 100, TotalItems: 1, TotalPages: 1 },
    };
    const reconciliationItems: PagedReconciliationItemDto = {
      Items: [reconciliationItemDto],
      Meta: { Page: 1, PageSize: 100, TotalItems: 1, TotalPages: 1 },
    };
    if (url.includes('/reconciliation/runs/run-1/items')) return Promise.resolve(reconciliationItems as T);
    if (url.includes('/reconciliation/runs/run-1')) return Promise.resolve(reconciliationRunDto as T);
    if (url.includes('/reconciliation/runs')) return Promise.resolve(reconciliationRuns as T);
    return Promise.resolve((url.includes('/dead-letters/outbox-1') ? outboxDto : page) as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    if (url.includes('/reconciliation/items/item-1/resolve')) return Promise.resolve(reconciliationItemDto as T);
    if (url.includes('/reconciliation/runs')) {
      return Promise.resolve({ Run: reconciliationRunDto, Items: [reconciliationItemDto] } as T);
    }
    return Promise.resolve(outboxDto as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve(outboxDto as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve(outboxDto as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('IntegrationRepository', () => {
  it('uses dead-letter endpoints and clamps PageSize to max 100', async () => {
    const http = new FakeHttpClient();
    const repository = new IntegrationRepository(http);

    await repository.listDeadLetters({
      page: 2,
      pageSize: 500,
      status: 'DeadLetter',
      eventType: 'GoodsIssuePosted',
      businessReference: 'SHIP-001',
      warehouseContext: 'WT-01',
      ownerContext: 'OWNER-A',
      updatedFrom: '2026-06-25T00:00:00.000Z',
      updatedTo: '2026-06-25T23:59:59.999Z',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'get',
      url: '/integration/dead-letters',
      config: {
        params: {
          Page: 2,
          PageSize: 100,
          Status: 'DeadLetter',
          EventType: 'GoodsIssuePosted',
          BusinessReference: 'SHIP-001',
          WarehouseContext: 'WT-01',
          OwnerContext: 'OWNER-A',
          UpdatedFrom: '2026-06-25T00:00:00.000Z',
          UpdatedTo: '2026-06-25T23:59:59.999Z',
        },
      },
    });
  });

  it('posts retry, manual fix, ack, ignore and failure payloads with PascalCase contracts', async () => {
    const http = new FakeHttpClient();
    const repository = new IntegrationRepository(http);
    const actionPayload = {
      reasonCode: 'RC-V1-DEAD-LETTER-FIX',
      evidenceRefs: ['ticket:INT-1'],
      idempotencyKey: 'retry-1',
    };

    await repository.getDeadLetter('outbox-1');
    await repository.retryDeadLetter('outbox-1', actionPayload);
    await repository.manualFixDeadLetter('outbox-1', { ...actionPayload, manualFixPayload: { owner: 'OWNER-A' } });
    await repository.acknowledgeDeadLetter('outbox-1', actionPayload);
    await repository.ignoreDeadLetter('outbox-1', actionPayload);
    await repository.recordFailure({
      id: 'outbox-1',
      failureCategory: 'Validation',
      errorMessage: 'Missing owner',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/integration/dead-letters/outbox-1'],
      ['post', '/integration/dead-letters/outbox-1/retry'],
      ['post', '/integration/dead-letters/outbox-1/manual-fix'],
      ['post', '/integration/dead-letters/outbox-1/ack'],
      ['post', '/integration/dead-letters/outbox-1/ignore'],
      ['post', '/integration/events/outbox-1/failures'],
    ]);
    expect(http.calls[1].body).toEqual({
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['ticket:INT-1'],
      IdempotencyKey: 'retry-1',
    });
    expect(http.calls[2].body).toMatchObject({ ManualFixPayload: { owner: 'OWNER-A' } });
    expect(http.calls[5].body).toEqual({ FailureCategory: 'Validation', ErrorMessage: 'Missing owner' });
  });

  it('uses reconciliation endpoints, clamps PageSize and posts reason/evidence/idempotency payloads', async () => {
    const http = new FakeHttpClient();
    const repository = new IntegrationRepository(http);

    await repository.listReconciliationRuns({
      page: 2,
      pageSize: 500,
      businessReference: 'SHIP-001',
      warehouseId: 'WT-01',
      ownerId: 'OWNER-A',
      runStatus: 'CompletedWithMismatch',
    });
    await repository.getReconciliationRun('run-1');
    await repository.listReconciliationItems('run-1', {
      pageSize: 500,
      businessReference: 'SHIP-001',
      warehouseId: 'WT-01',
      ownerId: 'OWNER-A',
      itemStatus: 'Open',
      severity: 'High',
      updatedFrom: '2026-06-25T00:00:00.000Z',
      updatedTo: '2026-06-25T23:59:59.000Z',
    });
    await repository.createReconciliationRun({
      businessReference: 'SHIP-001',
      warehouseId: 'WT-01',
      reasonCode: 'RC-V1-DEAD-LETTER-FIX',
      evidenceRefs: ['ticket:RECON-1'],
      idempotencyKey: 'recon-1',
    });
    await repository.resolveReconciliationItem('item-1', {
      reasonCode: 'RC-V1-DEAD-LETTER-FIX',
      evidenceRefs: ['ticket:RECON-2'],
      idempotencyKey: 'resolve-1',
      resolutionNote: 'External correction confirmed',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/integration/reconciliation/runs'],
      ['get', '/integration/reconciliation/runs/run-1'],
      ['get', '/integration/reconciliation/runs/run-1/items'],
      ['post', '/integration/reconciliation/runs'],
      ['post', '/integration/reconciliation/items/item-1/resolve'],
    ]);
    expect(http.calls[0].config).toMatchObject({
      params: {
        Page: 2,
        PageSize: 100,
        BusinessReference: 'SHIP-001',
        WarehouseId: 'WT-01',
        OwnerId: 'OWNER-A',
        RunStatus: 'CompletedWithMismatch',
      },
    });
    expect(http.calls[2].config).toMatchObject({
      params: {
        Page: 1,
        PageSize: 100,
        BusinessReference: 'SHIP-001',
        WarehouseId: 'WT-01',
        OwnerId: 'OWNER-A',
        ItemStatus: 'Open',
        Severity: 'High',
        UpdatedFrom: '2026-06-25T00:00:00.000Z',
        UpdatedTo: '2026-06-25T23:59:59.000Z',
      },
    });
    expect(http.calls[3].body).toMatchObject({
      BusinessReference: 'SHIP-001',
      WarehouseId: 'WT-01',
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['ticket:RECON-1'],
      IdempotencyKey: 'recon-1',
    });
    expect(http.calls[4].body).toMatchObject({
      ReasonCode: 'RC-V1-DEAD-LETTER-FIX',
      EvidenceRefs: ['ticket:RECON-2'],
      IdempotencyKey: 'resolve-1',
      ResolutionNote: 'External correction confirmed',
    });
  });
});
