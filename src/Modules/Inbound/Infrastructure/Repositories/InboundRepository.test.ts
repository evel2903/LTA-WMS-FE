import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
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
    await repository.captureDiscrepancy('receipt-1', {
      receiptLineId: 'receipt-line-1',
      discrepancyType: 'QuantityVariance',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['photo://dock/over-qty-1'],
      idempotencyKey: 'discrepancy-1',
    });

    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/inbound-plans'],
      ['get', '/inbound-plans/inbound-plan-1'],
      ['post', '/inbound-plans'],
      ['post', '/inbound-plans/inbound-plan-1/gate-in'],
      ['post', '/inbound-plans/inbound-plan-1/receiving-readiness'],
      ['post', '/inbound-plans/inbound-plan-1/receiving-sessions'],
      ['post', '/receipts/receipt-1/lines'],
      ['post', '/receipts/receipt-1/discrepancies'],
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
    await repository.captureDiscrepancy('receipt-1', {
      receiptLineId: 'receipt-line-1',
      discrepancyType: 'QuantityVariance',
      reasonCode: 'RC-V1-DISCREPANCY',
      reasonNote: 'Over ASN quantity',
      evidenceRefs: ['photo://dock/over-qty-1'],
      evidenceJson: { station: 'dock-1' },
      idempotencyKey: 'discrepancy-1',
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
  });
});
