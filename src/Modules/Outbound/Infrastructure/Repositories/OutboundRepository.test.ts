import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { OutboundRepository } from '@modules/Outbound/Infrastructure/Repositories/OutboundRepository';
import type {
  AllocationDto,
  PagedAllocationDto,
  OutboundOrderDto,
  PagedOutboundOrderDto,
  PagedPickReleaseDto,
  PickReleaseDto,
} from '@modules/Outbound/Infrastructure/Dtos/OutboundDtos';

const orderDto: OutboundOrderDto = {
  Id: 'outbound-1',
  OrderNumber: 'OB-001',
  SourceSystem: 'ERP',
  SourceReference: 'SO-001',
  BusinessReference: 'ERP:OUTBOUND:SO-001',
  CustomerId: 'customer-1',
  CustomerSourceSystem: 'ERP',
  CustomerExternalReference: 'ERP-CUS-001',
  CustomerCode: 'CUS-001',
  ShipToReference: null,
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-01',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  Priority: null,
  CutoffAt: null,
  DocumentStatus: 'Validated',
  ValidationErrors: [],
  CoreFlowInstanceId: 'core-flow-1',
  OutboxMessageId: 'outbox-1',
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  IsDuplicate: false,
  Lines: [],
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:00:00.000Z',
};

const allocationDto: AllocationDto = {
  Id: 'allocation-1',
  AllocationNumber: 'AL-001',
  OutboundOrderId: 'outbound-1',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-01',
  Policy: 'PartialBackorder',
  Status: 'Allocated',
  TotalOrderedQuantity: 12,
  TotalAllocatedQuantity: 12,
  TotalBackorderedQuantity: 0,
  ShortageReason: null,
  OutboxMessageId: 'outbox-allocation-1',
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  IsDuplicate: false,
  Lines: [],
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:00:00.000Z',
};

const releaseDto: PickReleaseDto = {
  Id: 'release-1',
  ReleaseNumber: 'REL-001',
  OutboundOrderId: 'outbound-1',
  AllocationId: 'allocation-1',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-01',
  ReleaseMode: 'Batch',
  BatchSize: 50,
  Status: 'Released',
  BlockReason: null,
  TotalTaskCount: 1,
  TotalReleasedQuantity: 12,
  OutboxMessageId: 'outbox-release-1',
  ReasonCode: null,
  ReasonCodeId: null,
  ReasonNote: null,
  EvidenceRefs: [],
  IsDuplicate: false,
  Tasks: [],
  CreatedAt: '2026-06-24T00:00:00.000Z',
  UpdatedAt: '2026-06-24T00:00:00.000Z',
};

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    const page: PagedOutboundOrderDto = {
      Items: [orderDto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    };
    const allocationPage: PagedAllocationDto = {
      Items: [allocationDto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    };
    const releasePage: PagedPickReleaseDto = {
      Items: [releaseDto],
      Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
    };
    if (url.includes('/outbound-orders/releases/')) return Promise.resolve(releaseDto as T);
    if (url.endsWith('/releases')) return Promise.resolve(releasePage as T);
    if (url.includes('/outbound-orders/allocations/')) return Promise.resolve(allocationDto as T);
    if (url.endsWith('/allocations')) return Promise.resolve(allocationPage as T);
    return Promise.resolve((url.includes('/outbound-orders/') ? orderDto : page) as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    if (url.endsWith('/allocate')) return Promise.resolve(allocationDto as T);
    if (url.endsWith('/release')) return Promise.resolve(releaseDto as T);
    return Promise.resolve(orderDto as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve(orderDto as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve(orderDto as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('OutboundRepository', () => {
  it('normalizes list PageSize to default 50 and max 100', async () => {
    const http = new FakeHttpClient();
    const repository = new OutboundRepository(http);

    await repository.list({ page: 0, pageSize: 0 });
    await repository.list({ page: 2, pageSize: 500, documentStatus: 'Held' });

    expect(http.calls[0]).toMatchObject({
      method: 'get',
      url: '/outbound-orders',
      config: { params: { Page: 1, PageSize: 50 } },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'get',
      url: '/outbound-orders',
      config: { params: { Page: 2, PageSize: 100, DocumentStatus: 'Held' } },
    });
  });

  it('uses BE endpoints for import, validate, hold, reject, cancel, allocation and release actions', async () => {
    const http = new FakeHttpClient();
    const repository = new OutboundRepository(http);

    await repository.importOrder({
      sourceSystem: 'ERP',
      sourceReference: 'SO-001',
      customerId: 'customer-1',
      ownerId: 'owner-1',
      warehouseId: 'warehouse-1',
      idempotencyKey: 'import-1',
      lines: [{ lineNumber: 1, skuId: 'sku-1', uomId: 'uom-1', orderedQuantity: 12 }],
    });
    await repository.validate('outbound-1');
    await repository.hold('outbound-1', {
      reasonCode: 'RC-V1-DISCREPANCY',
      idempotencyKey: 'hold-1',
      evidenceRefs: ['validation:1'],
    });
    await repository.reject('outbound-1', {
      reasonCode: 'RC-V1-DISCREPANCY',
      idempotencyKey: 'reject-1',
      evidenceRefs: ['validation:1'],
    });
    await repository.cancel('outbound-1', {
      reasonCode: 'RC-V1-CANCEL',
      idempotencyKey: 'cancel-1',
      evidenceRefs: ['cancel:1'],
    });
    await repository.allocate('outbound-1', {
      policy: 'PartialBackorder',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['shortage:1'],
      idempotencyKey: 'allocate-1',
    });
    await repository.listAllocations('outbound-1', { pageSize: 500, status: 'Allocated' });
    await repository.release('outbound-1', {
      releaseMode: 'Batch',
      batchSize: 50,
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['cutoff:1'],
      idempotencyKey: 'release-1',
    });
    await repository.listReleases('outbound-1', { pageSize: 500, status: 'Released' });
    await repository.getRelease('release-1');

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['post', '/outbound-orders'],
      ['post', '/outbound-orders/outbound-1/validate'],
      ['post', '/outbound-orders/outbound-1/hold'],
      ['post', '/outbound-orders/outbound-1/reject'],
      ['post', '/outbound-orders/outbound-1/cancel'],
      ['post', '/outbound-orders/outbound-1/allocate'],
      ['get', '/outbound-orders/outbound-1/allocations'],
      ['post', '/outbound-orders/outbound-1/release'],
      ['get', '/outbound-orders/outbound-1/releases'],
      ['get', '/outbound-orders/releases/release-1'],
    ]);
    expect(http.calls[0].body).toMatchObject({
      SourceSystem: 'ERP',
      SourceReference: 'SO-001',
      IdempotencyKey: 'import-1',
    });
    expect(http.calls[2].body).toMatchObject({
      ReasonCode: 'RC-V1-DISCREPANCY',
      IdempotencyKey: 'hold-1',
    });
    expect(http.calls[5].body).toMatchObject({
      Policy: 'PartialBackorder',
      ReasonCode: 'RC-V1-DISCREPANCY',
      IdempotencyKey: 'allocate-1',
    });
    expect(http.calls[6].config).toMatchObject({
      params: { Page: 1, PageSize: 100, Status: 'Allocated' },
    });
    expect(http.calls[7].body).toMatchObject({
      ReleaseMode: 'Batch',
      BatchSize: 50,
      ReasonCode: 'RC-V1-DISCREPANCY',
      IdempotencyKey: 'release-1',
    });
    expect(http.calls[8].config).toMatchObject({
      params: { Page: 1, PageSize: 100, Status: 'Released' },
    });
  });
});
