import { describe, expect, it } from 'vitest';

import type { HttpClient } from '@shared/Services/Http/ApiClient';
import { InboundReceivingRepository } from '@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepository';

class FakeHttpClient implements HttpClient {
  public calls: Array<{ method: string; url: string; body?: unknown; config?: unknown }> = [];

  get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    return Promise.resolve({} as T);
  }

  post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    return Promise.resolve({ Id: 'receipt-1', ...(body as object) } as T);
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

const receiptDto = {
  Id: 'receipt-manual-1',
  InboundPlanId: null,
  ReceiptNumber: 'RCPT-MANUAL-001',
  BusinessReference: 'MANUAL:DOCK:001',
  OwnerId: 'owner-1',
  OwnerCode: 'OWN-A',
  WarehouseId: 'warehouse-1',
  WarehouseCode: 'WT-01',
  WarehouseProfileId: null,
  SupplierId: 'supplier-1',
  Status: 'Open',
  CoreFlowInstanceId: null,
  CreatedAt: '2026-07-18T08:00:00.000Z',
  UpdatedAt: '2026-07-18T08:00:00.000Z',
  CreatedBy: 'user-1',
  UpdatedBy: null,
} as const;

class ManualReceiptHttpClient extends FakeHttpClient {
  override get<T>(url: string, config?: unknown): Promise<T> {
    this.calls.push({ method: 'get', url, config });
    if (url === '/receipts') {
      return Promise.resolve({
        Items: [receiptDto],
        Meta: { Page: 1, PageSize: 50, TotalItems: 1, TotalPages: 1 },
      } as T);
    }
    if (url.endsWith('/operational-state')) {
      return Promise.resolve({
        ReceiptId: receiptDto.Id,
        InboundPlanId: null,
        Receipt: receiptDto,
        ReceivingSessions: [],
        ReceiptLines: [],
        QcTasks: [],
        QcResults: [],
        Lpns: [],
        Releases: [],
        Discrepancies: [],
      } as T);
    }
    return Promise.resolve(receiptDto as T);
  }

  override post<T>(url: string, body?: unknown, config?: unknown): Promise<T> {
    this.calls.push({ method: 'post', url, body, config });
    if (url === '/receipts') {
      return Promise.resolve({
        Receipt: receiptDto,
        Session: {
          Id: 'session-1',
          InboundPlanId: null,
          ReceiptId: receiptDto.Id,
          ReceiptNumber: receiptDto.ReceiptNumber,
          SessionKey: 'dock-1',
          DeviceCode: null,
          OwnerId: receiptDto.OwnerId,
          OwnerCode: receiptDto.OwnerCode,
          WarehouseId: receiptDto.WarehouseId,
          WarehouseCode: receiptDto.WarehouseCode,
          Status: 'Open',
          StartedAt: receiptDto.CreatedAt,
          ClosedAt: null,
          IsDuplicate: false,
          CreatedAt: receiptDto.CreatedAt,
          UpdatedAt: receiptDto.UpdatedAt,
          StartedBy: 'user-1',
          UpdatedBy: null,
        },
        IsDuplicate: false,
      } as T);
    }
    return super.post<T>(url, body, config);
  }
}

describe('InboundReceivingRepository', () => {
  it('uses canonical receipt endpoints for list, create, detail and operational state', async () => {
    const http = new ManualReceiptHttpClient();
    const repository = new InboundReceivingRepository(http);

    const list = await repository.listReceipts({ search: 'RCPT-MANUAL', page: 1, pageSize: 50 });
    const created = await repository.createManualReceipt({
      ownerId: 'owner-1',
      warehouseId: 'warehouse-1',
      supplierId: 'supplier-1',
      receiptNumber: 'RCPT-MANUAL-001',
      businessReference: 'MANUAL:DOCK:001',
      sessionKey: 'dock-1',
      idempotencyKey: 'manual-receipt-1',
    });
    const detail = await repository.getReceipt('receipt-manual-1');
    const operationalState = await repository.getReceiptOperationalState('receipt-manual-1');

    expect(list.items[0]).toMatchObject({ id: 'receipt-manual-1', inboundPlanId: null });
    expect(created).toMatchObject({
      receipt: { id: 'receipt-manual-1', supplierId: 'supplier-1' },
      session: { inboundPlanId: null, receiptId: 'receipt-manual-1' },
      isDuplicate: false,
    });
    expect(detail.id).toBe('receipt-manual-1');
    expect(operationalState).toMatchObject({
      receiptId: 'receipt-manual-1',
      inboundPlanId: null,
      receipt: { id: 'receipt-manual-1' },
    });
    expect(http.calls.map((call) => [call.method, call.url])).toEqual([
      ['get', '/receipts'],
      ['post', '/receipts'],
      ['get', '/receipts/receipt-manual-1'],
      ['get', '/receipts/receipt-manual-1/operational-state'],
    ]);
    expect(http.calls[0].config).toEqual({
      params: {
        Page: 1,
        PageSize: 50,
        WarehouseId: undefined,
        OwnerId: undefined,
        Search: 'RCPT-MANUAL',
      },
    });
  });

  it('uses receiving/receipt endpoints without a hard-coded /api/v1 prefix', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundReceivingRepository(http);

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

  it('builds PascalCase mutation payloads for readiness override, receiving, qc, lpn and release', async () => {
    const http = new FakeHttpClient();
    const repository = new InboundReceivingRepository(http);

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
      url: '/inbound-plans/inbound-plan-1/receiving-readiness',
      body: {
        AttemptOverride: true,
        ReasonCode: 'RC-V1-HANDOFF',
        ReasonNote: 'Supervisor approved gate-in evidence gap',
      },
    });
    expect(http.calls[1]).toMatchObject({
      method: 'post',
      url: '/inbound-plans/inbound-plan-1/receiving-sessions',
      body: {
        SessionKey: 'dock-1:user-1',
        DeviceCode: 'rf-01',
      },
    });
    expect(http.calls[2]).toMatchObject({
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
    expect(http.calls[3]).toMatchObject({
      method: 'post',
      url: '/receipts/receipt-1/lines/receipt-line-1/lpn',
      body: {
        LpnCode: 'LPN-0001',
        SsccCode: '003456789012345678',
        IdempotencyKey: 'lpn-1',
      },
    });
    expect(http.calls[4]).toMatchObject({
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
    expect(http.calls[6]).toMatchObject({
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
    expect(http.calls[7]).toMatchObject({
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
