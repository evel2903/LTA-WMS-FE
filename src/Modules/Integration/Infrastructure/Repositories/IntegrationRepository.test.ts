import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { IntegrationRepository } from '@modules/Integration/Infrastructure/Repositories/IntegrationRepository';
import { outboxDto } from '@modules/Integration/Infrastructure/Mappers/IntegrationMapper.test';
import type { PagedOutboxMessageDto } from '@modules/Integration/Infrastructure/Dtos/IntegrationDtos';

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
    return Promise.resolve((url.includes('/dead-letters/outbox-1') ? outboxDto : page) as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
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
});
