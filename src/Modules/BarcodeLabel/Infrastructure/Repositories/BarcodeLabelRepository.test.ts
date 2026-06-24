import { describe, expect, it } from 'vitest';
import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { BarcodeLabelRepository } from '@modules/BarcodeLabel/Infrastructure/Repositories/BarcodeLabelRepository';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    if (url.startsWith('/label-templates/') && url !== '/label-templates') {
      return Promise.resolve({
        Id: 'template-1',
        TemplateCode: 'LPN-STD',
        TemplateName: 'LPN Standard',
        LabelType: 'LPN',
        Status: 'Active',
        RequiredFields: ['BarcodeValue'],
        TemplateBody: '{{BarcodeValue}}',
        ActiveVersionId: 'version-1',
        CreatedAt: '2026-06-22T08:00:00.000Z',
        UpdatedAt: '2026-06-22T08:00:00.000Z',
      } as T);
    }
    if (url.startsWith('/print-jobs/') && url !== '/print-jobs') {
      return Promise.resolve({
        Id: 'job-1',
        TemplateId: 'template-1',
        TemplateVersionId: 'version-1',
        JobCode: 'PJ-001',
        BusinessObjectType: 'LPN',
        BusinessObjectId: 'lpn-1',
        PayloadJson: {},
        PreviewContent: 'preview',
        Status: 'Previewed',
        ValidationErrors: null,
        ReprintCount: 0,
        RequestedAt: '2026-06-22T08:00:00.000Z',
        CreatedAt: '2026-06-22T08:00:00.000Z',
        UpdatedAt: '2026-06-22T08:00:00.000Z',
      } as T);
    }
    return Promise.resolve({
      Items: [],
      Meta: { Page: 1, PageSize: 50, TotalItems: 0, TotalPages: 0 },
    } as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve({
      Id: 'entity-1',
      TemplateId: 'template-1',
      TemplateVersionId: 'version-1',
      JobCode: 'PJ-001',
      BusinessObjectType: 'LPN',
      BusinessObjectId: 'lpn-1',
      PayloadJson: {},
      PreviewContent: 'preview',
      Status: 'Previewed',
      ValidationErrors: null,
      ReprintCount: 0,
      RequestedAt: '2026-06-22T08:00:00.000Z',
      CreatedAt: '2026-06-22T08:00:00.000Z',
      UpdatedAt: '2026-06-22T08:00:00.000Z',
      ...(body as object),
    } as T);
  }

  put<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'put', url, body, config });
    return Promise.resolve({ ...(body as object) } as T);
  }

  patch<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'patch', url, body, config });
    return Promise.resolve({ ...(body as object) } as T);
  }

  delete<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'delete', url, config });
    return Promise.resolve(undefined as T);
  }
}

describe('BarcodeLabelRepository', () => {
  it('uses label and print-job endpoints without hard-coded /api/v1 prefix', async () => {
    const http = new FakeHttpClient();
    const repository = new BarcodeLabelRepository(http);

    await repository.listTemplates();
    await repository.getTemplateById('template-1');
    await repository.createTemplate({
      templateCode: 'LPN-STD',
      templateName: 'LPN Standard',
      labelType: 'LPN',
      requiredFields: ['BarcodeValue'],
      templateBody: '{{BarcodeValue}}',
    });
    await repository.createTemplateVersion('template-1', {
      requiredFields: ['BarcodeValue', 'OwnerCode'],
      templateBody: '{{BarcodeValue}} {{OwnerCode}}',
    });
    await repository.previewPrintJob({
      templateId: 'template-1',
      businessObjectType: 'LPN',
      businessObjectId: 'lpn-1',
      payloadJson: { BarcodeValue: 'SSCC-1' },
    });
    await repository.listPrintJobs({ templateId: 'template-1' });
    await repository.getPrintJobById('job-1');
    await repository.reprintPrintJob('job-1', { reasonCode: 'RC-V1-REPRINT' });
    await repository.validateLabelBlocking({
      downstreamAction: 'putaway',
      businessObjectType: 'LPN',
      businessObjectId: 'lpn-1',
      warehouseProfileId: 'profile-1',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/label-templates'],
      ['get', '/label-templates/template-1'],
      ['post', '/label-templates'],
      ['post', '/label-templates/template-1/versions'],
      ['post', '/print-jobs/preview'],
      ['get', '/print-jobs'],
      ['get', '/print-jobs/job-1'],
      ['post', '/print-jobs/job-1/reprint'],
      ['post', '/label-blocking/validate'],
    ]);
  });

  it('enforces default PageSize 50 and max PageSize 100 for both lists', async () => {
    const http = new FakeHttpClient();
    const repository = new BarcodeLabelRepository(http);

    await repository.listTemplates({ page: 2, pageSize: 500, labelType: 'LPN', status: 'Active' });
    await repository.listPrintJobs({ page: 3, pageSize: 500, status: 'Previewed' });

    expect(http.calls[0]?.config).toEqual({
      params: { Page: 2, PageSize: 100, LabelType: 'LPN', Status: 'Active' },
    });
    expect(http.calls[1]?.config).toEqual({
      params: { Page: 3, PageSize: 100, Status: 'Previewed' },
    });

    await repository.listTemplates();
    expect(http.calls[2]?.config).toEqual({ params: { Page: 1, PageSize: 50 } });
  });

  it('sends PascalCase preview and reprint payloads', async () => {
    const http = new FakeHttpClient();
    const repository = new BarcodeLabelRepository(http);

    await repository.previewPrintJob({
      templateId: 'template-1',
      businessObjectType: 'Package',
      businessObjectId: 'pkg-1',
      businessObjectCode: 'PKG0001',
      payloadJson: { BarcodeValue: 'PKG0001' },
    });
    await repository.reprintPrintJob('job-1', {
      reasonCode: 'RC-V1-REPRINT',
      reasonNote: 'Label damaged',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/print-jobs/preview',
      body: {
        TemplateId: 'template-1',
        BusinessObjectType: 'Package',
        BusinessObjectId: 'pkg-1',
        BusinessObjectCode: 'PKG0001',
        PayloadJson: { BarcodeValue: 'PKG0001' },
      },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'post',
      url: '/print-jobs/job-1/reprint',
      body: { ReasonCode: 'RC-V1-REPRINT', ReasonNote: 'Label damaged' },
    });
  });

  it('sends PascalCase label blocking validation payload', async () => {
    const http = new FakeHttpClient();
    const repository = new BarcodeLabelRepository(http);

    await repository.validateLabelBlocking({
      downstreamAction: 'ready_for_staging',
      businessObjectType: 'Package',
      businessObjectId: 'pkg-1',
      businessObjectCode: 'PKG0001',
      warehouseProfileId: 'profile-1',
      warehouseId: 'warehouse-a',
      ownerId: 'owner-a',
      labelType: 'Shipping',
      attemptOverride: true,
      reasonCode: 'RC-V1-OVERRIDE',
      reasonNote: 'Supervisor accepted',
    });

    expect(http.calls[0]).toMatchObject({
      method: 'post',
      url: '/label-blocking/validate',
      body: {
        DownstreamAction: 'ready_for_staging',
        BusinessObjectType: 'Package',
        BusinessObjectId: 'pkg-1',
        BusinessObjectCode: 'PKG0001',
        WarehouseProfileId: 'profile-1',
        WarehouseId: 'warehouse-a',
        OwnerId: 'owner-a',
        LabelType: 'Shipping',
        AttemptOverride: true,
        ReasonCode: 'RC-V1-OVERRIDE',
        ReasonNote: 'Supervisor accepted',
      },
    });
  });
});
