// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInboundRepository } from '@modules/Inbound/Application/Interfaces/IInboundRepository';
import type {
  InboundDiscrepancy,
  InboundPlan,
  QcResult,
  QcTask,
  ReceiptLine,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmReceiptLineInput,
  CreateInboundPlanInput,
  EvaluateQcTaskInput,
  InboundPlanFilter,
  RecordQcResultInput,
  RecordGateInInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/Inbound/Domain/Types/InboundPlanQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IInboundRepository }));
vi.mock('@modules/Inbound/Infrastructure/Repositories/InboundRepositoryInstance', () => ({
  get inboundRepository() {
    return repo.current;
  },
}));

import { InboundPage } from '@modules/Inbound/Presentation/Pages/InboundPage';

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
    reason: 'Gate-in is required before receiving.',
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

  getById = vi.fn((id: string) =>
    Promise.resolve(this.items.find((item) => item.id === id) ?? this.items[0]),
  );

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

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InboundPage />
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('InboundPage', () => {
  it('lists plans, shows line detail and validates receiving readiness state', async () => {
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    expect(screen.getByText('SKU-A')).toBeTruthy();
    expect(screen.getByText(/ETA: 2026-06-22T08:00:00.000Z/i)).toBeTruthy();
    expect(screen.getByText(/CoreFlow trace: core-flow-1/i)).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(await screen.findByText(/Gate-in is required before receiving/i)).toBeTruthy();
    expect(fake.validateReadiness).toHaveBeenCalledWith('inbound-plan-1', {
      attemptOverride: false,
    });
  });

  it('creates source document and records gate-in through repository commands', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage();

    await actor.type(await screen.findByLabelText('Source system'), 'ERP');
    await actor.type(screen.getByLabelText('Source document number'), 'ASN-10001');
    await actor.type(screen.getByLabelText('Supplier id'), 'supplier-1');
    await actor.type(screen.getByLabelText('Owner id'), 'owner-1');
    await actor.type(screen.getByLabelText('Warehouse id'), 'warehouse-1');
    await actor.type(screen.getByLabelText('Warehouse profile id'), 'profile-1');
    await actor.type(screen.getByLabelText('Expected arrival'), '2026-06-22T08:00');
    await actor.type(screen.getByLabelText('SKU id'), 'sku-1');
    await actor.type(screen.getByLabelText('UOM id'), 'uom-1');
    await actor.clear(screen.getByLabelText('Expected quantity'));
    await actor.type(screen.getByLabelText('Expected quantity'), '12');
    await actor.click(screen.getByRole('button', { name: 'Create inbound plan' }));

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceSystem: 'ERP',
          sourceDocumentNumber: 'ASN-10001',
          lines: [expect.objectContaining({ skuId: 'sku-1', expectedQuantity: 12 })],
        }),
      ),
    );
    const createInput = fake.create.mock.calls[0][0];
    expect(createInput.expectedArrivalAt).toMatch(/^2026-06-22T/);

    const gateForm = screen
      .getByRole('button', { name: 'Record gate-in' })
      .closest('form') as HTMLFormElement;
    await actor.type(within(gateForm).getByLabelText('Gate reference'), 'GATE-A-001');
    await actor.click(within(gateForm).getByRole('button', { name: 'Record gate-in' }));

    await waitFor(() =>
      expect(fake.recordGateIn).toHaveBeenCalledWith(
        'inbound-plan-1',
        expect.objectContaining({ gateReference: 'GATE-A-001' }),
      ),
    );
  });

  it('shows duplicate/idempotent source trace when backend returns duplicate flag', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.create.mockResolvedValueOnce(makePlan({ isDuplicate: true }));
    repo.current = fake;
    renderPage();

    await actor.type(await screen.findByLabelText('Source system'), 'ERP');
    await actor.type(screen.getByLabelText('Source document number'), 'ASN-10001');
    await actor.type(screen.getByLabelText('Supplier id'), 'supplier-1');
    await actor.type(screen.getByLabelText('Owner id'), 'owner-1');
    await actor.type(screen.getByLabelText('Warehouse id'), 'warehouse-1');
    await actor.type(screen.getByLabelText('Warehouse profile id'), 'profile-1');
    await actor.type(screen.getByLabelText('SKU id'), 'sku-1');
    await actor.type(screen.getByLabelText('UOM id'), 'uom-1');
    await actor.click(screen.getByRole('button', { name: 'Create inbound plan' }));

    expect(await screen.findByText(/existing inbound plan reused/i)).toBeTruthy();
  });

  it('creates source document with multiple lines and external line references', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage();

    await actor.type(await screen.findByLabelText('Source system'), 'ERP');
    await actor.clear(screen.getByLabelText('Source document type'));
    await actor.type(screen.getByLabelText('Source document type'), 'PO');
    await actor.type(screen.getByLabelText('Source document number'), 'PO-10001');
    await actor.type(screen.getByLabelText('Supplier id'), 'supplier-1');
    await actor.type(screen.getByLabelText('Owner id'), 'owner-1');
    await actor.type(screen.getByLabelText('Warehouse id'), 'warehouse-1');
    await actor.type(screen.getByLabelText('Warehouse profile id'), 'profile-1');
    await actor.type(screen.getByLabelText('SKU id'), 'sku-1');
    await actor.type(screen.getByLabelText('UOM id'), 'uom-1');
    await actor.clear(screen.getByLabelText('Expected quantity'));
    await actor.type(screen.getByLabelText('Expected quantity'), '12');
    await actor.type(screen.getByLabelText('External line reference'), '10');

    await actor.click(screen.getByRole('button', { name: 'Add line' }));
    const skuInputs = screen.getAllByLabelText('SKU id');
    const uomInputs = screen.getAllByLabelText('UOM id');
    const qtyInputs = screen.getAllByLabelText('Expected quantity');
    const refInputs = screen.getAllByLabelText('External line reference');
    await actor.type(skuInputs[1], 'sku-2');
    await actor.type(uomInputs[1], 'uom-2');
    await actor.clear(qtyInputs[1]);
    await actor.type(qtyInputs[1], '8');
    await actor.type(refInputs[1], '20');
    await actor.click(screen.getByRole('button', { name: 'Create inbound plan' }));

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

    await screen.findByRole('button', { name: 'ASN-10001' });
    expect(screen.getByRole('button', { name: 'Override readiness' })).toHaveProperty(
      'disabled',
      true,
    );

    await actor.type(screen.getByLabelText('Readiness reason code'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Override readiness' }));

    await waitFor(() =>
      expect(fake.validateReadiness).toHaveBeenLastCalledWith('inbound-plan-1', {
        attemptOverride: true,
        reasonCode: 'RC-V1-HANDOFF',
      }),
    );
    expect(await screen.findByText(/override accepted/i)).toBeTruthy();
  });

  it('starts receiving and confirms a scan receipt line through repository commands', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.clear(screen.getByLabelText('Receiving session key'));
    await actor.type(screen.getByLabelText('Receiving session key'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Start receiving' }));

    expect(await screen.findByText(/Receipt ASN-10001-RCPT ready/i)).toBeTruthy();
    await actor.type(screen.getByLabelText('Raw scan value'), '01012345678901281726010110LOT-A');
    await actor.clear(screen.getByLabelText('Idempotency key'));
    await actor.type(screen.getByLabelText('Idempotency key'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Confirm receipt line' });
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
    expect(await screen.findByText(/Line 1 Received/i)).toBeTruthy();
  });

  it('routes a confirmed discrepancy line with reason, evidence and idempotency', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.click(screen.getByRole('button', { name: 'Start receiving' }));
    expect(await screen.findByText(/Receipt ASN-10001-RCPT ready/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Actual quantity'));
    await actor.type(screen.getByLabelText('Actual quantity'), '14');
    await actor.clear(screen.getByLabelText('Idempotency key'));
    await actor.type(screen.getByLabelText('Idempotency key'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Confirm receipt line' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    expect(await screen.findByText(/Line 1 Discrepancy - QuantityVariance/i)).toBeTruthy();
    await actor.type(screen.getByLabelText('Discrepancy reason code'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Discrepancy evidence refs'), 'photo://dock/over-qty-1');
    await actor.clear(screen.getByLabelText('Discrepancy idempotency key'));
    await actor.type(screen.getByLabelText('Discrepancy idempotency key'), 'discrepancy-1');
    await actor.click(screen.getByRole('button', { name: 'Route discrepancy' }));

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
      await screen.findByText(/Discrepancy PendingApproval \/ Exception exception-1/i),
    ).toBeTruthy();
  });

  it('evaluates QC skipped after a confirmed receipt line', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.click(screen.getByRole('button', { name: 'Start receiving' }));
    expect(await screen.findByText(/Receipt ASN-10001-RCPT ready/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Idempotency key'));
    await actor.type(screen.getByLabelText('Idempotency key'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Confirm receipt line' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Line 1 Received/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('QC task idempotency key'));
    await actor.type(screen.getByLabelText('QC task idempotency key'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Evaluate QC' }));

    await waitFor(() => expect(fake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(fake.evaluateQcTask).toHaveBeenCalledWith('receipt-1', {
      receiptLineId: 'receipt-line-1',
      idempotencyKey: 'qc-task-skipped',
      forceRequired: false,
      reasonCode: null,
      reasonNote: null,
      evidenceRefs: [],
    });
    expect(await screen.findByText(/QC NotRequired \/ READY_FOR_PUTAWAY \/ Skipped/i)).toBeTruthy();
  });

  it('records required QC result with split quarantine disposition and evidence', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.click(screen.getByRole('button', { name: 'Start receiving' }));
    expect(await screen.findByText(/Receipt ASN-10001-RCPT ready/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Idempotency key'));
    await actor.type(screen.getByLabelText('Idempotency key'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Confirm receipt line' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Line 1 Received/i)).toBeTruthy();
    await actor.click(screen.getByLabelText('Force QC required'));
    await actor.clear(screen.getByLabelText('QC task idempotency key'));
    await actor.type(screen.getByLabelText('QC task idempotency key'), 'qc-task-required');
    await actor.click(screen.getByRole('button', { name: 'Evaluate QC' }));
    expect(await screen.findByText(/QC PendingQc \/ PENDING_QC \/ Forced/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('QC result status'), { target: { value: 'Failed' } });
    fireEvent.change(screen.getByLabelText('QC disposition'), { target: { value: 'Quarantine' } });
    fireEvent.change(screen.getByLabelText('Accepted quantity'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Rejected quantity'), { target: { value: '3' } });
    const recordButton = screen.getByRole('button', { name: 'Record QC result' });
    expect(recordButton).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText('QC result reason code'), {
      target: { value: 'RC-V1-DISCREPANCY' },
    });
    fireEvent.change(screen.getByLabelText('QC result evidence refs'), {
      target: { value: 'photo://qc/damaged-4' },
    });
    fireEvent.change(screen.getByLabelText('QC result idempotency key'), {
      target: { value: 'qc-result-split' },
    });
    expect(recordButton).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText('Rejected quantity'), { target: { value: '4' } });
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
    expect(await screen.findByText(/QC result Failed \/ target QUARANTINE/i)).toBeTruthy();
  });

  it('keeps discrepancy route disabled until a real evidence ref is provided', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.click(screen.getByRole('button', { name: 'Start receiving' }));
    await actor.clear(screen.getByLabelText('Actual quantity'));
    await actor.type(screen.getByLabelText('Actual quantity'), '14');
    await actor.clear(screen.getByLabelText('Idempotency key'));
    await actor.type(screen.getByLabelText('Idempotency key'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Confirm receipt line' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Line 1 Discrepancy - QuantityVariance/i)).toBeTruthy();
    const routeButton = screen.getByRole('button', { name: 'Route discrepancy' });
    expect(routeButton).toHaveProperty('disabled', true);
    await actor.type(screen.getByLabelText('Discrepancy reason code'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Discrepancy evidence refs'), ',,');
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

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.click(screen.getByRole('button', { name: 'Start receiving' }));
    await actor.type(screen.getByLabelText('Raw scan value'), 'wrong-sku-barcode');
    await actor.clear(screen.getByLabelText('Idempotency key'));
    await actor.type(screen.getByLabelText('Idempotency key'), 'receipt-line-wrong-sku');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Confirm receipt line' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Line 1 Discrepancy - WrongSku/i)).toBeTruthy();
    expect(screen.getByLabelText('Discrepancy type')).toHaveProperty('value', 'WrongSku');
  });

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

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.click(screen.getByRole('button', { name: 'Start receiving' }));
    await actor.clear(screen.getByLabelText('Actual quantity'));
    await actor.type(screen.getByLabelText('Actual quantity'), '14');
    await actor.clear(screen.getByLabelText('Idempotency key'));
    await actor.type(screen.getByLabelText('Idempotency key'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Confirm receipt line' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Discrepancy routing/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Use line 2' }));
    await waitFor(() => expect(screen.queryByText(/Discrepancy routing/i)).toBeNull());
  });

  it('shows an inline discrepancy route error when backend rejects capture', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    fake.captureDiscrepancy.mockRejectedValueOnce(
      new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Evidence is required' }),
    );
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.click(screen.getByRole('button', { name: 'Start receiving' }));
    await actor.clear(screen.getByLabelText('Actual quantity'));
    await actor.type(screen.getByLabelText('Actual quantity'), '14');
    await actor.clear(screen.getByLabelText('Idempotency key'));
    await actor.type(screen.getByLabelText('Idempotency key'), 'receipt-line-1');
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'Confirm receipt line' })
        .closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Line 1 Discrepancy - QuantityVariance/i)).toBeTruthy();
    await actor.type(screen.getByLabelText('Discrepancy reason code'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Discrepancy evidence refs'), 'photo://dock/over-qty-1');
    await actor.clear(screen.getByLabelText('Discrepancy idempotency key'));
    await actor.type(screen.getByLabelText('Discrepancy idempotency key'), 'discrepancy-error');
    await actor.click(screen.getByRole('button', { name: 'Route discrepancy' }));

    expect(await screen.findByText(/Unable to route discrepancy/i)).toBeTruthy();
  });

  it('clears stale readiness override after gate-in is recorded', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makePlan()]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.type(screen.getByLabelText('Readiness reason code'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Override readiness' }));
    expect(await screen.findByText(/override accepted/i)).toBeTruthy();

    const gateForm = screen
      .getByRole('button', { name: 'Record gate-in' })
      .closest('form') as HTMLFormElement;
    await actor.type(within(gateForm).getByLabelText('Gate reference'), 'GATE-A-001');
    await actor.click(within(gateForm).getByRole('button', { name: 'Record gate-in' }));

    await waitFor(() => expect(screen.queryByText(/override accepted/i)).toBeNull());
    expect(fake.recordGateIn).toHaveBeenCalledWith(
      'inbound-plan-1',
      expect.objectContaining({ gateReference: 'GATE-A-001' }),
    );
  });

  it('shows permission denied read-only state when list is forbidden', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No inbound read' })),
    );
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create inbound plan' })).toBeNull();
  });

  it('passes source-system and document-number filters to the repository', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makePlan({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
      makePlan({
        id: 'inbound-plan-2',
        sourceSystem: 'OWNER-PORTAL',
        sourceDocumentNumber: 'ASN-20001',
      }),
    ]);
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: 'ASN-10001' });
    await actor.type(screen.getByLabelText('Source system filter'), 'ERP');
    await actor.type(screen.getByLabelText('Document number filter'), 'ASN-10001');

    await waitFor(() =>
      expect(fake.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
      ),
    );
  });
});
