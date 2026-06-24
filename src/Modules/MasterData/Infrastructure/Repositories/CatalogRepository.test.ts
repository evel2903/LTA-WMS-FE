import { describe, expect, it } from 'vitest';

import { CatalogRepository } from '@modules/MasterData/Infrastructure/Repositories/CatalogRepository';
import type { HttpClient } from '@shared/Services/Http/ApiClient';

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
    return Promise.resolve({ Id: 'new-id', ...(body as object) } as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({ Id: 'updated-id', ...(body as object) } as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({ Id: 'updated-id', ...(body as object) } as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('CatalogRepository', () => {
  it('hits every catalog list endpoint through HttpClient at root paths', async () => {
    const http = new FakeHttpClient();
    const repository = new CatalogRepository(http);

    await repository.listOwners({ status: 'Active' });
    await repository.listUoms({ status: 'Active' });
    await repository.listSkus({ itemStatus: 'Active' });
    await repository.listSkuBarcodes({ skuId: 'sku-1' });
    await repository.listPackDefinitions({ skuId: 'sku-1' });
    await repository.listUomConversions({ skuId: 'sku-1' });
    await repository.listItemCoverages({ skuId: 'sku-1' });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/owners'],
      ['get', '/uoms'],
      ['get', '/skus'],
      ['get', '/sku-barcodes'],
      ['get', '/pack-definitions'],
      ['get', '/uom-conversions'],
      ['get', '/item-coverages'],
    ]);
  });

  it('builds only the whitelisted SKU list params (no foreign keys leak across endpoints)', async () => {
    const http = new FakeHttpClient();
    const repository = new CatalogRepository(http);

    await repository.listSkus({
      defaultOwnerId: 'owner-1',
      itemStatus: 'Active',
      skuCode: 'SKU-01',
    });

    expect(http.calls[0]?.config).toEqual({
      params: {
        Page: 1,
        PageSize: 50,
        DefaultOwnerId: 'owner-1',
        ItemStatus: 'Active',
        SkuCode: 'SKU-01',
      },
    });
  });

  it('builds owner list params without any SKU-specific keys', async () => {
    const http = new FakeHttpClient();
    const repository = new CatalogRepository(http);

    await repository.listOwners({ ownerCode: 'OWN-01', status: 'Active' });

    expect(http.calls[0]?.config).toEqual({
      params: {
        Page: 1,
        PageSize: 50,
        Status: 'Active',
        OwnerCode: 'OWN-01',
      },
    });
  });

  it('normalizes page and caps catalog list page size at the V1 API guardrail max of 100', async () => {
    const http = new FakeHttpClient();
    const repository = new CatalogRepository(http);

    await repository.listOwners({ page: -2, pageSize: 500 });
    await repository.listOwners({ page: 0, pageSize: 0 });

    expect(http.calls[0]?.config).toEqual({
      params: {
        Page: 1,
        PageSize: 100,
        Status: undefined,
        OwnerCode: undefined,
        OwnerName: undefined,
      },
    });
    expect(http.calls[1]?.config).toEqual({
      params: {
        Page: 1,
        PageSize: 50,
        Status: undefined,
        OwnerCode: undefined,
        OwnerName: undefined,
      },
    });
  });

  it('sends PascalCase create/update payloads to the backend', async () => {
    const http = new FakeHttpClient();
    const repository = new CatalogRepository(http);

    await repository.createOwner({ ownerCode: 'OWN-01', ownerName: 'Acme', status: 'Active' });
    await repository.updateUom('uom-1', { uomName: 'Each (updated)', status: 'Inactive' });
    await repository.createSku({
      skuCode: 'SKU-01',
      skuName: 'Widget',
      itemClass: 'Standard',
      itemStatus: 'Active',
      baseUomId: 'uom-1',
      inventoryUomId: 'uom-1',
    });
    await repository.createPackDefinition({
      skuId: 'sku-1',
      packCode: 'CASE',
      packName: 'Case',
      uomId: 'uom-2',
      quantityPerPack: 12,
      status: 'Active',
      reasonCode: 'RELATION_CREATE',
    });
    await repository.updateSkuBarcode('bc-1', {
      barcodeType: 'QR',
      effectiveFrom: '2026-06-21',
      effectiveTo: null,
      reasonCode: 'RELATION_EDIT',
    });
    await repository.updateUomConversion('conv-1', { factor: 24, reasonCode: 'RELATION_EDIT' });
    await repository.updateItemCoverage('cov-1', { maxQty: 250 });
    await repository.updatePackDefinition('pack-1', {
      packName: 'Case updated',
      reasonCode: 'RELATION_EDIT',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/owners',
      body: { OwnerCode: 'OWN-01', OwnerName: 'Acme', Status: 'Active' },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'patch',
      url: '/uoms/uom-1',
      body: { UomName: 'Each (updated)', Status: 'Inactive' },
    });
    expect(http.calls[2]).toMatchObject({
      method: 'post',
      url: '/skus',
      body: {
        SkuCode: 'SKU-01',
        SkuName: 'Widget',
        ItemClass: 'Standard',
        ItemStatus: 'Active',
        BaseUomId: 'uom-1',
        InventoryUomId: 'uom-1',
      },
    });
    expect(http.calls[3]).toMatchObject({
      method: 'post',
      url: '/pack-definitions',
      body: {
        SkuId: 'sku-1',
        PackCode: 'CASE',
        PackName: 'Case',
        UomId: 'uom-2',
        QuantityPerPack: 12,
        Status: 'Active',
        ReasonCode: 'RELATION_CREATE',
      },
    });
    expect(http.calls[4]).toMatchObject({
      method: 'patch',
      url: '/sku-barcodes/bc-1',
      body: {
        BarcodeType: 'QR',
        EffectiveFrom: '2026-06-21',
        EffectiveTo: null,
        ReasonCode: 'RELATION_EDIT',
      },
    });
    expect(http.calls[5]).toMatchObject({
      method: 'patch',
      url: '/uom-conversions/conv-1',
      body: { Factor: 24, ReasonCode: 'RELATION_EDIT' },
    });
    expect(http.calls[6]).toMatchObject({
      method: 'patch',
      url: '/item-coverages/cov-1',
      body: { MaxQty: 250 },
    });
    expect(http.calls[7]).toMatchObject({
      method: 'patch',
      url: '/pack-definitions/pack-1',
      body: { PackName: 'Case updated', ReasonCode: 'RELATION_EDIT' },
    });
  });

  it('returns an empty page when the backend responds with a null list payload', async () => {
    class NullListHttpClient extends FakeHttpClient {
      override get<T>(url: string, config?: unknown): Promise<T> {
        this.calls.push({ method: 'get', url, config });
        return Promise.resolve(null as T);
      }
    }

    const repository = new CatalogRepository(new NullListHttpClient());
    await expect(repository.listOwners()).resolves.toMatchObject({ items: [], totalItems: 0 });
  });
});
