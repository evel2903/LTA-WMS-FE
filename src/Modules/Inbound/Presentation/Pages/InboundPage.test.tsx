// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInboundRepository } from '@modules/Inbound/Application/Interfaces/IInboundRepository';
import type {
  InboundDiscrepancy,
  InboundLpn,
  InboundPlan,
  InboundPutawayRelease,
  QcResult,
  QcTask,
  ReceiptLine,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  EvaluateQcTaskInput,
  InboundPlanFilter,
  RecordQcResultInput,
  RecordGateInInput,
  ReleaseInboundToPutawayInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IInboundRepository }));
vi.mock('@modules/Inbound/Infrastructure/Repositories/InboundRepositoryInstance', () => ({
  get inboundRepository() {
    return repo.current;
  },
}));

import { InboundDetailPage } from '@modules/Inbound/Presentation/Pages/InboundDetailPage';
import { InboundPage as InboundListPage } from '@modules/Inbound/Presentation/Pages/InboundPage';

vi.setConfig({ testTimeout: 15_000 });

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function makePlan(overrides: Partial<InboundPlan> = {}): InboundPlan {
  return {
    id: 'inbound-plan-1',
    sourceSystem: 'ERP',
    sourceDocumentType: 'ASN',
    sourceDocumentNumber: 'ASN-10001',
    businessReference: 'ERP:ASN:ASN-10001',
    supplierId: 'supplier-1',
    supplierCode: 'SUP-A',
    ownerId: 'owner-1',
    ownerCode: 'OWN-A',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WT-01',
    warehouseProfileId: 'profile-1',
    expectedArrivalAt: '2026-06-22T08:00:00.000Z',
    status: 'Planned',
    gateInStatus: 'NotRecorded',
    gateInAt: null,
    gateReference: null,
    vehicleNumber: null,
    driverName: null,
    evidenceRefs: [],
    coreFlowInstanceId: 'core-flow-1',
    isDuplicate: false,
    lines: [
      {
        id: 'line-1',
        lineNumber: 1,
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        expectedQuantity: 12,
        externalLineReference: '10',
      },
    ],
    createdAt: '2026-06-22T08:00:00.000Z',
    updatedAt: '2026-06-22T08:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

class FakeRepository implements Partial<IInboundRepository> {
  public items: InboundPlan[];
  public readiness = {
    allowed: false,
    blocked: true,
    decision: 'Blocked',
    gateInRequired: true,
    gateInRecorded: false,
    overrideAccepted: false,
    reason: 'Cần ghi nhận vào cổng trước khi tiếp nhận.',
  } as const;

  constructor(initial: InboundPlan[] = []) {
    this.items = initial;
  }

  list = vi.fn((filter?: InboundPlanFilter) =>
    Promise.resolve(
      page(
        this.items.filter((item) => {
          if (filter?.sourceSystem && item.sourceSystem !== filter.sourceSystem) return false;
          if (
            filter?.sourceDocumentNumber &&
            !item.sourceDocumentNumber.includes(filter.sourceDocumentNumber)
          )
            return false;
          return true;
        }),
      ),
    ),
  );

  getById = vi.fn((id: string) => {
    const item = this.items.find((plan) => plan.id === id);
    return item
      ? Promise.resolve(item)
      : Promise.reject(
          new ApiError({ status: 404, code: 'NOT_FOUND', message: `Inbound plan ${id} not found` }),
        );
  });

  create = vi.fn((input: CreateInboundPlanInput) => {
    const created = makePlan({
      id: `inbound-plan-${this.items.length + 1}`,
      sourceSystem: input.sourceSystem,
      sourceDocumentType: input.sourceDocumentType,
      sourceDocumentNumber: input.sourceDocumentNumber,
      supplierId: input.supplierId,
      ownerId: input.ownerId,
      warehouseId: input.warehouseId,
      warehouseProfileId: input.warehouseProfileId,
      expectedArrivalAt: input.expectedArrivalAt ?? null,
      lines: input.lines.map((line, index) => ({
        id: `line-${index + 1}`,
        lineNumber: line.lineNumber,
        skuId: line.skuId,
        skuCode: line.skuId,
        uomId: line.uomId,
        uomCode: line.uomId,
        expectedQuantity: line.expectedQuantity,
        externalLineReference: line.externalLineReference ?? null,
      })),
    });
    this.items = [created, ...this.items];
    return Promise.resolve(created);
  });

  recordGateIn = vi.fn((id: string, input: RecordGateInInput) => {
    const index = this.items.findIndex((item) => item.id === id);
    this.items[index] = {
      ...this.items[index],
      gateInStatus: 'Recorded',
      gateInAt: input.gateInAt,
      gateReference: input.gateReference,
      vehicleNumber: input.vehicleNumber ?? null,
    };
    return Promise.resolve(this.items[index]);
  });

  validateReadiness = vi.fn((_id: string, input?: ValidateReceivingReadinessInput) =>
    Promise.resolve(
      input?.attemptOverride
        ? { ...this.readiness, allowed: true, blocked: false, overrideAccepted: true }
        : this.readiness,
    ),
  );

  startReceivingSession = vi.fn(
    (id: string, input?: StartReceivingSessionInput): Promise<ReceivingSession> => {
      const plan = this.items.find((item) => item.id === id) ?? this.items[0];
      return Promise.resolve({
        id: 'session-1',
        inboundPlanId: id,
        receiptId: 'receipt-1',
        receiptNumber: `${plan?.sourceDocumentNumber ?? 'ASN-10001'}-RCPT`,
        sessionKey: input?.sessionKey ?? 'dock-1',
        deviceCode: input?.deviceCode ?? null,
        ownerId: plan?.ownerId ?? 'owner-1',
        ownerCode: plan?.ownerCode ?? 'OWN-A',
        warehouseId: plan?.warehouseId ?? 'warehouse-1',
        warehouseCode: plan?.warehouseCode ?? 'WT-01',
        status: 'Open',
        startedAt: '2026-06-22T09:05:00.000Z',
        closedAt: null,
        isDuplicate: false,
        createdAt: '2026-06-22T09:05:00.000Z',
        updatedAt: '2026-06-22T09:05:00.000Z',
        startedBy: 'test-admin',
        updatedBy: null,
      });
    },
  );

  confirmReceiptLine = vi.fn(
    (_receiptId: string, input: ConfirmReceiptLineInput): Promise<ReceiptLine> =>
      Promise.resolve({
        id: 'receipt-line-1',
        receiptId: 'receipt-1',
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: input.inboundPlanLineId,
        lineNumber: 1,
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        expectedQuantity: 12,
        actualQuantity: input.actualQuantity,
        status: input.actualQuantity === 12 ? 'Received' : 'Discrepancy',
        manualConfirm: input.manualConfirm ?? false,
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        scanEvidenceJson: input.scanEvidence ? { RawValue: input.scanEvidence.rawValue } : null,
        discrepancySignals: input.actualQuantity === 12 ? [] : ['QuantityVariance'],
        idempotencyKey: input.idempotencyKey,
        receivedAt: '2026-06-22T09:10:00.000Z',
        receivedBy: 'test-admin',
        isDuplicate: false,
        createdAt: '2026-06-22T09:10:00.000Z',
        updatedAt: '2026-06-22T09:10:00.000Z',
      }),
  );

  confirmInboundLpn = vi.fn(
    (
      _receiptId: string,
      receiptLineId: string,
      input: ConfirmInboundLpnInput,
    ): Promise<InboundLpn> =>
      Promise.resolve({
        id: 'lpn-1',
        receiptId: 'receipt-1',
        receiptLineId,
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        quantity: 12,
        lpnCode: input.lpnCode,
        ssccCode: input.ssccCode ?? null,
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        idempotencyKey: input.idempotencyKey,
        confirmedAt: '2026-06-22T09:16:00.000Z',
        confirmedBy: 'test-admin',
        isDuplicate: false,
        createdAt: '2026-06-22T09:16:00.000Z',
        updatedAt: '2026-06-22T09:16:00.000Z',
      }),
  );

  releaseInboundToPutaway = vi.fn(
    (
      _receiptId: string,
      receiptLineId: string,
      input: ReleaseInboundToPutawayInput,
    ): Promise<InboundPutawayRelease> =>
      Promise.resolve({
        id: 'release-1',
        inboundLpnId: 'lpn-1',
        receiptId: 'receipt-1',
        receiptLineId,
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        quantity: 12,
        lpnCode: 'LPN-0001',
        ssccCode: '003456789012345678',
        inventoryStatusCode: 'READY_FOR_PUTAWAY',
        currentLocationId: input.currentLocationId ?? null,
        currentLocationCode: input.currentLocationCode ?? 'RECEIVING',
        warehouseProfileId: 'profile-1',
        labelDecision: 'NotRequired',
        labelReason: 'No label blocking rule required for this action.',
        matchedPrintJobId: null,
        constraintJson: { ReadinessSourceType: 'QcTask' },
        outboxMessageId: 'outbox-1',
        coreFlowMilestoneId: 'milestone-1',
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        idempotencyKey: input.idempotencyKey,
        releasedAt: '2026-06-22T09:25:00.000Z',
        releasedBy: 'test-admin',
        isDuplicate: false,
        createdAt: '2026-06-22T09:25:00.000Z',
        updatedAt: '2026-06-22T09:25:00.000Z',
      }),
  );

  captureDiscrepancy = vi.fn(
    (_receiptId: string, input: CaptureInboundDiscrepancyInput): Promise<InboundDiscrepancy> =>
      Promise.resolve({
        id: 'discrepancy-1',
        receiptId: 'receipt-1',
        receiptLineId: input.receiptLineId,
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        discrepancyType: input.discrepancyType,
        status: 'PendingApproval',
        toleranceDecision: 'OverTolerancePendingApproval',
        expectedQuantity: 12,
        actualQuantity: 14,
        reasonCode: input.reasonCode,
        reasonCodeId: 'reason-1',
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        evidenceJson: input.evidenceJson ?? null,
        exceptionCaseId: 'exception-1',
        exceptionState: 'DETECTED',
        severity: 'MEDIUM',
        idempotencyKey: input.idempotencyKey,
        isDuplicate: false,
        recordedAt: '2026-06-22T09:12:00.000Z',
        recordedBy: 'test-admin',
        createdAt: '2026-06-22T09:12:00.000Z',
        updatedAt: '2026-06-22T09:12:00.000Z',
      }),
  );

  evaluateQcTask = vi.fn(
    (_receiptId: string, input: EvaluateQcTaskInput): Promise<QcTask> =>
      Promise.resolve({
        id: 'qc-task-1',
        receiptId: 'receipt-1',
        receiptLineId: input.receiptLineId,
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        actualQuantity: 12,
        taskStatus: input.forceRequired ? 'PendingQc' : 'NotRequired',
        required: input.forceRequired === true,
        triggerReason: input.forceRequired ? 'Forced' : 'NotRequired',
        triggerPolicyJson: null,
        inventoryStatusCode: input.forceRequired ? 'PENDING_QC' : 'READY_FOR_PUTAWAY',
        targetInventoryStatusCode: input.forceRequired ? null : 'READY_FOR_PUTAWAY',
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        idempotencyKey: input.idempotencyKey,
        isDuplicate: false,
        createdBy: 'test-admin',
        updatedBy: 'test-admin',
        createdAt: '2026-06-22T09:15:00.000Z',
        updatedAt: '2026-06-22T09:15:00.000Z',
      }),
  );

  recordQcResult = vi.fn(
    (_qcTaskId: string, input: RecordQcResultInput): Promise<QcResult> =>
      Promise.resolve({
        id: 'qc-result-1',
        qcTaskId: 'qc-task-1',
        receiptId: 'receipt-1',
        receiptLineId: 'receipt-line-1',
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        resultStatus: input.resultStatus,
        dispositionCode: input.dispositionCode,
        taskStatus: input.resultStatus === 'Passed' ? 'Closed' : 'Dispositioned',
        inspectedQuantity: input.inspectedQuantity,
        acceptedQuantity: input.acceptedQuantity,
        rejectedQuantity: input.rejectedQuantity,
        acceptedInventoryStatusCode: input.acceptedQuantity > 0 ? 'READY_FOR_PUTAWAY' : null,
        rejectedInventoryStatusCode: input.rejectedQuantity > 0 ? 'QUARANTINE' : null,
        targetInventoryStatusCode: input.rejectedQuantity > 0 ? 'QUARANTINE' : 'READY_FOR_PUTAWAY',
        reasonCode: input.reasonCode ?? null,
        reasonCodeId: input.reasonCode ? 'reason-1' : null,
        reasonNote: input.reasonNote ?? null,
        evidenceRefs: input.evidenceRefs ?? [],
        evidenceJson: input.evidenceJson ?? null,
        idempotencyKey: input.idempotencyKey,
        recordedAt: '2026-06-22T09:20:00.000Z',
        recordedBy: 'test-admin',
        isDuplicate: false,
        createdAt: '2026-06-22T09:20:00.000Z',
        updatedAt: '2026-06-22T09:20:00.000Z',
      }),
  );
}

function renderPage(entry = '/inbound/inbound-plan-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/inbound/new" element={<InboundDetailPage />} />
          <Route path="/inbound/:id" element={<InboundDetailPage />} />
          <Route path="/inbound/:id/:action" element={<InboundDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderListPage(entry = '/inbound') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/inbound" element={<InboundListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location-probe" hidden>
      {location.pathname}
    </span>
  );
}

afterEach(() => cleanup());

describe('InboundPage', () => {
  it('lists plans, shows line detail and validates receiving readiness state', async () => {
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    expect(screen.getByText('SKU-A')).toBeTruthy();
    expect(screen.getByText(/Dự kiến đến: 2026-06-22T08:00:00.000Z/i)).toBeTruthy();
    expect(screen.getByText(/Dấu vết CoreFlow: core-flow-1/i)).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(await screen.findByText(/Cần ghi nhận vào cổng trước khi tiếp nhận/i)).toBeTruthy();
    expect(fake.validateReadiness).toHaveBeenCalledWith('inbound-plan-1', {
      attemptOverride: false,
    });
  });

  it('creates source document and records gate-in through repository commands', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage('/inbound/new');

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'ASN-10001');
    await actor.type(screen.getByLabelText('ID nhà cung cấp'), 'supplier-1');
    await actor.type(screen.getByLabelText('ID chủ hàng'), 'owner-1');
    await actor.type(screen.getByLabelText('ID kho'), 'warehouse-1');
    await actor.type(screen.getByLabelText('ID hồ sơ kho'), 'profile-1');
    await actor.type(screen.getByLabelText('Thời gian đến dự kiến'), '2026-06-22T08:00');
    await actor.type(screen.getByLabelText('ID SKU'), 'sku-1');
    await actor.type(screen.getByLabelText('ID đơn vị tính'), 'uom-1');
    await actor.clear(screen.getByLabelText('Số lượng dự kiến'));
    await actor.type(screen.getByLabelText('Số lượng dự kiến'), '12');
    await actor.click(screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' }));

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceSystem: 'ERP',
          sourceDocumentNumber: 'ASN-10001',
          lines: [expect.objectContaining({ skuId: 'sku-1', expectedQuantity: 12 })],
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );
    const createInput = fake.create.mock.calls[0][0];
    expect(createInput.expectedArrivalAt).toMatch(/^2026-06-22T/);

    const gateForm = screen
      .getByRole('button', { name: 'Ghi nhận vào cổng' })
      .closest('form') as HTMLFormElement;
    await actor.type(within(gateForm).getByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(within(gateForm).getByRole('button', { name: 'Ghi nhận vào cổng' }));

    await waitFor(() =>
      expect(fake.recordGateIn).toHaveBeenCalledWith(
        'inbound-plan-1',
        expect.objectContaining({ gateReference: 'GATE-A-001' }),
      ),
    );
  });

  it('shows duplicate/idempotent source trace when backend returns duplicate flag', async () => {
    const actor = userEvent.setup();
    const existing = makePlan({ isDuplicate: true });
    const fake = new FakeRepository([existing]);
    fake.create.mockResolvedValueOnce(existing);
    repo.current = fake;
    renderPage('/inbound/new');

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'ASN-10001');
    await actor.type(screen.getByLabelText('ID nhà cung cấp'), 'supplier-1');
    await actor.type(screen.getByLabelText('ID chủ hàng'), 'owner-1');
    await actor.type(screen.getByLabelText('ID kho'), 'warehouse-1');
    await actor.type(screen.getByLabelText('ID hồ sơ kho'), 'profile-1');
    await actor.type(screen.getByLabelText('ID SKU'), 'sku-1');
    await actor.type(screen.getByLabelText('ID đơn vị tính'), 'uom-1');
    await actor.click(screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' }));

    expect(await screen.findByText(/Đã dùng lại kế hoạch nhập kho hiện có/i)).toBeTruthy();
  });

  it('creates source document with multiple lines and external line references', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage('/inbound/new');

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.clear(screen.getByLabelText('Loại chứng từ nguồn'));
    await actor.type(screen.getByLabelText('Loại chứng từ nguồn'), 'PO');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'PO-10001');
    await actor.type(screen.getByLabelText('ID nhà cung cấp'), 'supplier-1');
    await actor.type(screen.getByLabelText('ID chủ hàng'), 'owner-1');
    await actor.type(screen.getByLabelText('ID kho'), 'warehouse-1');
    await actor.type(screen.getByLabelText('ID hồ sơ kho'), 'profile-1');
    await actor.type(screen.getByLabelText('ID SKU'), 'sku-1');
    await actor.type(screen.getByLabelText('ID đơn vị tính'), 'uom-1');
    await actor.clear(screen.getByLabelText('Số lượng dự kiến'));
    await actor.type(screen.getByLabelText('Số lượng dự kiến'), '12');
    await actor.type(screen.getByLabelText('Tham chiếu dòng ngoài'), '10');

    await actor.click(screen.getByRole('button', { name: 'Thêm dòng' }));
    const skuInputs = screen.getAllByLabelText('ID SKU');
    const uomInputs = screen.getAllByLabelText('ID đơn vị tính');
    const qtyInputs = screen.getAllByLabelText('Số lượng dự kiến');
    const refInputs = screen.getAllByLabelText('Tham chiếu dòng ngoài');
    await actor.type(skuInputs[1], 'sku-2');
    await actor.type(uomInputs[1], 'uom-2');
    await actor.clear(qtyInputs[1]);
    await actor.type(qtyInputs[1], '8');
    await actor.type(refInputs[1], '20');
    await actor.click(screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' }));

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceDocumentType: 'PO',
          sourceDocumentNumber: 'PO-10001',
          lines: [
            expect.objectContaining({ lineNumber: 1, skuId: 'sku-1', externalLineReference: '10' }),
            expect.objectContaining({ lineNumber: 2, skuId: 'sku-2', externalLineReference: '20' }),
          ],
        }),
      ),
    );
  });

  it('allows readiness override only with reason code input', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    expect(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' })).toHaveProperty(
      'disabled',
      true,
    );

    await actor.type(screen.getByLabelText('Mã lý do sẵn sàng'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }));

    await waitFor(() =>
      expect(fake.validateReadiness).toHaveBeenLastCalledWith('inbound-plan-1', {
        attemptOverride: true,
        reasonCode: 'RC-V1-HANDOFF',
      }),
    );
    expect(await screen.findByText(/Ghi đè đã được chấp nhận/i)).toBeTruthy();
  });

  it('starts receiving and confirms a scan receipt line through repository commands', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));

    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.type(screen.getByLabelText('Giá trị quét thô'), '01012345678901281726010110LOT-A');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận dòng tiếp nhận' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() =>
      expect(fake.startReceivingSession).toHaveBeenCalledWith('inbound-plan-1', {
        sessionKey: 'dock-1:user-1',
        deviceCode: 'rf-web',
      }),
    );
    await waitFor(() => expect(fake.confirmReceiptLine).toHaveBeenCalledTimes(1));
    const [receiptId, receiptInput] = fake.confirmReceiptLine.mock.calls[0];
    expect(receiptId).toBe('receipt-1');
    expect(receiptInput).toMatchObject({
      inboundPlanLineId: 'line-1',
      actualQuantity: 12,
      idempotencyKey: 'receipt-line-1',
      scanEvidence: {
        rawValue: '01012345678901281726010110LOT-A',
        resolvedSkuId: 'sku-1',
        resolvedUomId: 'uom-1',
      },
    });
    expect(await screen.findByText(/Dòng 1 Đã nhận/i)).toBeTruthy();
  }, 15_000);

  it('routes a confirmed discrepancy line with reason, evidence and idempotency', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Số lượng thực tế'));
    await actor.type(screen.getByLabelText('Số lượng thực tế'), '14');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận dòng tiếp nhận' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.type(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Tham chiếu bằng chứng sai lệch'), 'photo://dock/over-qty-1');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-1');
    await actor.click(screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' }));

    await waitFor(() => expect(fake.captureDiscrepancy).toHaveBeenCalledTimes(1));
    const [receiptId, discrepancyInput] = fake.captureDiscrepancy.mock.calls[0];
    expect(receiptId).toBe('receipt-1');
    expect(discrepancyInput).toMatchObject({
      receiptLineId: 'receipt-line-1',
      discrepancyType: 'QuantityVariance',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['photo://dock/over-qty-1'],
      idempotencyKey: 'discrepancy-1',
    });
    expect(
      await screen.findByText(/Sai lệch Chờ phê duyệt \/ Ngoại lệ exception-1/i),
    ).toBeTruthy();
  });

  it('evaluates QC skipped after a confirmed receipt line', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Xác nhận dòng tiếp nhận' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Đã nhận/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));

    await waitFor(() => expect(fake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(fake.evaluateQcTask).toHaveBeenCalledWith('receipt-1', {
      receiptLineId: 'receipt-line-1',
      idempotencyKey: 'qc-task-skipped',
      forceRequired: false,
      reasonCode: null,
      reasonNote: null,
      evidenceRefs: [],
    });
    expect(await screen.findByText(/QC NotRequired \/ READY_FOR_PUTAWAY \/ Đã bỏ qua/i)).toBeTruthy();
  });

  it('confirms LPN/SSCC and releases READY_FOR_PUTAWAY line to putaway', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Xác nhận dòng tiếp nhận' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Đã nhận/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    expect(await screen.findByText(/QC NotRequired \/ READY_FOR_PUTAWAY \/ Đã bỏ qua/i)).toBeTruthy();

    const releaseButton = screen.getByRole('button', { name: 'Phát hành sang cất hàng' });
    expect(releaseButton).toHaveProperty('disabled', true);
    await actor.type(screen.getByLabelText('Mã LPN'), 'LPN-0001');
    await actor.type(screen.getByLabelText('Mã SSCC'), '003456789012345678');
    await actor.clear(screen.getByLabelText('Khóa idempotency LPN'));
    await actor.type(screen.getByLabelText('Khóa idempotency LPN'), 'lpn-1');
    await actor.click(screen.getByRole('button', { name: 'Xác nhận LPN/SSCC' }));

    expect(await screen.findByText(/LPN LPN-0001 \/ 003456789012345678/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Mã vị trí hiện tại'));
    await actor.type(screen.getByLabelText('Mã vị trí hiện tại'), 'RCV-01');
    await actor.clear(screen.getByLabelText('Khóa idempotency phát hành'));
    await actor.type(screen.getByLabelText('Khóa idempotency phát hành'), 'release-1');
    await waitFor(() => expect(releaseButton).toHaveProperty('disabled', false));
    fireEvent.submit(releaseButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(fake.confirmInboundLpn).toHaveBeenCalledTimes(1));
    expect(fake.confirmInboundLpn).toHaveBeenCalledWith('receipt-1', 'receipt-line-1', {
      lpnCode: 'LPN-0001',
      ssccCode: '003456789012345678',
      idempotencyKey: 'lpn-1',
    });
    await waitFor(() => expect(fake.releaseInboundToPutaway).toHaveBeenCalledTimes(1));
    expect(fake.releaseInboundToPutaway).toHaveBeenCalledWith('receipt-1', 'receipt-line-1', {
      currentLocationCode: 'RCV-01',
      requireLpn: true,
      attemptLabelOverride: false,
      reasonCode: null,
      evidenceRefs: [],
      idempotencyKey: 'release-1',
    });
    expect(await screen.findByText(/Đã phát hành 12 EA \/ READY_FOR_PUTAWAY \/ RCV-01/i)).toBeTruthy();
  }, 15_000);

  it('shows backend release block reason inline', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    fake.releaseInboundToPutaway.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Inventory status PENDING_QC cannot be released to putaway',
      }),
    );
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Xác nhận dòng tiếp nhận' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Đã nhận/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    expect(await screen.findByText(/QC NotRequired \/ READY_FOR_PUTAWAY \/ Đã bỏ qua/i)).toBeTruthy();

    await actor.click(screen.getByLabelText('Yêu cầu LPN'));
    await actor.clear(screen.getByLabelText('Khóa idempotency phát hành'));
    await actor.type(screen.getByLabelText('Khóa idempotency phát hành'), 'release-blocked');
    const releaseButton = screen.getByRole('button', { name: 'Phát hành sang cất hàng' });
    await waitFor(() => expect(releaseButton).toHaveProperty('disabled', false));
    fireEvent.submit(releaseButton.closest('form') as HTMLFormElement);

    expect(
      await screen.findByText(/Inventory status PENDING_QC cannot be released to putaway/i),
    ).toBeTruthy();
  });

  it('records required QC result with split quarantine disposition and evidence', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Xác nhận dòng tiếp nhận' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Đã nhận/i)).toBeTruthy();
    await actor.click(screen.getByLabelText('Bắt buộc QC'));
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-required');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    expect(await screen.findByText(/QC PendingQc \/ PENDING_QC \/ Forced/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Trạng thái kết quả QC'), { target: { value: 'Failed' } });
    fireEvent.change(screen.getByLabelText('Hướng xử lý QC'), { target: { value: 'Quarantine' } });
    fireEvent.change(screen.getByLabelText('Số lượng đạt'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Số lượng loại'), { target: { value: '3' } });
    const recordButton = screen.getByRole('button', { name: 'Ghi nhận kết quả QC' });
    expect(recordButton).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText('Mã lý do kết quả QC'), {
      target: { value: 'RC-V1-DISCREPANCY' },
    });
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng kết quả QC'), {
      target: { value: 'photo://qc/damaged-4' },
    });
    fireEvent.change(screen.getByLabelText('Khóa idempotency kết quả QC'), {
      target: { value: 'qc-result-split' },
    });
    expect(recordButton).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText('Số lượng loại'), { target: { value: '4' } });
    await waitFor(() => expect(recordButton).toHaveProperty('disabled', false));
    fireEvent.submit(recordButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(fake.recordQcResult).toHaveBeenCalledTimes(1));
    expect(fake.recordQcResult).toHaveBeenCalledWith('qc-task-1', {
      idempotencyKey: 'qc-result-split',
      resultStatus: 'Failed',
      dispositionCode: 'Quarantine',
      inspectedQuantity: 12,
      acceptedQuantity: 8,
      rejectedQuantity: 4,
      reasonCode: 'RC-V1-DISCREPANCY',
      reasonNote: null,
      evidenceRefs: ['photo://qc/damaged-4'],
    });
    expect(await screen.findByText(/Kết quả QC Failed \/ mục tiêu QUARANTINE/i)).toBeTruthy();
  });

  it('keeps discrepancy route disabled until a real evidence ref is provided', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực tế'));
    await actor.type(screen.getByLabelText('Số lượng thực tế'), '14');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Xác nhận dòng tiếp nhận' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    const routeButton = screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' });
    expect(routeButton).toHaveProperty('disabled', true);
    await actor.type(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Tham chiếu bằng chứng sai lệch'), ',,');
    expect(routeButton).toHaveProperty('disabled', true);
    expect(fake.captureDiscrepancy).not.toHaveBeenCalled();
  });

  it('defaults discrepancy type from the confirmed receipt-line signal', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    fake.confirmReceiptLine.mockResolvedValueOnce({
      id: 'receipt-line-1',
      receiptId: 'receipt-1',
      inboundPlanId: 'inbound-plan-1',
      inboundPlanLineId: 'line-1',
      lineNumber: 1,
      skuId: 'sku-1',
      skuCode: 'SKU-A',
      uomId: 'uom-1',
      uomCode: 'EA',
      expectedQuantity: 12,
      actualQuantity: 12,
      status: 'Discrepancy',
      manualConfirm: false,
      reasonCode: null,
      reasonCodeId: null,
      reasonNote: null,
      scanEvidenceJson: { RawValue: 'wrong-sku-barcode' },
      discrepancySignals: ['WrongSku'],
      idempotencyKey: 'receipt-line-wrong-sku',
      receivedAt: '2026-06-22T09:10:00.000Z',
      receivedBy: 'test-admin',
      isDuplicate: false,
      createdAt: '2026-06-22T09:10:00.000Z',
      updatedAt: '2026-06-22T09:10:00.000Z',
    });
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.type(screen.getByLabelText('Giá trị quét thô'), 'wrong-sku-barcode');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-wrong-sku');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Xác nhận dòng tiếp nhận' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Sai SKU/i)).toBeTruthy();
    expect(screen.getByLabelText('Loại sai lệch')).toHaveProperty('value', 'WrongSku');
  }, 15_000);

  it('hides stale discrepancy routing when a different source line is selected', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makePlan({
        lines: [
          {
            id: 'line-1',
            lineNumber: 1,
            skuId: 'sku-1',
            skuCode: 'SKU-A',
            uomId: 'uom-1',
            uomCode: 'EA',
            expectedQuantity: 12,
            externalLineReference: '10',
          },
          {
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            uomId: 'uom-1',
            uomCode: 'EA',
            expectedQuantity: 8,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực tế'));
    await actor.type(screen.getByLabelText('Số lượng thực tế'), '14');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Xác nhận dòng tiếp nhận' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Điều phối sai lệch/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Chọn dòng 2' }));
    await waitFor(() => expect(screen.queryByText(/Điều phối sai lệch/i)).toBeNull());
  });

  it('shows an inline discrepancy route error when backend rejects capture', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    fake.captureDiscrepancy.mockRejectedValueOnce(
      new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Evidence is required' }),
    );
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực tế'));
    await actor.type(screen.getByLabelText('Số lượng thực tế'), '14');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Xác nhận dòng tiếp nhận' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.type(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Tham chiếu bằng chứng sai lệch'), 'photo://dock/over-qty-1');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-error');
    await actor.click(screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' }));

    expect(await screen.findByText(/Không thể chuyển xử lý sai lệch/i)).toBeTruthy();
  });

  it('clears stale readiness override after gate-in is recorded', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    await actor.type(screen.getByLabelText('Mã lý do sẵn sàng'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }));
    expect(await screen.findByText(/Ghi đè đã được chấp nhận/i)).toBeTruthy();

    const gateForm = screen
      .getByRole('button', { name: 'Ghi nhận vào cổng' })
      .closest('form') as HTMLFormElement;
    await actor.type(within(gateForm).getByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(within(gateForm).getByRole('button', { name: 'Ghi nhận vào cổng' }));

    await waitFor(() => expect(screen.queryByText(/Ghi đè đã được chấp nhận/i)).toBeNull());
    expect(fake.recordGateIn).toHaveBeenCalledWith(
      'inbound-plan-1',
      expect.objectContaining({ gateReference: 'GATE-A-001' }),
    );
  });

  it('shows permission denied read-only state when detail read is forbidden', async () => {
    const fake = new FakeRepository();
    fake.getById = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No inbound read' })),
    );
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/Không có quyền đọc kế hoạch nhập kho/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tạo kế hoạch nhập kho' })).toBeNull();
  });

  it('passes source-system and document-number filters to the repository', async () => {
    const fake = new FakeRepository([
      makePlan({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
      makePlan({
        id: 'inbound-plan-2',
        sourceSystem: 'OWNER-PORTAL',
        sourceDocumentNumber: 'ASN-20001',
      }),
    ]);
    repo.current = fake;
    renderListPage();

    await screen.findByText('ASN-10001');
    expect(screen.getByRole('link', { name: 'Tạo kế hoạch nhập kho' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Mở chi tiết' })[0]).toHaveProperty(
      'href',
      expect.stringContaining('/inbound/inbound-plan-1'),
    );
    expect(screen.queryByRole('button', { name: 'Tạo kế hoạch nhập kho' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ghi nhận vào cổng' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Lọc hệ thống nguồn'), { target: { value: 'ERP' } });
    fireEvent.change(screen.getByLabelText('Lọc số chứng từ'), { target: { value: 'ASN-10001' } });

    await waitFor(
      () =>
        expect(fake.list).toHaveBeenCalledWith(
          expect.objectContaining({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
        ),
      { timeout: 5_000 },
    );
  }, 15_000);
});
