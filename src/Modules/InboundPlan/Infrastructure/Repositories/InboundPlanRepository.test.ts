import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { InboundLineImportPreviewDto } from '@modules/InboundPlan/Infrastructure/Dtos/InboundPlanDtos';
import { InboundPlanRepository } from '@modules/InboundPlan/Infrastructure/Repositories/InboundPlanRepository';

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
    return Promise.resolve({ Id: 'inbound-plan-1', Lines: [], ...(body as object) } as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({ Id: 'inbound-plan-1', ...(body as object) } as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({ Id: 'inbound-plan-1', ...(body as object) } as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('InboundPlanRepository', () => {
  it('uses root inbound-plans endpoints without a hard-coded /api/v1 prefix', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundPlanRepository(http);

    await repository.list({ sourceSystem: 'ERP' });
    await repository.getById('inbound-plan-1');
    await repository.create({
      sourceSystem: 'ERP',
      sourceDocumentType: 'ASN',
      sourceDocumentNumber: 'ASN-10001',
      supplierId: 'supplier-1',
      ownerId: 'owner-1',
      warehouseId: 'warehouse-1',
      warehouseProfileId: 'profile-1',
      lines: [{ lineNumber: 1, skuId: 'sku-1', uomId: 'uom-1', expectedQuantity: 12 }],
    });
    await repository.recordGateIn('inbound-plan-1', {
      gateInAt: '2026-06-22T09:00:00.000Z',
      gateReference: 'GATE-A-001',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/inbound-plans'],
      ['get', '/inbound-plans/inbound-plan-1'],
      ['post', '/inbound-plans'],
      ['post', '/inbound-plans/inbound-plan-1/gate-in'],
    ]);
  });

  it('sends only whitelisted filters and enforces V1 page-size guardrail', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundPlanRepository(http);

    await repository.list({
      page: 2,
      pageSize: 500,
      sourceSystem: 'ERP',
      sourceDocumentNumber: 'ASN-10001',
      ownerId: 'owner-1',
      warehouseId: 'warehouse-1',
      status: 'Planned',
    });

    expect(http.calls[0]?.config).toEqual({
      params: {
        Page: 2,
        PageSize: 100,
        SourceSystem: 'ERP',
        SourceDocumentNumber: 'ASN-10001',
        OwnerId: 'owner-1',
        WarehouseId: 'warehouse-1',
        Status: 'Planned',
      },
    });

    await repository.list();
    expect(http.calls[1]?.config).toEqual({ params: { Page: 1, PageSize: 50 } });
  });

  it('builds PascalCase mutation payloads for create and gate-in', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundPlanRepository(http);

    await repository.create({
      sourceSystem: 'ERP',
      sourceDocumentType: 'ASN',
      sourceDocumentNumber: 'ASN-10001',
      supplierId: 'supplier-1',
      ownerId: 'owner-1',
      warehouseId: 'warehouse-1',
      warehouseProfileId: 'profile-1',
      expectedArrivalAt: '2026-06-22T08:00:00.000Z',
      lines: [
        {
          lineNumber: 1,
          skuId: 'sku-1',
          uomId: 'uom-1',
          expectedQuantity: 12,
          externalLineReference: '10',
        },
      ],
    });
    await repository.recordGateIn('inbound-plan-1', {
      gateInAt: '2026-06-22T09:00:00.000Z',
      gateReference: 'GATE-A-001',
      vehicleNumber: '51C-12345',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/inbound-plans',
    });
    expect(http.calls[0]?.body).toEqual(
      expect.objectContaining({
        SourceDocumentNumber: 'ASN-10001',
        Lines: [expect.objectContaining({ LineNumber: 1, ExpectedQuantity: 12 })],
      }),
    );
    expect(http.calls[1]).toMatchObject({
      method: 'post',
      url: '/inbound-plans/inbound-plan-1/gate-in',
      body: {
        GateInAt: '2026-06-22T09:00:00.000Z',
        GateReference: 'GATE-A-001',
        VehicleNumber: '51C-12345',
      },
    });
  });

  it('IFB-24: update calls PATCH with PascalCase body, confirm/cancel POST to their own endpoints with no body', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundPlanRepository(http);

    await repository.update('inbound-plan-1', {
      sourceSystem: 'ERP',
      sourceDocumentType: 'ASN',
      sourceDocumentNumber: 'ASN-10001',
      supplierId: 'supplier-1',
      ownerId: 'owner-1',
      warehouseId: 'warehouse-1',
      warehouseProfileId: 'profile-1',
      expectedArrivalAt: '2026-07-01T00:00:00.000Z',
      expectedUpdatedAt: '2026-06-22T08:00:00.000Z',
      lines: [{ lineNumber: 1, skuId: 'sku-1', uomId: 'uom-1', expectedQuantity: 99 }],
    });
    await repository.confirm('inbound-plan-1');
    await repository.cancel('inbound-plan-1');

    expect(http.calls[0]).toMatchObject({
      method: 'patch',
      url: '/inbound-plans/inbound-plan-1',
    });
    expect(http.calls[0]?.body).toEqual(
      expect.objectContaining({
        SourceDocumentNumber: 'ASN-10001',
        Lines: [expect.objectContaining({ LineNumber: 1, ExpectedQuantity: 99 })],
      }),
    );
    expect(http.calls[1]).toMatchObject({
      method: 'post',
      url: '/inbound-plans/inbound-plan-1/confirm',
      body: {},
    });
    expect(http.calls[2]).toMatchObject({
      method: 'post',
      url: '/inbound-plans/inbound-plan-1/cancel',
      body: {},
    });
  });
});

