import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { PartnerRepository } from '@modules/PartnerMaster/Infrastructure/Repositories/PartnerRepository';

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
    return Promise.resolve({ Id: 'partner-new', ...(body as object) } as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({ Id: 'partner-updated', ...(body as object) } as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({ Id: 'partner-updated', ...(body as object) } as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('PartnerRepository', () => {
  it('uses root partner endpoints without a hard-coded /api/v1 prefix', async () => {
    const http = new FakeHttpClient();
    const repository = new PartnerRepository(http);

    await repository.list({ partnerType: 'Supplier' });
    await repository.getById('partner-1');
    await repository.resolveByReference({
      partnerType: 'Supplier',
      sourceSystem: 'SAP',
      externalReference: 'SAP-SUP-001',
    });
    await repository.create({
      partnerCode: 'SUP-001',
      partnerName: 'Acme Supplier',
      partnerType: 'Supplier',
      status: 'Active',
      sourceSystem: 'SAP',
      externalReference: 'SAP-SUP-001',
    });
    await repository.update('partner-1', { partnerName: 'Acme Updated' });
    await repository.deactivate('partner-1', { reasonCode: 'RC-V1-CANCEL' });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/partners'],
      ['get', '/partners/partner-1'],
      ['get', '/partners/resolve'],
      ['post', '/partners'],
      ['patch', '/partners/partner-1'],
      ['patch', '/partners/partner-1/deactivate'],
    ]);
  });

  it('sends only whitelisted filters and enforces V1 page-size guardrail', async () => {
    const http = new FakeHttpClient();
    const repository = new PartnerRepository(http);

    await repository.list({
      page: 2,
      pageSize: 500,
      partnerType: 'Carrier',
      status: 'Active',
      partnerCode: 'CAR',
      partnerName: 'Fast',
      externalReference: 'TMS-CAR-001',
    });

    expect(http.calls[0]?.config).toEqual({
      params: {
        Page: 2,
        PageSize: 100,
        PartnerType: 'Carrier',
        Status: 'Active',
        PartnerCode: 'CAR',
        PartnerName: 'Fast',
        ExternalReference: 'TMS-CAR-001',
      },
    });

    await repository.list();
    expect(http.calls[1]?.config).toEqual({ params: { Page: 1, PageSize: 50 } });
  });

  it('builds PascalCase mutation and resolve payloads', async () => {
    const http = new FakeHttpClient();
    const repository = new PartnerRepository(http);

    await repository.create({
      partnerCode: 'CUS-001',
      partnerName: 'Retail Customer',
      partnerType: 'Customer',
      status: 'Active',
      sourceSystem: 'OMS',
      externalReference: 'OMS-CUS-001',
      referenceText: 'Customer import key',
    });
    await repository.update('partner-1', { status: 'Inactive', externalReference: 'OMS-CUS-002' });
    await repository.deactivate('partner-1', { reasonCode: 'RC-V1-CANCEL' });
    await repository.resolveByReference({
      partnerType: 'Customer',
      sourceSystem: 'OMS',
      externalReference: 'OMS-CUS-002',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/partners',
      body: {
        PartnerCode: 'CUS-001',
        PartnerName: 'Retail Customer',
        PartnerType: 'Customer',
        Status: 'Active',
        SourceSystem: 'OMS',
        ExternalReference: 'OMS-CUS-001',
        ReferenceText: 'Customer import key',
      },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'patch',
      url: '/partners/partner-1',
      body: { Status: 'Inactive', ExternalReference: 'OMS-CUS-002' },
    });
    expect(http.calls[2]).toMatchObject({
      method: 'patch',
      url: '/partners/partner-1/deactivate',
      body: { ReasonCode: 'RC-V1-CANCEL' },
    });
    expect(http.calls[3]).toMatchObject({
      method: 'get',
      url: '/partners/resolve',
      config: {
        params: {
          PartnerType: 'Customer',
          SourceSystem: 'OMS',
          ExternalReference: 'OMS-CUS-002',
        },
      },
    });
  });
});
