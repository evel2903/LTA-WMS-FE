import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import type { InboundLineImportPreviewDto } from '@modules/Inbound/Infrastructure/Dtos/InboundDtos';
import { InboundRepository } from '@modules/Inbound/Infrastructure/Repositories/InboundRepository';

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

describe('InboundRepository', () => {
  it('uses root inbound endpoints without a hard-coded /api/v1 prefix', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundRepository(http);

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
    await repository.validateReadiness('inbound-plan-1', { attemptOverride: false });
    await repository.startReceivingSession('inbound-plan-1', {
      sessionKey: 'dock-1:user-1',
      deviceCode: 'rf-01',
    });
    await repository.confirmReceiptLine('receipt-1', {
      inboundPlanLineId: 'line-1',
      actualQuantity: 12,
      idempotencyKey: 'receipt-line-1',
      scanEvidence: { rawValue: 'barcode-1', scanResult: 'Accepted' },
    });
    await repository.confirmInboundLpn('receipt-1', 'receipt-line-1', {
      lpnCode: 'LPN-0001',
      ssccCode: '003456789012345678',
      idempotencyKey: 'lpn-1',
    });
    await repository.releaseInboundToPutaway('receipt-1', 'receipt-line-1', {
      currentLocationCode: 'RCV-01',
      idempotencyKey: 'release-1',
    });
    await repository.captureDiscrepancy('receipt-1', {
      receiptLineId: 'receipt-line-1',
      discrepancyType: 'QuantityVariance',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['photo://dock/over-qty-1'],
      idempotencyKey: 'discrepancy-1',
    });
    await repository.evaluateQcTask('receipt-1', {
      receiptLineId: 'receipt-line-1',
      idempotencyKey: 'qc-task-1',
      forceRequired: true,
    });
    await repository.recordQcResult('qc-task-1', {
      idempotencyKey: 'qc-result-1',
      resultStatus: 'Passed',
      dispositionCode: 'Release',
      inspectedQuantity: 12,
      acceptedQuantity: 12,
      rejectedQuantity: 0,
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/inbound-plans'],
      ['get', '/inbound-plans/inbound-plan-1'],
      ['post', '/inbound-plans'],
      ['post', '/inbound-plans/inbound-plan-1/gate-in'],
      ['post', '/inbound-plans/inbound-plan-1/receiving-readiness'],
      ['post', '/inbound-plans/inbound-plan-1/receiving-sessions'],
      ['post', '/receipts/receipt-1/lines'],
      ['post', '/receipts/receipt-1/lines/receipt-line-1/lpn'],
      ['post', '/receipts/receipt-1/lines/receipt-line-1/release-to-putaway'],
      ['post', '/receipts/receipt-1/discrepancies'],
      ['post', '/receipts/receipt-1/qc-tasks'],
      ['post', '/qc-tasks/qc-task-1/results'],
    ]);
  });

  it('sends only whitelisted filters and enforces V1 page-size guardrail', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundRepository(http);

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

  it('builds PascalCase mutation payloads for create, gate-in and readiness override', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundRepository(http);

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
    await repository.validateReadiness('inbound-plan-1', {
      attemptOverride: true,
      reasonCode: 'RC-V1-HANDOFF',
      reasonNote: 'Supervisor approved gate-in evidence gap',
    });
    await repository.startReceivingSession('inbound-plan-1', {
      sessionKey: 'dock-1:user-1',
      deviceCode: 'rf-01',
    });
    await repository.confirmReceiptLine('receipt-1', {
      inboundPlanLineId: 'line-1',
      actualQuantity: 12,
      idempotencyKey: 'receipt-line-1',
      scanEvidence: {
        rawValue: 'barcode-1',
        scanResult: 'Accepted',
        resolvedSkuId: 'sku-1',
        resolvedUomId: 'uom-1',
      },
    });
    await repository.confirmInboundLpn('receipt-1', 'receipt-line-1', {
      lpnCode: 'LPN-0001',
      ssccCode: '003456789012345678',
      idempotencyKey: 'lpn-1',
    });
    await repository.releaseInboundToPutaway('receipt-1', 'receipt-line-1', {
      currentLocationCode: 'RCV-01',
      requireLpn: true,
      attemptLabelOverride: true,
      reasonCode: 'RC-V1-LABEL-OVERRIDE',
      evidenceRefs: ['photo://label/override-1'],
      idempotencyKey: 'release-1',
    });
    await repository.captureDiscrepancy('receipt-1', {
      receiptLineId: 'receipt-line-1',
      discrepancyType: 'QuantityVariance',
      reasonCode: 'RC-V1-DISCREPANCY',
      reasonNote: 'Over ASN quantity',
      evidenceRefs: ['photo://dock/over-qty-1'],
      evidenceJson: { station: 'dock-1' },
      idempotencyKey: 'discrepancy-1',
    });
    await repository.evaluateQcTask('receipt-1', {
      receiptLineId: 'receipt-line-1',
      idempotencyKey: 'qc-task-1',
      forceRequired: true,
      reasonCode: 'RC-V1-DISCREPANCY',
      reasonNote: 'QC required by discrepancy',
      evidenceRefs: ['photo://dock/qc-trigger-1'],
    });
    await repository.recordQcResult('qc-task-1', {
      idempotencyKey: 'qc-result-1',
      resultStatus: 'Failed',
      dispositionCode: 'Quarantine',
      inspectedQuantity: 12,
      acceptedQuantity: 8,
      rejectedQuantity: 4,
      reasonCode: 'RC-V1-DISCREPANCY',
      reasonNote: 'Four units damaged',
      evidenceRefs: ['photo://qc/damaged-4'],
      evidenceJson: { rejectedQuantity: 4 },
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
    expect(http.calls[2]).toMatchObject({
      method: 'post',
      url: '/inbound-plans/inbound-plan-1/receiving-readiness',
      body: {
        AttemptOverride: true,
        ReasonCode: 'RC-V1-HANDOFF',
        ReasonNote: 'Supervisor approved gate-in evidence gap',
      },
    });
    expect(http.calls[3]).toMatchObject({
      method: 'post',
      url: '/inbound-plans/inbound-plan-1/receiving-sessions',
      body: {
        SessionKey: 'dock-1:user-1',
        DeviceCode: 'rf-01',
      },
    });
    expect(http.calls[4]).toMatchObject({
      method: 'post',
      url: '/receipts/receipt-1/lines',
      body: {
        InboundPlanLineId: 'line-1',
        ActualQuantity: 12,
        IdempotencyKey: 'receipt-line-1',
        ScanEvidence: {
          RawValue: 'barcode-1',
          ScanResult: 'Accepted',
          ResolvedSkuId: 'sku-1',
          ResolvedUomId: 'uom-1',
        },
      },
    });
    expect(http.calls[5]).toMatchObject({
      method: 'post',
      url: '/receipts/receipt-1/lines/receipt-line-1/lpn',
      body: {
        LpnCode: 'LPN-0001',
        SsccCode: '003456789012345678',
        IdempotencyKey: 'lpn-1',
      },
    });
    expect(http.calls[6]).toMatchObject({
      method: 'post',
      url: '/receipts/receipt-1/lines/receipt-line-1/release-to-putaway',
      body: {
        CurrentLocationCode: 'RCV-01',
        RequireLpn: true,
        AttemptLabelOverride: true,
        ReasonCode: 'RC-V1-LABEL-OVERRIDE',
        EvidenceRefs: ['photo://label/override-1'],
        IdempotencyKey: 'release-1',
      },
    });
    expect(http.calls[7]).toMatchObject({
      method: 'post',
      url: '/receipts/receipt-1/discrepancies',
      body: {
        ReceiptLineId: 'receipt-line-1',
        DiscrepancyType: 'QuantityVariance',
        ReasonCode: 'RC-V1-DISCREPANCY',
        ReasonNote: 'Over ASN quantity',
        EvidenceRefs: ['photo://dock/over-qty-1'],
        EvidenceJson: { station: 'dock-1' },
        IdempotencyKey: 'discrepancy-1',
      },
    });
    expect(http.calls[8]).toMatchObject({
      method: 'post',
      url: '/receipts/receipt-1/qc-tasks',
      body: {
        ReceiptLineId: 'receipt-line-1',
        IdempotencyKey: 'qc-task-1',
        ForceRequired: true,
        ReasonCode: 'RC-V1-DISCREPANCY',
        ReasonNote: 'QC required by discrepancy',
        EvidenceRefs: ['photo://dock/qc-trigger-1'],
      },
    });
    expect(http.calls[9]).toMatchObject({
      method: 'post',
      url: '/qc-tasks/qc-task-1/results',
      body: {
        IdempotencyKey: 'qc-result-1',
        ResultStatus: 'Failed',
        DispositionCode: 'Quarantine',
        InspectedQuantity: 12,
        AcceptedQuantity: 8,
        RejectedQuantity: 4,
        ReasonCode: 'RC-V1-DISCREPANCY',
        ReasonNote: 'Four units damaged',
        EvidenceRefs: ['photo://qc/damaged-4'],
        EvidenceJson: { rejectedQuantity: 4 },
      },
    });
  });
});

describe('InboundRepository line import (IFB-03)', () => {
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
    const repository = new InboundRepository(http);

    const blob = await repository.downloadLineImportTemplate();

    expect(http.blobUrl).toBe('/inbound-plans/line-import-template');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('previews an upload as multipart with PascalCase scope params and maps per-row errors', async () => {
    const http = new ImportHttpClient();
    const repository = new InboundRepository(http);
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
    const repository = new InboundRepository(http);
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