describe('InboundPlanRepository line import (IFB-03)', () => {
  class ImportHttpClient implements HttpClient {
    public posts: Array<{ url: string; body: unknown; config?: unknown }> = [];
    public blobUrl: string | null = null;

    private readonly previewDto: InboundLineImportPreviewDto = {
      FileName: 'lines.xlsx',
      Rows: [
        {
          RowNumber: 2,
          SkuCode: 'SKU-1',
          UomCode: 'EA',
          ExpectedQuantity: '12',
          ExternalLineReference: '10',
          SkuId: 'sku-1',
          UomId: 'uom-1',
          Errors: [],
        },
        {
          RowNumber: 3,
          SkuCode: 'SKU-X',
          UomCode: 'EA',
          ExpectedQuantity: '0',
          ExternalLineReference: '',
          Errors: ['SKU không tồn tại.'],
        },
      ],
      Summary: { Total: 2, Valid: 1, Invalid: 1 },
      HeaderError: null,
    };

    get<T>(): Promise<T> {
      return Promise.resolve(undefined as T);
    }

    getBlob(url: string): Promise<Blob> {
      this.blobUrl = url;
      return Promise.resolve(new Blob(['xlsx']));
    }

    post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
      this.posts.push({ url, body, config });
      const params = (config as { params?: Record<string, unknown> } | undefined)?.params ?? {};
      if (params.Preview) return Promise.resolve(this.previewDto as T);
      return Promise.resolve({ Id: 'inbound-plan-9', Lines: [] } as unknown as T);
    }

    put<T>(): Promise<T> {
      return Promise.resolve(undefined as T);
    }

    patch<T>(): Promise<T> {
      return Promise.resolve(undefined as T);
    }

    delete<T>(): Promise<T> {
      return Promise.resolve(undefined as T);
    }
  }

  it('downloads the .xlsx template through the binary getBlob channel', async () => {
    const http = new ImportHttpClient();
    const repository = new InboundPlanRepository(http);

    const blob = await repository.downloadLineImportTemplate();

    expect(http.blobUrl).toBe('/inbound-plans/line-import-template');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('previews an upload as multipart with PascalCase scope params and maps per-row errors', async () => {
    const http = new ImportHttpClient();
    const repository = new InboundPlanRepository(http);
    const file = new File(['x'], 'lines.xlsx');

    const preview = await repository.previewLineImport(file, {
      warehouseId: 'wh-1',
      ownerId: 'owner-1',
    });

    const call = http.posts[0];
    expect(call?.url).toBe('/inbound-plans/import');
    expect(call?.body).toBeInstanceOf(FormData);
    expect((call?.body as FormData).get('file')).toBe(file);
    expect(call?.config).toMatchObject({
      params: { Preview: 'true', WarehouseId: 'wh-1', OwnerId: 'owner-1' },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    expect(preview.summary).toEqual({ total: 2, valid: 1, invalid: 1 });
    expect(preview.rows[1]?.errors).toEqual(['SKU không tồn tại.']);
  });

  it('commits an upload with PascalCase header params and omits undefined optionals', async () => {
    const http = new ImportHttpClient();
    const repository = new InboundPlanRepository(http);
    const file = new File(['x'], 'lines.xlsx');

    await repository.commitLineImport(file, {
      sourceSystem: 'ERP',
      sourceDocumentType: 'ASN',
      sourceDocumentNumber: 'ASN-10001',
      supplierId: 'supplier-1',
      ownerId: 'owner-1',
      warehouseId: 'wh-1',
      warehouseProfileId: null,
      expectedArrivalAt: null,
    });

    const call = http.posts[0];
    expect(call?.url).toBe('/inbound-plans/import');
    expect(call?.config).toMatchObject({
      params: {
        WarehouseId: 'wh-1',
        OwnerId: 'owner-1',
        SourceSystem: 'ERP',
        SourceDocumentType: 'ASN',
        SourceDocumentNumber: 'ASN-10001',
        SupplierId: 'supplier-1',
      },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const params = (call?.config as { params: Record<string, unknown> }).params;
    expect('Preview' in params).toBe(false);
    expect('WarehouseProfileId' in params).toBe(false);
    expect('ExpectedArrivalAt' in params).toBe(false);
  });
});
