// @vitest-environment jsdom
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { IInboundPlanRepository } from '@modules/InboundPlan/Application/Interfaces/IInboundPlanRepository';
import type { IInboundReceivingRepository } from '@modules/InboundReceiving/Application/Interfaces/IInboundReceivingRepository';
import { isPlanLineFullyReleased } from '@modules/InboundReceiving/Presentation/Components/InboundLineStage';
import type { InboundPlan } from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type {
  InboundDiscrepancy,
  InboundLpn,
  InboundOperationalState,
  InboundPutawayRelease,
  QcResult,
  QcTask,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/InboundReceiving/Domain/Types/Receipt';
import type { Sku } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type {
  CaptureInboundDiscrepancyInput,
  ConfirmInboundLpnInput,
  ConfirmReceiptLineInput,
  EvaluateQcTaskInput,
  RecordQcResultInput,
  ReleaseInboundToPutawayInput,
  StartReceivingSessionInput,
  ValidateReceivingReadinessInput,
} from '@modules/InboundReceiving/Domain/Types/ReceiptQuery';

// InboundReceivingDetailPage reads plan/lines via the Plan module's own public
// read hook (useInboundPlan -> inboundPlanRepository.getById), so this file mocks
// BOTH repository-instance singletons at the same layer the already-split sibling
// tests mock at (repository-instance singleton mocks via vi.mock).
const planRepo = vi.hoisted(() => ({
  current: null as unknown as Partial<IInboundPlanRepository>,
}));
vi.mock('@modules/InboundPlan/Infrastructure/Repositories/InboundPlanRepositoryInstance', () => ({
  get inboundPlanRepository() {
    return planRepo.current;
  },
}));

const repo = vi.hoisted(() => ({ current: null as unknown as IInboundReceivingRepository }));
vi.mock('@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepositoryInstance', () => ({
  get inboundReceivingRepository() {
    return repo.current;
  },
}));

const catalogRepo = vi.hoisted(() => ({
  current: null as unknown as { getSku: ReturnType<typeof vi.fn> },
}));
vi.mock('@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance', () => ({
  get catalogRepository() {
    return catalogRepo.current;
  },
}));

// Bug fix: InboundReceivingDetailPage auto-chains a Putaway Task release right after a
// successful release-to-putaway, so it imports usePutawayMutations -> the real
// eager-singleton putawayRepository (constructs an env-validated ApiClient at import
// time) unless mocked here, same as every other repository above.
const putawayRepo = vi.hoisted(() => ({
  current: null as unknown as { release: ReturnType<typeof vi.fn> },
}));
vi.mock('@modules/Putaway/Infrastructure/Repositories/PutawayRepositoryInstance', () => ({
  get putawayRepository() {
    return putawayRepo.current;
  },
}));
putawayRepo.current = {
  release: vi.fn(() =>
    Promise.resolve({
      id: 'putaway-task-1',
      taskCode: 'PUT-TEST01',
      inboundPutawayReleaseId: 'release-1',
    }),
  ),
};

// Reason-code dropdowns (IFB-04): mock the options hook so panels render selectable codes.
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: () => ({
    options: [
      { value: 'RC-V1-HANDOFF', label: 'RC-V1-HANDOFF — Bàn giao' },
      { value: 'RC-V1-DISCREPANCY', label: 'RC-V1-DISCREPANCY — Sai lệch' },
      { value: 'RC-V1-MANUAL-SCAN', label: 'RC-V1-MANUAL-SCAN — Nhập tay' },
      { value: 'RC-V1-LABEL-OVERRIDE', label: 'RC-V1-LABEL-OVERRIDE — Ghi đè nhãn' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

import { InboundReceivingDetailPage } from '@modules/InboundReceiving/Presentation/Pages/InboundReceivingDetailPage';

vi.setConfig({ testTimeout: 15_000 });

const DEFAULT_RAW_SCAN = '01012345678901281726010110LOT-A';

// Default: no control flags on, so pre-existing receiving-flow tests (which don't
// fill Lot/Expiry/Serial) keep passing. IDC-03 tests override per-flag.
function skuFixture(overrides: Partial<Sku> = {}): Sku {
  return {
    id: 'sku-1',
    skuCode: 'SKU-A',
    skuName: 'Coca-Cola lon 330ml',
    defaultOwnerId: 'owner-1',
    itemClass: 'BEVERAGE',
    itemStatus: 'Active',
    baseUomId: 'uom-1',
    inventoryUomId: 'uom-1',
    lotControlled: false,
    expiryControlled: false,
    serialControlled: false,
    ownerControlled: false,
    lpnControlled: false,
    temperatureControlled: false,
    dgControlled: false,
    customsControlled: false,
    qcRequired: false,
    bondedFlag: false,
    temperatureClass: null,
    dgClass: null,
    shelfLifeDays: 365,
    minRemainingShelfLifeDays: 30,
    sourceSystem: null,
    referenceId: null,
    createdAt: '2026-06-22T08:00:00.000Z',
    updatedAt: '2026-06-22T08:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
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

class FakeInboundPlanRepository implements Partial<IInboundPlanRepository> {
  public items: InboundPlan[];

  constructor(initial: InboundPlan[] = []) {
    this.items = initial;
  }

  getById = vi.fn((id: string) => {
    const item = this.items.find((plan) => plan.id === id);
    return item
      ? Promise.resolve(item)
      : Promise.reject(
          new ApiError({ status: 404, code: 'NOT_FOUND', message: `Inbound plan ${id} not found` }),
        );
  });

  // Only asserted by the "clears stale readiness override" test below, to prove
  // an operational-side action never accidentally also records gate-in on the
  // Plan module's behalf now that the two live in separate repositories.
  recordGateIn = vi.fn();
}

class FakeInboundReceivingRepository implements Partial<IInboundReceivingRepository> {
  public readiness: ReceivingReadiness = {
    allowed: false,
    blocked: true,
    decision: 'Blocked',
    gateInRequired: true,
    gateInRecorded: false,
    overrideAccepted: false,
    reason: 'Cần ghi nhận vào cổng trước khi tiếp nhận.',
  };

  // IRM-02: persisted operational-state read model. Defaults to empty (so mutation-driven
  // tests behave as before via fallback); set `operationalState` to simulate reload rehydrate.
  public operationalState: InboundOperationalState | null = null;

  getOperationalState = vi.fn(
    (id: string): Promise<InboundOperationalState> =>
      Promise.resolve(
        this.operationalState ?? {
          inboundPlanId: id,
          receivingSessions: [],
          receiptLines: [],
          qcTasks: [],
          qcResults: [],
          lpns: [],
          releases: [],
          discrepancies: [],
        },
      ),
  );

  validateReadiness = vi.fn((_id: string, input?: ValidateReceivingReadinessInput) =>
    Promise.resolve(
      input?.attemptOverride
        ? { ...this.readiness, allowed: true, blocked: false, overrideAccepted: true }
        : this.readiness,
    ),
  );

  // All fixtures in this file use the default makePlan() header fields (sourceDocumentNumber
  // ASN-10001, owner-1/OWN-A, warehouse-1/WT-01) -- no test overrides them, so the receipt
  // fields below are hard-coded literals, mirroring the original monolithic FakeRepository.
  startReceivingSession = vi.fn(
    (id: string, input?: StartReceivingSessionInput): Promise<ReceivingSession> =>
      Promise.resolve({
        id: 'session-1',
        inboundPlanId: id,
        receiptId: 'receipt-1',
        receiptNumber: 'ASN-10001-RCPT',
        sessionKey: input?.sessionKey ?? 'dock-1',
        deviceCode: input?.deviceCode ?? null,
        ownerId: 'owner-1',
        ownerCode: 'OWN-A',
        warehouseId: 'warehouse-1',
        warehouseCode: 'WT-01',
        status: 'Open',
        startedAt: '2026-06-22T09:05:00.000Z',
        closedAt: null,
        isDuplicate: false,
        createdAt: '2026-06-22T09:05:00.000Z',
        updatedAt: '2026-06-22T09:05:00.000Z',
        startedBy: 'test-admin',
        updatedBy: null,
      }),
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
        lotNumber: input.lotNumber ?? null,
        expiryDate: input.expiryDate ?? null,
        serialNumber: input.serialNumber ?? null,
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

// Wires both repository fakes for a test in one call (mirrors the old file's single
// `repo.current = fake` line, split across the two now-separate modules).
function setup(plans: InboundPlan[] = [makePlan()]) {
  const planFake = new FakeInboundPlanRepository(plans);
  const receivingFake = new FakeInboundReceivingRepository();
  planRepo.current = planFake;
  repo.current = receivingFake;
  return { planFake, receivingFake };
}

function allowReceiving(fake: FakeInboundReceivingRepository) {
  fake.readiness = {
    ...fake.readiness,
    allowed: true,
    blocked: false,
    decision: 'Allowed',
    gateInRecorded: true,
    overrideAccepted: false,
    reason: 'Điều kiện tiếp nhận đã sẵn sàng.',
  };
}

async function expectReadinessAllowed() {
  await waitFor(() => expect(screen.getByTestId('inbound-receiving-panel')).toBeTruthy());
  expect(screen.queryByTestId('inbound-readiness-panel')).toBeNull();
}

async function openTechnicalDetails(actor: ReturnType<typeof userEvent.setup>, testId: string) {
  const details = screen.getByTestId(testId);
  if (!details.hasAttribute('open')) {
    const summary = details.querySelector('summary');
    if (!summary) {
      throw new Error(`Missing technical details summary for ${testId}`);
    }
    await actor.click(summary);
  }
  return details;
}

function renderReceivingPage(entry = '/inbound-receiving/inbound-plan-1', client?: QueryClient) {
  client ??= new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <NavigateProbe />
        <Routes>
          <Route path="/inbound-receiving/:id" element={<InboundReceivingDetailPage />} />
          <Route
            path="/inbound-receiving/:id/discrepancy/:lineId"
            element={<InboundReceivingDetailPage />}
          />
          <Route path="/inbound-receiving/:id/:action" element={<InboundReceivingDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Lets a test navigate the SAME mounted router to a different route matching an
// identical Route pattern without unmounting the page component.
function NavigateProbe() {
  const navigate = useNavigate();
  useEffect(() => {
    (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate = navigate;
  }, [navigate]);
  return null;
}

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location-probe" hidden>
      {location.pathname}
    </span>
  );
}

// Shared fixture for the IDC-07 tests below: two receipt lines on the same plan line
// (re-receive / multi-unit serial capture), QC result correlated only to the newer one.
function multiReceiptLineOperationalState(
  overrides: Partial<InboundOperationalState> = {},
): InboundOperationalState {
  return {
    inboundPlanId: 'inbound-plan-1',
    receivingSessions: [
      {
        inboundPlanId: 'inbound-plan-1',
        receiptId: 'receipt-1',
        startedAt: '2026-06-29T01:00:00Z',
      } as unknown as ReceivingSession,
    ],
    receiptLines: [
      {
        id: 'rl-old',
        receiptId: 'receipt-1',
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        status: 'Received',
        receivedAt: '2026-06-29T01:00:00Z',
        discrepancySignals: [],
      } as unknown as ReceiptLine,
      {
        id: 'rl-new',
        receiptId: 'receipt-1',
        inboundPlanId: 'inbound-plan-1',
        inboundPlanLineId: 'line-1',
        status: 'Received',
        receivedAt: '2026-06-29T05:00:00Z',
        discrepancySignals: [],
      } as unknown as ReceiptLine,
    ],
    qcTasks: [
      {
        id: 'qc-1',
        receiptLineId: 'rl-new',
        inboundPlanLineId: 'line-1',
        taskStatus: 'Dispositioned',
        required: true,
        createdAt: '2026-06-29T05:30:00Z',
      } as unknown as QcTask,
    ],
    qcResults: [
      {
        id: 'qcr-1',
        qcTaskId: 'qc-1',
        receiptLineId: 'rl-new',
        resultStatus: 'Passed',
        dispositionCode: 'Release',
        recordedAt: '2026-06-29T06:00:00Z',
      } as unknown as QcResult,
    ],
    lpns: [],
    releases: [],
    discrepancies: [],
    ...overrides,
  };
}

afterEach(() => cleanup());

// catalogRepo always gets a sane default (SKU with no control flags) so every test
// is order-independent -- IDC-03 tests override `.getSku` per-test as needed.
beforeEach(() => {
  catalogRepo.current = {
    getSku: vi.fn((id: string) => Promise.resolve(skuFixture({ id }))),
  };
});

describe('InboundReceivingDetailPage', () => {
  it('shows line detail and validates receiving readiness state', async () => {
    const { receivingFake } = setup([makePlan()]);
    renderReceivingPage();

    const railForList = await screen.findByTestId('inbound-line-rail');
    expect(within(railForList).getByText(/Dòng 1 — SKU-A/i)).toBeTruthy();
    expect(within(railForList).getByText(/Tham chiếu: 10/i)).toBeTruthy();
    // Line rail is the single unified line picker; focused console replaces the old aside.
    expect(screen.getByTestId('inbound-line-rail')).toBeTruthy();
    expect(screen.getByTestId('inbound-line-console')).toBeTruthy();
    // One authoritative step indicator in the console.
    expect(screen.getByTestId('inbound-console-step-indicator').textContent).toContain('Bước:');
    expect(await screen.findByText('Đi tới Vào cổng')).toBeTruthy();
    expect(receivingFake.validateReadiness).toHaveBeenCalledWith('inbound-plan-1', {
      attemptOverride: false,
    });
  });

  it('renders detail workflow stepper and marks deep-link actions active', async () => {
    const actionCases = [
      ['/inbound-receiving/inbound-plan-1', 'gate-in'],
      ['/inbound-receiving/inbound-plan-1/receiving', 'receiving'],
      ['/inbound-receiving/inbound-plan-1/discrepancy/line-1', 'receiving'],
      ['/inbound-receiving/inbound-plan-1/qc', 'qc'],
      ['/inbound-receiving/inbound-plan-1/lpn', 'lpn'],
      ['/inbound-receiving/inbound-plan-1/release', 'release'],
    ] as const;

    for (const [entry, stepKey] of actionCases) {
      setup([makePlan()]);
      const view = renderReceivingPage(entry);

      expect(await screen.findByRole('navigation', { name: 'Luồng xử lý nhập kho' })).toBeTruthy();
      expect(screen.queryByTestId('inbound-workflow-step-plan')).toBeNull();
      expect(screen.getByTestId('inbound-workflow-step-gate-in')).toBeTruthy();
      expect(screen.queryByTestId('inbound-workflow-step-readiness')).toBeNull();
      expect(screen.getByTestId('inbound-workflow-step-receiving')).toBeTruthy();
      expect(screen.getByTestId('inbound-workflow-step-qc')).toBeTruthy();
      expect(screen.getByTestId('inbound-workflow-step-lpn')).toBeTruthy();
      expect(screen.getByTestId('inbound-workflow-step-release')).toBeTruthy();
      expect(
        within(screen.getByTestId(`inbound-workflow-step-${stepKey}`)).getByText(
          /Đang xử lý|Bị chặn/,
        ),
      ).toBeTruthy();
      // Single focused console with one authoritative step indicator.
      expect(screen.getAllByTestId('inbound-line-console')).toHaveLength(1);
      expect(screen.getAllByTestId('inbound-console-step-indicator')).toHaveLength(1);

      view.unmount();
    }
  });

  it('shows a distinct approval-required stepper state (not the generic Blocked lock) when readiness resolves ApprovalRequired, and surfaces ruleCode in technical details (IFB-05)', async () => {
    const { receivingFake } = setup([
      makePlan({ gateInStatus: 'Recorded', gateInAt: '2026-06-22T09:00:00.000Z' }),
    ]);
    receivingFake.readiness = {
      ...receivingFake.readiness,
      allowed: false,
      blocked: true,
      decision: 'ApprovalRequired',
      gateInRecorded: true,
      overrideAccepted: false,
      reason: 'Gate-in requires approval before receiving.',
      ruleCode: 'RULE-IN-GATE-01',
    };
    const actor = userEvent.setup();
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    expect(await screen.findByTestId('inbound-workflow-step-receiving')).toBeTruthy();
    expect(
      within(screen.getByTestId('inbound-workflow-step-receiving')).getByText('Cần phê duyệt'),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId('inbound-workflow-step-receiving')).queryByText('Bị chặn'),
    ).toBeNull();
    // The override control stays available — ApprovalRequired is recoverable, not a dead end.
    expect(screen.getByTestId('inbound-readiness-panel')).toBeTruthy();
    // The panel's own status text must not read the same as a hard Blocked case.
    expect(screen.getByTestId('inbound-readiness-status').textContent).toContain(
      'Cần phê duyệt sẵn sàng',
    );
    // The console header title (a separate piece of on-screen copy) must agree with
    // the stepper instead of still saying the generic "đang bị chặn".
    expect(screen.getByTestId('inbound-console-step-action').textContent).toContain(
      'cần phê duyệt sẵn sàng',
    );
    expect(screen.getByTestId('inbound-console-step-action').textContent).not.toContain(
      'đang bị chặn',
    );

    const details = await openTechnicalDetails(actor, 'inbound-technical-details');
    expect(within(details).getByText('Cần phê duyệt')).toBeTruthy();
    expect(within(details).getByText('RULE-IN-GATE-01')).toBeTruthy();
  });

  it('shows inline, durable errors (not just the transient toast) for start-receiving-session and confirm-receipt-line failures, with the real backend message (IFB-06)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.startReceivingSession.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Receiving session already closed for this plan.',
      }),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(
      await screen.findByText('Receiving session already closed for this plan.'),
    ).toBeTruthy();

    // Retry succeeds so the flow can reach the confirm-receipt-line form.
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    receivingFake.confirmReceiptLine.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Actual quantity must be greater than zero.',
      }),
    );
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-err');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );
    expect(await screen.findByText('Actual quantity must be greater than zero.')).toBeTruthy();
  });

  it('shows an inline error for a failed readiness override, with the real backend message (IFB-06)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    receivingFake.validateReadiness.mockImplementation((_id, input) =>
      input?.attemptOverride
        ? Promise.reject(
            new ApiError({
              status: 403,
              code: 'FORBIDDEN',
              message: 'Reason code RC-V1-HANDOFF is not authorized for this action.',
            }),
          )
        : Promise.resolve(receivingFake.readiness),
    );
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    await screen.findByTestId('inbound-receiving-back-to-plan');
    await actor.selectOptions(screen.getByLabelText('Mã lý do sẵn sàng'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }));

    expect(
      await screen.findByText('Reason code RC-V1-HANDOFF is not authorized for this action.'),
    ).toBeTruthy();
  });

  it('exposes non-active step descriptions via aria-describedby without changing the accessible name', async () => {
    setup([makePlan()]);
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    expect(await screen.findByRole('navigation', { name: 'Luồng xử lý nhập kho' })).toBeTruthy();

    // A non-active step (receiving is `blocked` on the gate-in-inferred route) points
    // aria-describedby at an sr-only node carrying its description, while its
    // accessible name stays exactly `${label}: ${stateLabel}` (the description is
    // NOT folded into the name, so existing accessible-name queries stay valid).
    const receivingButton = screen.getByTestId('inbound-workflow-step-button-receiving');
    const describedBy = receivingButton.getAttribute('aria-describedby');
    expect(describedBy).toBe('inbound-workflow-step-desc-receiving');
    expect(receivingButton.getAttribute('aria-label')).toBe('Tiếp nhận: Bị chặn');
    const description = document.getElementById(describedBy as string);
    expect(description?.textContent).toBe('Cần vào cổng trước khi tiếp nhận.');

    // The active step (gate-in) shows its description as visible text below the stepper
    // and carries no aria-describedby (its description is not duplicated for AT).
    const gateInButton = screen.getByTestId('inbound-workflow-step-button-gate-in');
    expect(gateInButton.getAttribute('aria-describedby')).toBeNull();
    expect(screen.getByTestId('inbound-workflow-active-step-description').textContent).toContain(
      'Cần ghi nhận xe/hàng vào cổng ở trang Kế hoạch.',
    );
  });

  it('renders the line rail as the single unified line picker with per-line stage chips', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    renderReceivingPage();

    const rail = await screen.findByTestId('inbound-line-rail');
    // Lists every plan line.
    expect(within(rail).getByText(/Dòng 1 — SKU-A/i)).toBeTruthy();
    expect(within(rail).getByText(/Dòng 2 — SKU-B/i)).toBeTruthy();
    // Focused line (line-1) carries aria-current; non-focused lines honestly show "Chưa bắt đầu".
    expect(screen.getByTestId('inbound-line-rail-button-line-1').getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByTestId('inbound-line-rail-button-line-2').getAttribute('aria-current')).toBe(
      null,
    );
    expect(screen.getByTestId('inbound-line-stage-chip-line-2').textContent).toContain(
      'Chưa bắt đầu',
    );

    // Selecting a line drives the single setSelectedLineId mechanism. On desktop
    // the rail is always visible, so keyboard focus stays naturally on the clicked
    // rail line button (no focus-steal to the console); only a mobile collapse
    // moves focus, and then to the rail's own toggle.
    await actor.click(screen.getByTestId('inbound-line-rail-button-line-2'));
    expect(screen.getByTestId('inbound-line-rail-button-line-2').getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByTestId('inbound-workflow-progress-caption').textContent).toContain(
      'Dòng 2 — SKU-B',
    );
  });

  it('shows the blocked reason as a prominent single-source card inside the console', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/qc');

    const consoleEl = await screen.findByTestId('inbound-line-console');
    const blockedCard = within(consoleEl).getByTestId('inbound-action-blocked');
    // Single prominent blocked card, not muted fine print, not a popup.
    expect(blockedCard.textContent).toContain('Cần bắt đầu phiên tiếp nhận trước khi QC');
    expect(screen.getAllByTestId('inbound-action-blocked')).toHaveLength(1);
    // The active panel is suppressed while blocked.
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    // The ribbon remains read-only: clicking a non-done step does not open a popup.
    expect(within(consoleEl).getByTestId('inbound-console-step-indicator').textContent).toContain(
      'Bước:',
    );
  });

  it('shows the gate-in step as read-only with a redirect link to the Plan module instead of an actionable panel', async () => {
    setup([makePlan()]);
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const gateInStep = await screen.findByTestId('inbound-workflow-step-gate-in');
    expect(within(gateInStep).getByText('Đang xử lý')).toBeTruthy();
    // No actionable gate-in panel/form on this page — gate-in lives entirely on
    // the Plan module now; only a redirect link into it is rendered here.
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();
    const redirectLink = screen.getByRole('link', { name: 'Đi tới Vào cổng' });
    expect(redirectLink).toHaveProperty('href', expect.stringContaining('/inbound/inbound-plan-1/gate-in'));
    expect(screen.getByTestId('inbound-action-blocked').textContent).toContain(
      'Cần vào cổng trước khi tiếp tục — thao tác vào cổng nằm ở trang Kế hoạch.',
    );
    expect(screen.queryByTestId('inbound-readiness-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-receiving-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('renders readiness as the blocked receiving action', async () => {
    setup([makePlan()]);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    const receivingStep = await screen.findByTestId('inbound-workflow-step-receiving');
    const readinessPanel = screen.getByTestId('inbound-readiness-panel');

    expect(within(receivingStep).getByText('Bị chặn')).toBeTruthy();
    expect(screen.getByTestId('inbound-readiness-status').textContent).toContain(
      'Cần ghi nhận vào cổng',
    );
    expect(screen.getByTestId('inbound-readiness-helper').textContent).toContain(
      'Vào cổng chưa được ghi nhận',
    );
    expect(
      within(readinessPanel).getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }),
    ).toHaveProperty('disabled', true);
    expect(screen.queryByTestId('inbound-receiving-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('renders one receiving action panel when readiness is allowed', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    const receivingStep = await screen.findByTestId('inbound-workflow-step-receiving');

    expect(within(receivingStep).getByText('Đang xử lý')).toBeTruthy();
    await expectReadinessAllowed();
    expect(screen.getByTestId('inbound-receiving-panel')).toBeTruthy();
    expect(screen.getByTestId('inbound-receipt-technical-details').hasAttribute('open')).toBe(
      false,
    );
    expect(screen.getAllByText('Tiếp nhận hàng').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('inbound-current-line').textContent).toContain('SKU-A');
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveProperty('value', '12');
    expect(screen.getByLabelText('Quét mã hàng')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Xác nhận nhận hàng' })).toBeTruthy();
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
    expect(screen.getByTestId('inbound-receiving-start-helper').textContent).toContain(
      'Sẵn sàng bắt đầu phiên tiếp nhận',
    );
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'Cần bắt đầu phiên tiếp nhận',
    );
  });

  it('orders the operator workflow for mobile and keeps Closed lifecycle from gating execution', async () => {
    const { receivingFake } = setup([
      makePlan({
        status: 'Closed',
        gateInStatus: 'Recorded',
        gateInAt: '2026-06-22T09:00:00.000Z',
      }),
    ]);
    allowReceiving(receivingFake);

    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    expect(await screen.findByTestId('inbound-workflow-progress')).toBeTruthy();
    expect(screen.getByTestId('inbound-workflow-progress-caption').textContent).toContain(
      'Dòng 1 — SKU-A',
    );

    await expectReadinessAllowed();
    // Closed lifecycle alone must NOT gate execution.
    const startReceivingButton = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Bắt đầu tiếp nhận',
    });
    expect(startReceivingButton.disabled).toBe(false);

    // Page-level DOM source order: ribbon → line rail/console → recent activity →
    // technical details (the operator header/document-info now live on the Plan
    // module's own page and are not part of this DOM at all).
    const pageOrder = [
      'inbound-workflow-progress',
      'inbound-line-console',
      'inbound-line-rail',
      'inbound-recent-activity',
      'inbound-technical-details',
    ].map((testId) =>
      Array.from(document.body.querySelectorAll('[data-testid]')).findIndex(
        (element) => element.getAttribute('data-testid') === testId,
      ),
    );
    expect(pageOrder.every((position) => position >= 0)).toBe(true);

    // Mobile (below xl): console pinned ABOVE the rail. Desktop (xl): rail LEFT,
    // console RIGHT. Encoded with Tailwind order utilities on the two grid slots.
    const consoleSlot = screen.getByTestId('inbound-line-console-slot');
    const railSlot = screen.getByTestId('inbound-line-rail-slot');
    expect(consoleSlot.className).toContain('order-1');
    expect(consoleSlot.className).toContain('xl:order-2');
    expect(railSlot.className).toContain('order-2');
    expect(railSlot.className).toContain('xl:order-1');
  });

  it('shows the per-line execution cue and progress note in the ribbon band', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const { receivingFake } = setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    const cue = await screen.findByTestId('inbound-current-step-line-cue');
    expect(cue.textContent).toContain('Bước hiện tại — Dòng:');
    expect(cue.textContent).toContain('SKU-A');
    expect(screen.getByTestId('inbound-progress-note').textContent).toContain(
      'Tiến độ hiển thị theo dòng đang chọn.',
    );

    // The cue follows the focused line through the single selection mechanism.
    await actor.click(screen.getByTestId('inbound-line-rail-button-line-2'));
    expect(screen.getByTestId('inbound-current-step-line-cue').textContent).toContain('SKU-B');
  });

  it('keeps line selection reachable on mobile via the collapsible Dòng khác section', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const { receivingFake } = setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    // The collapsible `Dòng khác ({count})` control exists with the line count and
    // is collapsed by default (the list is mobile-hidden until expanded).
    const toggle = await screen.findByTestId('inbound-line-rail-toggle');
    expect(toggle.textContent).toContain('Dòng khác (2)');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const list = screen.getByTestId('inbound-line-rail-list');
    expect(list.className).toContain('hidden');
    expect(list.className).toContain('xl:block');

    // Expanding reveals the rows; selecting a line re-collapses so the console
    // returns to the top of the action area.
    await actor.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('inbound-line-rail-list').className).not.toContain('hidden');

    await actor.click(screen.getByTestId('inbound-line-rail-button-line-2'));
    expect(screen.getByTestId('inbound-line-rail-button-line-2').getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByTestId('inbound-line-rail-toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('locks the task card and discrepancy overlay when the inbound document is Cancelled', async () => {
    const { receivingFake } = setup([
      makePlan({
        status: 'Cancelled',
        gateInStatus: 'Recorded',
        gateInAt: '2026-06-22T09:00:00.000Z',
      }),
    ]);
    allowReceiving(receivingFake);

    renderReceivingPage('/inbound-receiving/inbound-plan-1/discrepancy/line-1');

    expect(
      await screen.findByText('Chứng từ đã hủy. Không thể tiếp tục thao tác nhập kho.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('inbound-discrepancy-overlay')).toBeNull();
    expect(screen.queryByTestId('inbound-receiving-panel')).toBeNull();
    expect(receivingFake.startReceivingSession).not.toHaveBeenCalled();
    expect(receivingFake.captureDiscrepancy).not.toHaveBeenCalled();
  });

  it('traps Tab/Shift+Tab focus inside the discrepancy modal (IFB-10)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-focus-trap');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    const dialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });

    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://dock/over-qty-1');
    await openTechnicalDetails(actor, 'inbound-discrepancy-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-focus-trap');
    const submitButton = screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' });
    // Two "Đóng báo sai lệch" buttons exist (the invisible click-outside
    // overlay + the header's real close button) — scope to the dialog itself
    // to get the header one, the actual first focusable element in tab order.
    const closeButton = within(dialog).getByRole('button', { name: 'Đóng báo sai lệch' });
    await waitFor(() => expect(submitButton).toHaveProperty('disabled', false));

    // Tab forward from the LAST focusable element wraps back to the FIRST
    // (the header close button) instead of escaping the dialog.
    submitButton.focus();
    expect(document.activeElement).toBe(submitButton);
    fireEvent.keyDown(submitButton, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    // Shift+Tab from the FIRST focusable element wraps back to the LAST.
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(submitButton);

    // Trap is scoped to the open dialog only — closing it removes the listener.
    await actor.click(closeButton);
    expect(screen.queryByTestId('inbound-discrepancy-overlay')).toBeNull();
  });

  it('traps focus correctly even with the technical-details disclosure left collapsed (IFB-10)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-focus-trap-collapsed');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    const dialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });

    // Fill required fields to enable the submit button WITHOUT opening the
    // technical-details disclosure that wraps the idempotency-key input — the
    // key already has a non-empty default, so this is the realistic "operator
    // never bothered to expand it" path.
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://dock/collapsed');
    const submitButton = screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' });
    const closeButton = within(dialog).getByRole('button', { name: 'Đóng báo sai lệch' });
    await waitFor(() => expect(submitButton).toHaveProperty('disabled', false));
    expect(dialog.querySelector('details')?.hasAttribute('open')).toBe(false);

    submitButton.focus();
    fireEvent.keyDown(submitButton, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(submitButton);
  });

  it('wraps focus at the disclosure toggle when the submit button is disabled, instead of escaping the dialog (IFB-10 live-flow regression)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-focus-trap-disabled');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    const dialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });

    // Deliberately leave the form UNFILLED — the submit button stays disabled
    // and is therefore excluded from the `:not([disabled])` focusable query,
    // and the technical-details disclosure stays collapsed.
    const submitButton = screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' });
    const closeButton = within(dialog).getByRole('button', { name: 'Đóng báo sai lệch' });
    expect(submitButton).toHaveProperty('disabled', true);
    expect(dialog.querySelector('details')?.hasAttribute('open')).toBe(false);

    const disclosureToggle = within(dialog).getByText('Chi tiết kỹ thuật');
    disclosureToggle.focus();
    expect(document.activeElement).toBe(disclosureToggle);
    fireEvent.keyDown(disclosureToggle, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(disclosureToggle);
  });

  it('shows a visually distinct terminal state for a Cancelled document, not the routine blocked state (IFB-07)', async () => {
    const { receivingFake } = setup([
      makePlan({
        status: 'Cancelled',
        gateInStatus: 'Recorded',
        gateInAt: '2026-06-22T09:00:00.000Z',
      }),
    ]);
    allowReceiving(receivingFake);

    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    // The terminal banner uses its own destructive title/copy, not the generic
    // "routine block" title reused for a recoverable step.
    expect(await screen.findByText('Chứng từ đã hủy')).toBeTruthy();
    expect(screen.queryByText('Thao tác chưa sẵn sàng')).toBeNull();

    // Gate-in already happened before cancellation — its `done` state (a fact of
    // history) is preserved, not overwritten to `cancelled`.
    const gateInStep = await screen.findByTestId('inbound-workflow-step-gate-in');
    expect(gateInStep.textContent).toContain('Hoàn tất');

    // Every step that had NOT cleared before cancellation reads as `cancelled`,
    // never the routine amber `blocked` state a live, recoverable step would show.
    for (const key of ['receiving', 'qc', 'lpn', 'release']) {
      const step = await screen.findByTestId(`inbound-workflow-step-${key}`);
      expect(step.textContent).toContain('Đã hủy');
      expect(step.textContent).not.toContain('Bị chặn');
    }
  });

  it('blocks QC deep-link until a receipt line is confirmed', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/qc');

    const blockedAction = await screen.findByTestId('inbound-action-blocked');

    expect(blockedAction.textContent).toContain('Cần bắt đầu phiên tiếp nhận trước khi QC');
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('blocks LPN deep-link until the line is ready for putaway', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/lpn');

    const blockedAction = await screen.findByTestId('inbound-action-blocked');

    expect(blockedAction.textContent).toContain(
      'Cần bắt đầu phiên tiếp nhận trước khi xác nhận LPN/SSCC',
    );
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('blocks release deep-link until putaway readiness and LPN requirement are satisfied', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/release');

    const blockedAction = await screen.findByTestId('inbound-action-blocked');

    expect(blockedAction.textContent).toContain('Cần bắt đầu phiên tiếp nhận trước khi release');
    expect(screen.queryByTestId('inbound-qc-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('resets actual quantity to expected quantity when operator selects another line', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const { receivingFake } = setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    await expectReadinessAllowed();
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveProperty('value', '12');

    await actor.click(screen.getByRole('button', { name: /Dòng 2 — SKU-B/i }));

    expect(screen.getByTestId('inbound-current-line').textContent).toContain('SKU-B');
    expect(screen.getByLabelText('Số lượng thực nhận')).toHaveProperty('value', '24');
  });

  it('blocks receipt confirmation until raw scan or manual reason is provided', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'Cần quét mã hàng',
    );
    expect(confirmButton).toHaveProperty('disabled', true);

    await actor.click(screen.getByLabelText('Xác nhận thủ công'));
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'Xác nhận thủ công cần mã lý do',
    );
    await actor.selectOptions(screen.getByLabelText('Mã lý do tiếp nhận'), 'RC-V1-MANUAL-SCAN');
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
  });

  it('allows readiness override only with reason code input', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    await screen.findByTestId('inbound-readiness-panel');
    expect(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' })).toHaveProperty(
      'disabled',
      true,
    );

    await actor.selectOptions(screen.getByLabelText('Mã lý do sẵn sàng'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }));

    await waitFor(() =>
      expect(receivingFake.validateReadiness).toHaveBeenLastCalledWith('inbound-plan-1', {
        attemptOverride: true,
        reasonCode: 'RC-V1-HANDOFF',
      }),
    );
    expect(await screen.findByTestId('inbound-receiving-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-readiness-panel')).toBeNull();
  });

  it('starts receiving and confirms a scan receipt line through repository commands', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));

    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() =>
      expect(receivingFake.startReceivingSession).toHaveBeenCalledWith('inbound-plan-1', {
        sessionKey: 'dock-1:user-1',
        deviceCode: 'rf-web',
      }),
    );
    await waitFor(() => expect(receivingFake.confirmReceiptLine).toHaveBeenCalledTimes(1));
    const [receiptId, receiptInput] = receivingFake.confirmReceiptLine.mock.calls[0];
    expect(receiptId).toBe('receipt-1');
    expect(receiptInput).toMatchObject({
      inboundPlanLineId: 'line-1',
      actualQuantity: 12,
      idempotencyKey: 'receipt-line-1',
      scanEvidence: {
        rawValue: DEFAULT_RAW_SCAN,
        resolvedSkuId: 'sku-1',
        resolvedUomId: 'uom-1',
      },
    });
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
  }, 15_000);

  it('shows and requires Số lô when the selected SKU is lotControlled, and passes it to confirmReceiptLine (IDC-03)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    catalogRepo.current.getSku.mockImplementation((id: string) =>
      Promise.resolve(skuFixture({ id, lotControlled: true })),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    expect(await screen.findByLabelText('Số lô')).toBeTruthy();
    expect(screen.queryByLabelText('Hạn dùng')).toBeNull();
    expect(screen.queryByLabelText('Số serial')).toBeNull();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    expect(confirmButton).toHaveProperty('disabled', true);
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'yêu cầu nhập số lô',
    );

    await actor.type(screen.getByLabelText('Số lô'), 'LOT-XYZ');
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(receivingFake.confirmReceiptLine).toHaveBeenCalledTimes(1));
    const [, receiptInput] = receivingFake.confirmReceiptLine.mock.calls[0];
    expect(receiptInput).toMatchObject({ lotNumber: 'LOT-XYZ', expiryDate: null, serialNumber: null });
  }, 15_000);

  it('shows and requires Hạn dùng when the selected SKU is expiryControlled, and passes it to confirmReceiptLine (IDC-03)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    catalogRepo.current.getSku.mockImplementation((id: string) =>
      Promise.resolve(skuFixture({ id, expiryControlled: true })),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    expect(screen.queryByLabelText('Số lô')).toBeNull();
    const expiryInput = await screen.findByLabelText('Hạn dùng');
    expect(expiryInput).toHaveProperty('type', 'date');
    expect(screen.queryByLabelText('Số serial')).toBeNull();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    expect(confirmButton).toHaveProperty('disabled', true);
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'yêu cầu nhập hạn dùng',
    );

    fireEvent.change(expiryInput, { target: { value: '2027-01-31' } });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(receivingFake.confirmReceiptLine).toHaveBeenCalledTimes(1));
    const [, receiptInput] = receivingFake.confirmReceiptLine.mock.calls[0];
    expect(receiptInput).toMatchObject({
      lotNumber: null,
      expiryDate: '2027-01-31',
      serialNumber: null,
    });
  }, 15_000);

  it('shows and requires Số serial when the selected SKU is serialControlled, and passes it to confirmReceiptLine (IDC-03)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    catalogRepo.current.getSku.mockImplementation((id: string) =>
      Promise.resolve(skuFixture({ id, serialControlled: true })),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    expect(screen.queryByLabelText('Số lô')).toBeNull();
    expect(screen.queryByLabelText('Hạn dùng')).toBeNull();
    expect(await screen.findByLabelText('Số serial')).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    expect(confirmButton).toHaveProperty('disabled', true);
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'yêu cầu nhập số serial',
    );

    await actor.type(screen.getByLabelText('Số serial'), 'SN-0001');
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(receivingFake.confirmReceiptLine).toHaveBeenCalledTimes(1));
    const [, receiptInput] = receivingFake.confirmReceiptLine.mock.calls[0];
    expect(receiptInput).toMatchObject({
      lotNumber: null,
      expiryDate: null,
      serialNumber: 'SN-0001',
    });
  }, 15_000);

  it('shows no Lot/Expiry/Serial inputs when the SKU has no identity control flags (IDC-03 regression)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await waitFor(() => expect(catalogRepo.current.getSku).toHaveBeenCalledWith('sku-1'));
    expect(screen.queryByLabelText('Số lô')).toBeNull();
    expect(screen.queryByLabelText('Hạn dùng')).toBeNull();
    expect(screen.queryByLabelText('Số serial')).toBeNull();
  }, 15_000);

  it('does not leak a Lot value typed for one line into a different line after switching (IDC-03 review fix)', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const { receivingFake } = setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(receivingFake);
    catalogRepo.current.getSku.mockImplementation((id: string) =>
      Promise.resolve(skuFixture({ id, lotControlled: true })),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(await screen.findByLabelText('Số lô'), 'LOT-LINE-1');
    expect(screen.getByLabelText('Số lô')).toHaveProperty('value', 'LOT-LINE-1');

    await actor.click(screen.getByTestId('inbound-line-rail-button-line-2'));
    await waitFor(() => expect(catalogRepo.current.getSku).toHaveBeenCalledWith('sku-2'));
    expect(await screen.findByLabelText('Số lô')).toHaveProperty('value', '');
  }, 15_000);

  it('blocks confirm-receipt until the SKU control flags finish loading, instead of failing open (IDC-03 review fix)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    let resolveSku: (sku: Sku) => void = () => {};
    catalogRepo.current.getSku.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSku = resolve;
        }),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');

    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    expect(confirmButton).toHaveProperty('disabled', true);
    expect(screen.getByTestId('inbound-receipt-line-helper').textContent).toContain(
      'Đang tải quy định',
    );

    resolveSku(skuFixture({ id: 'sku-1' }));
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
  }, 15_000);

  it('collapses the start-receiving form to a read-only summary once a session exists, leaving a single primary action (IFB-08)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();

    // Before a session exists: only the start-session form's button is present.
    expect(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' })).toBeTruthy();
    expect(screen.queryByTestId('inbound-receiving-session-summary')).toBeNull();

    await openTechnicalDetails(actor, 'inbound-receiving-session-technical-details');
    await actor.clear(screen.getByLabelText('Khóa phiên tiếp nhận'));
    await actor.type(screen.getByLabelText('Khóa phiên tiếp nhận'), 'dock-1:user-1');
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));

    // After a session exists: the start-session button is gone entirely (not
    // just disabled) — a single, unambiguous read-only summary replaces it, so
    // it never sits alongside "Xác nhận nhận hàng" as a second competing
    // full-width action.
    const summary = await screen.findByTestId('inbound-receiving-session-summary');
    expect(summary.textContent).toContain('Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng');
    expect(screen.queryByRole('button', { name: 'Bắt đầu tiếp nhận' })).toBeNull();
    expect(screen.queryByLabelText('Khóa phiên tiếp nhận')).toBeNull();

    // The confirm-line form/button is untouched — still the sole action, still
    // wired to the same repository call.
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-single-action');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(receivingFake.confirmReceiptLine).toHaveBeenCalledTimes(1));
  });

  it('opens completed-step summary from the stepper without re-firing mutations', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-summary');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(receivingFake.confirmReceiptLine).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();

    await actor.click(screen.getByTestId('inbound-workflow-step-button-receiving'));
    const summary = await screen.findByTestId('inbound-completed-step-summary');
    expect(within(summary).getByText('Tóm tắt bước đã hoàn tất')).toBeTruthy();
    expect(within(summary).getByText(/Tiếp nhận - Dòng 1 — SKU-A/i)).toBeTruthy();
    expect(within(summary).getByText('Số lượng thực nhận')).toBeTruthy();
    expect(within(summary).getByText('12 EA')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xác nhận nhận hàng' })).toBeNull();
    expect(receivingFake.confirmReceiptLine).toHaveBeenCalledTimes(1);

    await actor.click(screen.getByTestId('inbound-workflow-step-button-qc'));
    expect(screen.queryByTestId('inbound-completed-step-summary')).toBeNull();
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();

    // Clicking a blocked step in the read-only ribbon is INERT: it must NOT raise
    // a prominent blocked card over the active QC panel nor open a summary.
    await actor.click(screen.getByTestId('inbound-workflow-step-button-lpn'));
    expect(screen.getByTestId('inbound-qc-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-action-blocked')).toBeNull();
    expect(screen.queryByText(/LPN\/SSCC: Xác nhận LPN\/SSCC sau QC/i)).toBeNull();
    expect(screen.queryByTestId('inbound-completed-step-summary')).toBeNull();
    expect(receivingFake.confirmInboundLpn).not.toHaveBeenCalled();

    await actor.click(screen.getByTestId('inbound-workflow-step-button-receiving'));
    expect(await screen.findByTestId('inbound-completed-step-summary')).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Đóng tóm tắt bước đã hoàn tất' }));
    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-console')).toBe(document.activeElement),
    );
  }, 15_000);

  it('routes a confirmed discrepancy line with reason, evidence and idempotency', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    // The single canonical discrepancy trigger lives in the focused-line console;
    // the receiving panel no longer co-renders a competing trigger.
    expect(screen.queryByTestId('inbound-discrepancy-entry')).toBeNull();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/inbound-receiving/inbound-plan-1/discrepancy/line-1',
    );
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://dock/over-qty-1');
    await openTechnicalDetails(actor, 'inbound-discrepancy-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-1');
    await actor.click(screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' }));

    await waitFor(() => expect(receivingFake.captureDiscrepancy).toHaveBeenCalledTimes(1));
    const [receiptId, discrepancyInput] = receivingFake.captureDiscrepancy.mock.calls[0];
    expect(receiptId).toBe('receipt-1');
    expect(discrepancyInput).toMatchObject({
      receiptLineId: 'receipt-line-1',
      discrepancyType: 'QuantityVariance',
      reasonCode: 'RC-V1-DISCREPANCY',
      evidenceRefs: ['photo://dock/over-qty-1'],
      idempotencyKey: 'discrepancy-1',
    });
    await waitFor(() => expect(receivingFake.captureDiscrepancy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe(
        '/inbound-receiving/inbound-plan-1/receiving',
      ),
    );
    // Post-submit the single canonical overlay closes back to /receiving; the
    // receiving panel renders and focus returns to the always-visible focused-line
    // console (a visible surface on both desktop and mobile — the rail line button
    // is `display:none` while the rail is collapsed on mobile).
    expect(await screen.findByTestId('inbound-receiving-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-discrepancy-overlay')).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-console')).toBe(document.activeElement),
    );
  });

  it('keeps discrepancy as the single canonical surface: no inline trigger, reference-code evidence, no file picker', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();

    // The receiving panel must NOT co-render a competing discrepancy surface.
    const receivingPanel = screen.getByTestId('inbound-receiving-panel');
    expect(within(receivingPanel).queryByTestId('inbound-discrepancy-entry')).toBeNull();
    expect(within(receivingPanel).queryByRole('button', { name: /Báo sai lệch/i })).toBeNull();

    // Before a receipt line is confirmed the trigger is hidden entirely (it would
    // otherwise be a disabled, meaningless control with no line to report on).
    expect(screen.queryByTestId('inbound-discrepancy-trigger')).toBeNull();
    expect(screen.queryByRole('button', { name: /Báo sai lệch/i })).toBeNull();

    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    const enabledTrigger = screen.getByRole('button', { name: 'Báo sai lệch dòng này' });
    await waitFor(() => expect(enabledTrigger).toHaveProperty('disabled', false));
    await actor.click(enabledTrigger);

    const dialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });
    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/inbound-receiving/inbound-plan-1/discrepancy/line-1',
    );
    // Evidence is a reference-code field — exact relabel, no upload/"Thêm ảnh" wording.
    expect(within(dialog).getByLabelText('Mã tham chiếu bằng chứng')).toBeTruthy();
    expect(within(dialog).queryByLabelText('Bằng chứng (mã tham chiếu)')).toBeNull();
    expect(within(dialog).queryByText(/Thêm ảnh|Tải ảnh|Tải lên/i)).toBeNull();
    // No file picker anywhere in the discrepancy surface.
    expect(dialog.querySelector('input[type="file"]')).toBeNull();
    // First input (reason code) is focused on open.
    expect(within(dialog).getByLabelText('Mã lý do sai lệch')).toBe(document.activeElement);
  }, 15_000);

  it('surfaces the AC5 discrepancy-routing cue on the focused line before capture', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();

    // Same `needsDiscrepancyRouting` predicate that drives the QC blocked card:
    // the focused-line discrepancy trigger nudges the operator to handle the
    // discrepancy before QC, and the canonical trigger is enabled to do so.
    await waitFor(() =>
      expect(screen.getByTestId('inbound-discrepancy-trigger-helper').textContent).toContain(
        'Dòng có sai lệch',
      ),
    );
    expect(screen.getByRole('button', { name: 'Báo sai lệch dòng này' })).toHaveProperty(
      'disabled',
      false,
    );
  }, 15_000);

  it('shows the real backend message inline for a failed QC evaluation, not the old generic hard-coded copy (IFB-06)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.evaluateQcTask.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Receipt line has already been evaluated for QC.',
      }),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-qc-err');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-err');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));

    expect(await screen.findByText('Receipt line has already been evaluated for QC.')).toBeTruthy();
    expect(screen.queryByText('Không thể đánh giá QC.')).toBeNull();
  });

  it('shows the real backend message inline for a failed QC result recording, not the old generic hard-coded copy (IFB-06)', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.recordQcResult.mockRejectedValueOnce(
      new ApiError({
        status: 409,
        code: 'BUSINESS_RULE',
        message: 'QC result has already been recorded for this task.',
      }),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-qc-result-err');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await actor.click(screen.getByLabelText('Bắt buộc QC'));
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-result-err');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    expect(await screen.findByText(/QC PendingQc \/ PENDING_QC \/ Forced/i)).toBeTruthy();

    const recordButton = screen.getByRole('button', { name: 'Ghi nhận kết quả QC' });
    await openTechnicalDetails(actor, 'inbound-qc-result-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency kết quả QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency kết quả QC'), 'qc-result-err');
    await waitFor(() => expect(recordButton).toHaveProperty('disabled', false));
    fireEvent.submit(recordButton.closest('form') as HTMLFormElement);

    expect(
      await screen.findByText('QC result has already been recorded for this task.'),
    ).toBeTruthy();
    expect(screen.queryByText('Không thể ghi nhận kết quả QC.')).toBeNull();
  });

  it('evaluates QC skipped after a confirmed receipt line', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));

    await waitFor(() => expect(receivingFake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(receivingFake.evaluateQcTask).toHaveBeenCalledWith('receipt-1', {
      receiptLineId: 'receipt-line-1',
      idempotencyKey: 'qc-task-skipped',
      forceRequired: false,
      reasonCode: null,
      reasonNote: null,
      evidenceRefs: [],
    });
    await waitFor(() => expect(receivingFake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('inbound-workflow-step-qc').textContent).toContain('Không yêu cầu');
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();

    await actor.click(screen.getByTestId('inbound-workflow-step-button-qc'));
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    expect((await screen.findByTestId('inbound-qc-not-required-state')).textContent).toContain(
      'QC: Không yêu cầu',
    );
    // QC fast path: when the evaluated task is NOT required the record sub-form is
    // HIDDEN entirely (not merely disabled), so neither its submit button nor its
    // quantity inputs are in the DOM, while the LPN step is unblocked.
    expect(screen.queryByRole('button', { name: 'Ghi nhận kết quả QC' })).toBeNull();
    expect(screen.queryByLabelText('Số lượng đã kiểm')).toBeNull();
    expect(screen.queryByLabelText('Số lượng đạt')).toBeNull();
    expect(screen.queryByLabelText('Số lượng loại')).toBeNull();
    expect(screen.queryByLabelText('Trạng thái kết quả QC')).toBeNull();
    // The two-step model is intact: the first action stays present and distinct.
    expect(screen.getByRole('button', { name: 'Đánh giá QC' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xác nhận QC' })).toBeNull();
    expect(screen.queryByText(/Bỏ qua QC|Đã bỏ qua|Báo vấn đề QC/i)).toBeNull();
    expect(screen.queryByTestId('inbound-completed-step-summary')).toBeNull();

    // The read-only ribbon is no longer the navigator: clicking a `waiting` step
    // (LPN, here reachable but not active) is INERT and never raises a prominent
    // blocked card over the open QC panel.
    await actor.click(screen.getByTestId('inbound-workflow-step-button-lpn'));
    expect(screen.getByTestId('inbound-qc-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-action-blocked')).toBeNull();
  });

  it('confirms LPN/SSCC and releases READY_FOR_PUTAWAY line to putaway', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    await waitFor(() => expect(receivingFake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();

    // LPN/SSCC terminology (never "Pallet"): the panel title and both code fields.
    expect(screen.getByText('LPN/SSCC và phát hành cất hàng')).toBeTruthy();
    expect(screen.getByLabelText('Mã LPN')).toBeTruthy();
    expect(screen.getByLabelText('Mã SSCC')).toBeTruthy();
    expect(screen.queryByText(/Pallet/i)).toBeNull();
    expect(screen.queryByLabelText(/Pallet/i)).toBeNull();

    const releaseButton = screen.getByRole('button', { name: 'Phát hành sang cất hàng' });
    expect(releaseButton).toHaveProperty('disabled', true);
    await actor.type(screen.getByLabelText('Mã LPN'), 'LPN-0001');
    await actor.type(screen.getByLabelText('Mã SSCC'), '003456789012345678');
    await openTechnicalDetails(actor, 'inbound-lpn-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency LPN'));
    await actor.type(screen.getByLabelText('Khóa idempotency LPN'), 'lpn-1');
    await actor.click(screen.getByRole('button', { name: 'Xác nhận LPN/SSCC' }));

    expect(await screen.findByText(/LPN LPN-0001 \/ 003456789012345678/i)).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-release-technical-details');
    // Conditional upfront audit warning near releaseRequireLpn: it only matters once
    // the operator turns the requirement OFF, so it is absent while "Yêu cầu LPN" is on.
    expect(screen.queryByTestId('inbound-release-require-lpn-warning')).toBeNull();
    // Turning the requirement off surfaces the warning that the backend
    // WarehouseProfile may still require an LPN even when the UI option is off.
    await actor.click(screen.getByLabelText('Yêu cầu LPN'));
    expect(screen.getByTestId('inbound-release-require-lpn-warning').textContent).toContain(
      'Kho có thể vẫn yêu cầu LPN dù tắt tùy chọn này',
    );
    // Re-enable the requirement so the release payload below asserts requireLpn: true.
    await actor.click(screen.getByLabelText('Yêu cầu LPN'));
    expect(screen.queryByTestId('inbound-release-require-lpn-warning')).toBeNull();
    await actor.clear(screen.getByLabelText('Mã vị trí hiện tại'));
    await actor.type(screen.getByLabelText('Mã vị trí hiện tại'), 'RCV-01');
    await actor.clear(screen.getByLabelText('Khóa idempotency phát hành'));
    await actor.type(screen.getByLabelText('Khóa idempotency phát hành'), 'release-1');
    await waitFor(() => expect(releaseButton).toHaveProperty('disabled', false));
    fireEvent.submit(releaseButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(receivingFake.confirmInboundLpn).toHaveBeenCalledTimes(1));
    expect(receivingFake.confirmInboundLpn).toHaveBeenCalledWith('receipt-1', 'receipt-line-1', {
      lpnCode: 'LPN-0001',
      ssccCode: '003456789012345678',
      idempotencyKey: 'lpn-1',
    });
    await waitFor(() => expect(receivingFake.releaseInboundToPutaway).toHaveBeenCalledTimes(1));
    expect(receivingFake.releaseInboundToPutaway).toHaveBeenCalledWith('receipt-1', 'receipt-line-1', {
      currentLocationCode: 'RCV-01',
      requireLpn: true,
      attemptLabelOverride: false,
      reasonCode: null,
      evidenceRefs: [],
      idempotencyKey: 'release-1',
    });
    expect(
      await screen.findByText(/Đã phát hành 12 EA \/ READY_FOR_PUTAWAY \/ RCV-01/i),
    ).toBeTruthy();
  }, 15_000);

  it('shows backend release block reason inline', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.releaseInboundToPutaway.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'BUSINESS_RULE',
        message: 'Inventory status PENDING_QC cannot be released to putaway',
      }),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-skipped');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    await waitFor(() => expect(receivingFake.evaluateQcTask).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();

    await actor.click(screen.getByLabelText('Yêu cầu LPN'));
    await openTechnicalDetails(actor, 'inbound-release-technical-details');
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
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    await actor.click(screen.getByLabelText('Bắt buộc QC'));
    await openTechnicalDetails(actor, 'inbound-qc-task-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency tác vụ QC'));
    await actor.type(screen.getByLabelText('Khóa idempotency tác vụ QC'), 'qc-task-required');
    await actor.click(screen.getByRole('button', { name: 'Đánh giá QC' }));
    expect(await screen.findByText(/QC PendingQc \/ PENDING_QC \/ Forced/i)).toBeTruthy();

    // QC fast path: when required, the record sub-form is PRESENT and the three
    // quantities are pre-filled / auto-balanced from the line's actualQuantity
    // (inspected = accepted = 12, rejected = 0 so accepted + rejected === inspected).
    expect(screen.queryByTestId('inbound-qc-not-required-state')).toBeNull();
    expect(screen.getByLabelText('Số lượng đã kiểm')).toHaveProperty('value', '12');
    expect(screen.getByLabelText('Số lượng đạt')).toHaveProperty('value', '12');
    expect(screen.getByLabelText('Số lượng loại')).toHaveProperty('value', '0');
    // Two distinct steps remain — no collapsed single QC button.
    expect(screen.getByRole('button', { name: 'Đánh giá QC' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ghi nhận kết quả QC' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xác nhận QC' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Trạng thái kết quả QC'), {
      target: { value: 'Failed' },
    });
    fireEvent.change(screen.getByLabelText('Hướng xử lý QC'), { target: { value: 'Quarantine' } });
    fireEvent.change(screen.getByLabelText('Số lượng đạt'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Số lượng loại'), { target: { value: '3' } });
    const recordButton = screen.getByRole('button', { name: 'Ghi nhận kết quả QC' });
    expect(recordButton).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText('Mã lý do kết quả QC'), {
      target: { value: 'RC-V1-DISCREPANCY' },
    });
    fireEvent.change(screen.getByLabelText('Số lượng loại'), { target: { value: '4' } });
    await openTechnicalDetails(actor, 'inbound-qc-result-technical-details');
    fireEvent.change(screen.getByLabelText('Khóa idempotency kết quả QC'), {
      target: { value: 'qc-result-split' },
    });
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng kết quả QC'), {
      target: { value: ',,' },
    });
    expect(screen.getByTestId('inbound-qc-result-helper').textContent).toContain(
      'Kết quả QC này cần tham chiếu bằng chứng',
    );
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng kết quả QC'), {
      target: { value: 'photo://qc/damaged-4' },
    });
    await waitFor(() => expect(recordButton).toHaveProperty('disabled', false));
    fireEvent.submit(recordButton.closest('form') as HTMLFormElement);

    await waitFor(() => expect(receivingFake.recordQcResult).toHaveBeenCalledTimes(1));
    expect(receivingFake.recordQcResult).toHaveBeenCalledWith('qc-task-1', {
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
    await waitFor(() => expect(receivingFake.recordQcResult).toHaveBeenCalledTimes(1));
    const blockedAction = await screen.findByTestId('inbound-action-blocked');
    expect(blockedAction.textContent).toContain('READY_FOR_PUTAWAY');
    expect(screen.queryByTestId('inbound-release-putaway-panel')).toBeNull();
  });

  it('keeps discrepancy route disabled until a real evidence ref is provided', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    const discrepancyDialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });
    const routeButton = screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' });
    expect(routeButton).toHaveProperty('disabled', true);
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), ',,');
    expect(
      within(discrepancyDialog).getByTestId('inbound-discrepancy-helper').textContent,
    ).toContain('Nhập tham chiếu bằng chứng sai lệch');
    expect(routeButton).toHaveProperty('disabled', true);
    expect(receivingFake.captureDiscrepancy).not.toHaveBeenCalled();
  });

  it('defaults discrepancy type from the confirmed receipt-line signal', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.confirmReceiptLine.mockResolvedValueOnce({
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
      lotNumber: null,
      expiryDate: null,
      serialNumber: null,
      idempotencyKey: 'receipt-line-wrong-sku',
      receivedAt: '2026-06-22T09:10:00.000Z',
      receivedBy: 'test-admin',
      isDuplicate: false,
      createdAt: '2026-06-22T09:10:00.000Z',
      updatedAt: '2026-06-22T09:10:00.000Z',
    });
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.type(screen.getByLabelText('Quét mã hàng'), 'wrong-sku-barcode');
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-wrong-sku');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Sai SKU/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    expect(screen.getByLabelText('Loại sai lệch')).toHaveProperty('value', 'WrongSku');
  }, 15_000);

  it('resets discrepancy type to the default when opening a no-signal line', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    // Confirm the full expected quantity (12) so the line carries NO discrepancy
    // signal; opening the overlay must still land on the documented default type
    // rather than inheriting a stale value.
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '12');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    const trigger = await screen.findByRole('button', { name: 'Báo sai lệch dòng này' });
    await waitFor(() => expect(trigger).toHaveProperty('disabled', false));
    await actor.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    expect(screen.getByLabelText('Loại sai lệch')).toHaveProperty('value', 'QuantityVariance');
  }, 15_000);

  it('hides the discrepancy trigger before a confirmed line and shows it after', async () => {
    const actor = userEvent.setup();

    // Gate-in-inferred step: a line is focused but no receipt line is confirmed yet,
    // so the canonical trigger must be hidden (not a disabled, meaningless control).
    const { receivingFake: gateInFake } = setup([makePlan()]);
    allowReceiving(gateInFake);
    const gateInView = renderReceivingPage('/inbound-receiving/inbound-plan-1');
    await screen.findByTestId('inbound-workflow-step-gate-in');
    expect(screen.queryByTestId('inbound-discrepancy-trigger')).toBeNull();
    expect(screen.queryByRole('button', { name: /Báo sai lệch/i })).toBeNull();
    gateInView.unmount();
    cleanup();

    // Receiving step: still hidden before confirm; appears once a line is received.
    const { receivingFake: fake } = setup([makePlan()]);
    allowReceiving(fake);
    renderReceivingPage();

    await expectReadinessAllowed();
    expect(screen.queryByTestId('inbound-discrepancy-trigger')).toBeNull();

    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByTestId('inbound-discrepancy-trigger')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Báo sai lệch dòng này' })).toBeTruthy();
  }, 15_000);

  it('surfaces the filed-discrepancy status near the trigger after capture', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    expect(await screen.findByText(/Phiếu tiếp nhận ASN-10001-RCPT đã sẵn sàng/i)).toBeTruthy();

    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://dock/over-qty-1');
    await openTechnicalDetails(actor, 'inbound-discrepancy-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-1');
    await actor.click(screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' }));

    await waitFor(() => expect(receivingFake.captureDiscrepancy).toHaveBeenCalledTimes(1));
    // Overlay closes back to /receiving and the focused-line console now makes the
    // filed state obvious: a status line + a relabelled review/update trigger.
    await waitFor(() =>
      expect(screen.getByTestId('inbound-discrepancy-trigger-helper').textContent).toContain(
        'Đã báo sai lệch — Chờ phê duyệt',
      ),
    );
    expect(screen.getByRole('button', { name: 'Xem/cập nhật sai lệch' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Báo sai lệch dòng này' })).toBeNull();
  }, 15_000);

  it('hides the discrepancy trigger when a different, not-yet-received source line is selected', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([
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
    allowReceiving(receivingFake);
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    // Single canonical trigger lives in the focused-line console; the receiving
    // panel no longer co-renders a competing discrepancy surface.
    expect(screen.queryByTestId('inbound-discrepancy-entry')).toBeNull();
    expect(await screen.findByTestId('inbound-discrepancy-trigger')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Báo sai lệch dòng này' })).toHaveProperty(
      'disabled',
      false,
    );
    // Switching to line-2 (no confirmed receipt line) hides the trigger entirely:
    // discrepancy capture requires a received line, and line-1's filed state must
    // not leak onto the newly focused line.
    await actor.click(screen.getByRole('button', { name: /Dòng 2 — SKU-B/i }));
    await waitFor(() => expect(screen.queryByTestId('inbound-discrepancy-trigger')).toBeNull());
    expect(screen.queryByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Báo sai lệch/i })).toBeNull();
    expect(receivingFake.captureDiscrepancy).not.toHaveBeenCalled();
  });

  it('shows an inline discrepancy route error when backend rejects capture', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.captureDiscrepancy.mockRejectedValueOnce(
      new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Evidence is required' }),
    );
    renderReceivingPage();

    await expectReadinessAllowed();
    await actor.click(screen.getByRole('button', { name: 'Bắt đầu tiếp nhận' }));
    await actor.clear(screen.getByLabelText('Số lượng thực nhận'));
    await actor.type(screen.getByLabelText('Số lượng thực nhận'), '14');
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    await openTechnicalDetails(actor, 'inbound-receipt-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency'));
    await actor.type(screen.getByLabelText('Khóa idempotency'), 'receipt-line-1');
    fireEvent.submit(
      screen.getByRole('button', { name: 'Xác nhận nhận hàng' }).closest('form') as HTMLFormElement,
    );

    expect(await screen.findByText(/Dòng 1 Sai lệch - Chênh lệch số lượng/i)).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Báo sai lệch dòng này' }));
    expect(await screen.findByRole('dialog', { name: 'Báo sai lệch' })).toBeTruthy();
    await actor.selectOptions(screen.getByLabelText('Mã lý do sai lệch'), 'RC-V1-DISCREPANCY');
    await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://dock/over-qty-1');
    await openTechnicalDetails(actor, 'inbound-discrepancy-technical-details');
    await actor.clear(screen.getByLabelText('Khóa idempotency sai lệch'));
    await actor.type(screen.getByLabelText('Khóa idempotency sai lệch'), 'discrepancy-error');
    await actor.click(screen.getByRole('button', { name: 'Chuyển xử lý sai lệch' }));

    const discrepancyDialog = await screen.findByRole('dialog', { name: 'Báo sai lệch' });
    expect(
      await within(discrepancyDialog).findByText(/Không thể chuyển xử lý sai lệch/i),
    ).toBeTruthy();
  });

  it('does not accidentally record gate-in on the Plan module when readiness is overridden', async () => {
    const actor = userEvent.setup();
    const { planFake } = setup([makePlan()]);
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');

    await screen.findByTestId('inbound-receiving-back-to-plan');
    await actor.selectOptions(screen.getByLabelText('Mã lý do sẵn sàng'), 'RC-V1-HANDOFF');
    await actor.click(screen.getByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' }));
    expect(await screen.findByTestId('inbound-receiving-panel')).toBeTruthy();
    // A receiving-side action (readiness override) never reaches into the separate
    // Plan repository to record gate-in on the operator's behalf.
    expect(planFake.recordGateIn).not.toHaveBeenCalled();
  });

  it('shows permission denied read-only state when the plan read is forbidden', async () => {
    const { planFake } = setup();
    planFake.getById = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No inbound read' })),
    );
    renderReceivingPage();

    expect(await screen.findByText(/Không có quyền đọc kế hoạch nhập kho/i)).toBeTruthy();
    expect(screen.queryByTestId('inbound-line-console')).toBeNull();
  });

  it('rehydrates receiving progress from operational-state after reload without re-firing mutations', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = {
      inboundPlanId: 'inbound-plan-1',
      receivingSessions: [
        { inboundPlanId: 'inbound-plan-1', receiptId: 'receipt-1' } as unknown as ReceivingSession,
      ],
      receiptLines: [
        {
          id: 'receipt-line-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          status: 'Received',
          discrepancySignals: [],
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [],
      releases: [],
      discrepancies: [],
    };
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    // Persisted receipt line is rehydrated on load (simulating reload): the focused line's
    // stage reflects "Đã tiếp nhận" without any confirmReceiptLine mutation in this session.
    const chip = await screen.findByTestId('inbound-line-stage-chip-line-1');
    expect(chip.textContent).toContain('Đã tiếp nhận');
    expect(receivingFake.getOperationalState).toHaveBeenCalledWith('inbound-plan-1');
    expect(receivingFake.confirmReceiptLine).not.toHaveBeenCalled();
  });

  it('IFB-19: rehydrates a filed discrepancy from operational-state after reload, unblocking QC without re-filing', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = {
      inboundPlanId: 'inbound-plan-1',
      receivingSessions: [
        { inboundPlanId: 'inbound-plan-1', receiptId: 'receipt-1' } as unknown as ReceivingSession,
      ],
      receiptLines: [
        {
          id: 'receipt-line-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          status: 'Discrepancy',
          discrepancySignals: ['QuantityVariance'],
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [],
      releases: [],
      discrepancies: [
        {
          id: 'discrepancy-1',
          receiptId: 'receipt-1',
          receiptLineId: 'receipt-line-1',
          status: 'Routed',
          recordedAt: '2026-07-13T02:00:00Z',
        } as unknown as InboundDiscrepancy,
      ],
    };
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    // No mutation ever ran in this session (simulates a reload after the discrepancy was
    // filed in an earlier session) — the persisted read model alone must be enough to
    // unblock QC, mirroring evaluatedQcTask/recordedQcResult's mutation-first/persisted-
    // fallback pattern (IRM-02).
    await waitFor(() =>
      expect(screen.getByTestId('inbound-discrepancy-trigger-helper').textContent).toContain(
        'Đã báo sai lệch — Đã định tuyến',
      ),
    );
    expect(screen.getByRole('button', { name: 'Xem/cập nhật sai lệch' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Báo sai lệch dòng này' })).toBeNull();
    expect(await screen.findByTestId('inbound-qc-panel')).toBeTruthy();
    expect(receivingFake.captureDiscrepancy).not.toHaveBeenCalled();
  });

  it('IDC-07: renders a receipt-line rail when a plan line has multiple receipt lines and allows independently selecting each', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    // rl-old has no correlated QC result (stage stays "Đã tiếp nhận"), rl-new does (stage
    // becomes "Đã QC") — the opening assertions below also cover "latest wins by default".
    receivingFake.operationalState = multiReceiptLineOperationalState();
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const rail = await screen.findByTestId('inbound-receipt-line-rail');
    expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toContain('Đã QC');
    expect(within(rail).getByTestId('inbound-receipt-line-rail-button-rl-new').getAttribute(
      'aria-pressed',
    )).toBe('true');

    await actor.click(within(rail).getByTestId('inbound-receipt-line-rail-button-rl-old'));
    expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toContain(
      'Đã tiếp nhận',
    );
    expect(within(rail).getByTestId('inbound-receipt-line-rail-button-rl-old').getAttribute(
      'aria-pressed',
    )).toBe('true');

    await actor.click(within(rail).getByTestId('inbound-receipt-line-rail-button-rl-new'));
    expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toContain('Đã QC');
  });

  it('IDC-07: does not render the receipt-line rail when a plan line has only one receipt line', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = {
      inboundPlanId: 'inbound-plan-1',
      receivingSessions: [
        { inboundPlanId: 'inbound-plan-1', receiptId: 'receipt-1' } as unknown as ReceivingSession,
      ],
      receiptLines: [
        {
          id: 'receipt-line-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          status: 'Received',
          discrepancySignals: [],
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [],
      releases: [],
      discrepancies: [],
    };
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await screen.findByTestId('inbound-line-stage-chip-line-1');
    expect(screen.queryByTestId('inbound-receipt-line-rail')).toBeNull();
  });

  it('IDC-07: resets the selected receipt line when a different plan line is selected', async () => {
    const actor = userEvent.setup();
    const basePlan = makePlan();
    const { receivingFake } = setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 24,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState();
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const rail = await screen.findByTestId('inbound-receipt-line-rail');
    await actor.click(within(rail).getByTestId('inbound-receipt-line-rail-button-rl-old'));
    expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toContain(
      'Đã tiếp nhận',
    );

    // Switch to line-2 (no receipt lines yet) and back to line-1: the earlier explicit
    // rl-old selection must not silently persist — line-1 should fall back to latest (rl-new).
    await actor.click(screen.getByTestId('inbound-line-rail-button-line-2'));
    expect(screen.queryByTestId('inbound-receipt-line-rail')).toBeNull();
    await actor.click(screen.getByTestId('inbound-line-rail-button-line-1'));

    // Re-derive the rail (not just the stage chip) to catch a regression where a stale
    // filter (e.g. memoized on the wrong dependency) leaks line-2's empty receipt-line
    // set into line-1's re-render instead of correctly re-showing both rl-old/rl-new.
    const railAfterRoundTrip = await screen.findByTestId('inbound-receipt-line-rail');
    expect(within(railAfterRoundTrip).getByTestId('inbound-receipt-line-rail-button-rl-old')).toBeTruthy();
    expect(within(railAfterRoundTrip).getByTestId('inbound-receipt-line-rail-button-rl-new')).toBeTruthy();
    expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toContain('Đã QC');
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-new').getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('IDC-07 dual review: an explicit rail selection remains actionable after a NEW receiving-confirm for the same plan line, instead of the rail silently getting stuck on the fresh mutation result', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState();
    // Force the `receiving` step explicitly: this fixture's default-latest (rl-new) already
    // carries a recorded QC result, so the inferred step would otherwise advance past
    // receiving — but the reviewed bug is specifically about the receiving panel and the
    // rail being visible AT THE SAME TIME (both only require `activeWorkflowStep !== 'gate-in'`).
    renderReceivingPage('/inbound-receiving/inbound-plan-1/receiving');
    await expectReadinessAllowed();

    // Submit a brand-new receiving-confirm for the SAME plan line (e.g. a 3rd unit in a
    // multi-unit serial-controlled receive) — this seeds `mutations.confirmReceiptLine.data`,
    // which used to unconditionally win the confirmedReceiptLine fallback chain forever
    // (until a plan switch), permanently freezing the rail regardless of further clicks.
    await actor.type(screen.getByLabelText('Quét mã hàng'), DEFAULT_RAW_SCAN);
    const confirmButton = screen.getByRole('button', { name: 'Xác nhận nhận hàng' });
    await waitFor(() => expect(confirmButton).toHaveProperty('disabled', false));
    fireEvent.submit(confirmButton.closest('form') as HTMLFormElement);
    await waitFor(() => expect(receivingFake.confirmReceiptLine).toHaveBeenCalledTimes(1));

    // The rail must still be able to select a pre-existing receipt line after that —
    // this is the exact scenario the dual review found broken: the click used to be
    // silently ignored because the mutation cache kept winning over the rail selection.
    const rail = await screen.findByTestId('inbound-receipt-line-rail');
    await actor.click(within(rail).getByTestId('inbound-receipt-line-rail-button-rl-old'));
    expect(
      within(rail).getByTestId('inbound-receipt-line-rail-button-rl-old').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toContain(
      'Đã tiếp nhận',
    );

    await actor.click(within(rail).getByTestId('inbound-receipt-line-rail-button-rl-new'));
    expect(
      within(rail).getByTestId('inbound-receipt-line-rail-button-rl-new').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toContain('Đã QC');
  });

  it('IFB-21: shows the "Đã release một phần" badge (not "Đã release") when a released receipt line has not reached the plan line\'s expected quantity', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-partial',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-13T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [
        { id: 'lpn-partial', receiptLineId: 'rl-partial', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-partial',
          receiptLineId: 'rl-partial',
          inboundPlanLineId: 'line-1',
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toBe(
        'Đã release một phần',
      ),
    );
  });

  it("review fix: deriveLineStage's non-focused rail path also correctly shows 'Đã release một phần' for a partially-received SerialControlled line", async () => {
    const basePlan = makePlan();
    const { receivingFake } = setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 3,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(receivingFake);
    // line-1 stays the default-focused line and gets no operational data — irrelevant here.
    // Only line-2 (never focused/selected) gets receiving/QC/LPN/release data, so its chip
    // is driven purely by deriveLineStage's own computation, not deriveFocusedLineStage.
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-line2-partial',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-2',
          status: 'Received',
          receivedAt: '2026-07-13T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-line2-partial',
          receiptLineId: 'rl-line2-partial',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-2',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-13T01:30:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        {
          id: 'lpn-line2-partial',
          receiptLineId: 'rl-line2-partial',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-2',
        } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-line2-partial',
          receiptLineId: 'rl-line2-partial',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-2',
          quantity: 1,
          releasedAt: '2026-07-13T02:00:00Z',
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-2').textContent).toBe(
        'Đã release một phần',
      ),
    );
  });

  it('review fix: workflow stepper Release step does not show "Hoàn tất" for a partially-received SerialControlled line', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-partial-stepper',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-13T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-partial-stepper',
          receiptLineId: 'rl-partial-stepper',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-13T01:30:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        {
          id: 'lpn-partial-stepper',
          receiptLineId: 'rl-partial-stepper',
          inboundPlanLineId: 'line-1',
        } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-partial-stepper',
          receiptLineId: 'rl-partial-stepper',
          inboundPlanLineId: 'line-1',
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const releaseStepButton = await screen.findByTestId('inbound-workflow-step-button-release');
    // Before the review fix, releaseDone alone drove both the badge AND this stepper
    // node's state, so a partial release wrongly rendered "Hoàn tất" here too.
    expect(releaseStepButton.getAttribute('aria-label')).toBe('Release: Đang xử lý');
  });

  it("review fix: a substituted-SKU receipt line does not count toward the correct SKU's cumulative quantity for the badge", async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-wrong-sku',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-2',
          status: 'Received',
          receivedAt: '2026-07-13T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-correct-sku',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-13T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [
        { id: 'lpn-correct-sku', receiptLineId: 'rl-correct-sku', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-correct-sku',
          receiptLineId: 'rl-correct-sku',
          inboundPlanLineId: 'line-1',
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    // Without the SkuId filter, the wrong-SKU unit's quantity would wrongly count toward
    // sku-1's cumulative (1 wrong-sku + 1 correct = 2 >= 2 expected), showing the fully-released
    // badge even though only 1 of 2 expected sku-1 units has actually been received.
    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toBe(
        'Đã release một phần',
      ),
    );
  });

  it('IFB-21: shows the "Nhận thêm đơn vị" action when released but not fully received, and clicking it reopens the receiving panel for the same line', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-partial',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-13T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-partial',
          receiptLineId: 'rl-partial',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-13T01:30:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        { id: 'lpn-partial', receiptLineId: 'rl-partial', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-partial',
          receiptLineId: 'rl-partial',
          inboundPlanLineId: 'line-1',
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const receiveMoreButton = await screen.findByTestId('inbound-receive-more-units-button');
    // Review fix (IFB-22): the two continue-actions are mutually exclusive by state.
    expect(screen.queryByTestId('inbound-release-remaining-units-button')).toBeNull();
    await actor.click(receiveMoreButton);

    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/inbound-receiving/inbound-plan-1/receiving',
    );
    expect(await screen.findByTestId('inbound-receiving-panel')).toBeTruthy();
  });

  it('IFB-21: still shows the plain "Đã release" badge (no "Nhận thêm" action) once the plan line\'s expected quantity has been fully received', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-full-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-13T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-full-2',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-13T02:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-full-1',
          receiptLineId: 'rl-full-1',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-13T01:30:00Z',
        } as unknown as QcTask,
        {
          id: 'qc-full-2',
          receiptLineId: 'rl-full-2',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-13T02:30:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        { id: 'lpn-full-1', receiptLineId: 'rl-full-1', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
        { id: 'lpn-full-2', receiptLineId: 'rl-full-2', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-full-1',
          receiptLineId: 'rl-full-1',
          inboundPlanLineId: 'line-1',
          // IFB-22: a real release record always carries skuId/quantity (see
          // InboundPutawayRelease) -- filled in here so isPlanLineFullyReleased
          // (skuId-scoped, cumulative-quantity) also resolves "fully released"
          // for this fixture, same as isPlanLineFullyReceived already does.
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
        {
          id: 'release-full-2',
          receiptLineId: 'rl-full-2',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toContain(
        'Đã release',
      ),
    );
    expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).not.toContain(
      'một phần',
    );
    expect(screen.queryByTestId('inbound-receive-more-units-button')).toBeNull();
    // IFB-22 AC9 regression: a fully-received AND fully-released line must not
    // show the release-axis "continue" affordance either.
    expect(screen.queryByTestId('inbound-release-remaining-units-button')).toBeNull();
  });

  it('IFB-22: shows "Đã release một phần" (not "Đã release") when the plan line is fully received but only partially released', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-22-full-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-22-full-2',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-22-full-3',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:10:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [
        { id: 'lpn-22-full', receiptLineId: 'rl-22-full-3', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-22-partial',
          receiptLineId: 'rl-22-full-3',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toBe(
        'Đã release một phần',
      ),
    );
  });

  it('IFB-22: workflow stepper Release step does not show "Hoàn tất" when fully received but only partially released', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-22-stepper-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-22-stepper-2',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [
        { id: 'lpn-22-stepper', receiptLineId: 'rl-22-stepper-2', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-22-stepper',
          receiptLineId: 'rl-22-stepper-2',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const releaseStepButton = await screen.findByTestId('inbound-workflow-step-button-release');
    expect(releaseStepButton.getAttribute('aria-label')).toBe('Release: Đang xử lý');
    // Review fix (round 2): AC5's two partial-release description branches were
    // never asserted -- only the aria-label state was checked, so the
    // "...chưa nhận đủ" / "...chưa release" text could be swapped unnoticed.
    expect(screen.getByTestId('inbound-workflow-active-step-description').textContent).toBe(
      'Đã phát hành một phần — còn đơn vị chưa release.',
    );
  });

  it('IFB-22: shows the "Release đơn vị còn lại" action when fully received but only partially released, and clicking it reopens the release panel for the same line', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-22-action-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-22-action-2',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        // Both units passed QC before either was released -- matches the real
        // flow (QC/LPN happen per unit ahead of release), and lets the round-2
        // fix's re-targeted (still-outstanding) rl-22-action-1 actually reach
        // READY_FOR_PUTAWAY instead of being blocked on missing QC.
        {
          id: 'qc-22-action-1',
          receiptLineId: 'rl-22-action-1',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:20:00Z',
        } as unknown as QcTask,
        {
          id: 'qc-22-action-2',
          receiptLineId: 'rl-22-action-2',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:30:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        { id: 'lpn-22-action-1', receiptLineId: 'rl-22-action-1', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
        { id: 'lpn-22-action-2', receiptLineId: 'rl-22-action-2', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-22-action',
          receiptLineId: 'rl-22-action-2',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const releaseRemainingButton = await screen.findByTestId('inbound-release-remaining-units-button');
    // AC7: the two continue-actions are mutually exclusive by state.
    expect(screen.queryByTestId('inbound-receive-more-units-button')).toBeNull();
    await actor.click(releaseRemainingButton);

    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/inbound-receiving/inbound-plan-1/release',
    );
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();
    // Review fix (round 2): before the fix, `selectedReceiptLineId` stayed on
    // whichever line was most recently received/released (here rl-22-action-2,
    // the one already released) -- the button must instead target the still-
    // outstanding rl-22-action-1.
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-22-action-1').getAttribute('aria-current'),
    ).toBe('true');
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-22-action-2').getAttribute('aria-current'),
    ).toBeNull();
  });

  it("IFB-22: deriveLineStage's non-focused rail path also shows 'Đã release một phần' for a fully-received-but-partially-released SerialControlled line", async () => {
    const basePlan = makePlan();
    const { receivingFake } = setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 2,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(receivingFake);
    // line-1 stays the default-focused line and gets no operational data — irrelevant here.
    // Only line-2 (never focused/selected) gets receiving/LPN/release data, so its chip is
    // driven purely by deriveLineStage's own computation, not deriveFocusedLineStage.
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-line2-22-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-2',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-line2-22-2',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-2',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [
        { id: 'lpn-line2-22', receiptLineId: 'rl-line2-22-2', inboundPlanLineId: 'line-2' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-line2-22',
          receiptLineId: 'rl-line2-22-2',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-2',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-2').textContent).toBe(
        'Đã release một phần',
      ),
    );
  });

  it("IFB-23 review fix: deriveLineStage's non-focused rail path does not treat a substituted-SKU's receiving/QC/LPN/release rows as this line's own progress", async () => {
    const basePlan = makePlan();
    const { receivingFake } = setup([
      makePlan({
        lines: [
          ...basePlan.lines,
          {
            ...basePlan.lines[0],
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-2',
            skuCode: 'SKU-B',
            expectedQuantity: 2,
            externalLineReference: '20',
          },
        ],
      }),
    ]);
    allowReceiving(receivingFake);
    // line-1 stays the default-focused line and gets no operational data — irrelevant here.
    // Every row below shares line-2's inboundPlanLineId but belongs to a
    // substituted SKU, not sku-2 -- deriveLineStage's 4 existence flags
    // (receivingDone/qcResultDone/lpnDone/releaseDone) must not read true from
    // them, or a plan line whose OWN sku has zero activity would misreport as
    // in-progress/released instead of "Chưa bắt đầu".
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-line2-sub',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-9-substituted',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 2,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-line2-sub',
          receiptLineId: 'rl-line2-sub',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-9-substituted',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:10:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        {
          id: 'lpn-line2-sub',
          receiptLineId: 'rl-line2-sub',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-9-substituted',
        } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-line2-sub',
          receiptLineId: 'rl-line2-sub',
          inboundPlanLineId: 'line-2',
          skuId: 'sku-9-substituted',
          quantity: 2,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-2').textContent).toBe('Đã vào cổng'),
    );
  });

  it("IFB-22: a substituted-SKU release does not count toward the correct SKU's cumulative released quantity for the badge", async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-22-sku-1',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-22-sku-2',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      qcResults: [],
      lpns: [
        { id: 'lpn-22-sku', receiptLineId: 'rl-22-sku-2', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        // Released against a substituted SKU sharing the same lineId -- must not
        // count toward sku-1's cumulative released quantity.
        {
          id: 'release-22-wrong-sku',
          receiptLineId: 'rl-22-sku-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-9-substituted',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
        {
          id: 'release-22-correct-sku',
          receiptLineId: 'rl-22-sku-2',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    // Without the SkuId filter, the wrong-SKU release's quantity would wrongly count
    // toward sku-1's cumulative (1 wrong-sku + 1 correct = 2 >= 2 expected), showing the
    // fully-released badge even though only 1 of 2 expected sku-1 units has been released.
    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toBe(
        'Đã release một phần',
      ),
    );
  });

  it('IFB-23 review fix: "Release đơn vị còn lại" skips a permanently QC-blocked sibling and targets the next QC-ready one', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-23-nav-blocked',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T00:55:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-23-nav-outstanding',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-23-nav-released',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-23-nav-outstanding',
          receiptLineId: 'rl-23-nav-outstanding',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:20:00Z',
        } as unknown as QcTask,
        {
          id: 'qc-23-nav-released',
          receiptLineId: 'rl-23-nav-released',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:25:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [
        // Earliest-received sibling resolved AWAY from READY_FOR_PUTAWAY -- it can
        // never be released (see isPlanLineFullyReleased's own permanence comment),
        // so the "next unit to release" candidate must skip it, not just pick
        // whichever unmatched sibling was received first.
        {
          id: 'qcr-23-nav-blocked',
          receiptLineId: 'rl-23-nav-blocked',
          targetInventoryStatusCode: 'QUARANTINE',
          recordedAt: '2026-07-14T01:10:00Z',
        } as unknown as QcResult,
      ],
      lpns: [
        { id: 'lpn-23-nav-outstanding', receiptLineId: 'rl-23-nav-outstanding', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
        { id: 'lpn-23-nav-released', receiptLineId: 'rl-23-nav-released', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-23-nav',
          receiptLineId: 'rl-23-nav-released',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const releaseRemainingButton = await screen.findByTestId('inbound-release-remaining-units-button');
    await actor.click(releaseRemainingButton);

    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/inbound-receiving/inbound-plan-1/release',
    );
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-23-nav-outstanding').getAttribute('aria-current'),
    ).toBe('true');
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-23-nav-blocked').getAttribute('aria-current'),
    ).toBeNull();
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-23-nav-released').getAttribute('aria-current'),
    ).toBeNull();
  });

  it('IFB-23 review fix: hides "Release đơn vị còn lại" when the only outstanding sibling has not cleared QC yet (no valid candidate)', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-23-nogate-pending',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-23-nogate-released',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      // rl-23-nogate-pending has no QcTask/QcResult at all yet -- still awaiting
      // QC, not permanently blocked -- so it must stay in the required-quantity
      // denominator (fullyReleased stays false) while ALSO not being offered as
      // a release target (it isn't actually release-ready right now).
      qcTasks: [
        {
          id: 'qc-23-nogate-released',
          receiptLineId: 'rl-23-nogate-released',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:25:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        { id: 'lpn-23-nogate-released', receiptLineId: 'rl-23-nogate-released', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-23-nogate',
          receiptLineId: 'rl-23-nogate-released',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toBe(
        'Đã release một phần',
      ),
    );
    expect(screen.queryByTestId('inbound-release-remaining-units-button')).toBeNull();
  });

  it('re-review patch: hides "Release đơn vị còn lại" when the only QC-ready sibling still has no confirmed LPN (config requires LPN)', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-lpn-nolpn',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-lpn-released',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 2,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      // rl-lpn-nolpn is QC-ready (skipped task) but has no LPN row at all --
      // with the default releaseRequireLpn=true config, this line is NOT
      // actually release-ready yet, even though it passes the QC check alone.
      qcTasks: [
        {
          id: 'qc-lpn-nolpn',
          receiptLineId: 'rl-lpn-nolpn',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:20:00Z',
        } as unknown as QcTask,
        {
          id: 'qc-lpn-released',
          receiptLineId: 'rl-lpn-released',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:25:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        { id: 'lpn-lpn-released', receiptLineId: 'rl-lpn-released', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-lpn',
          receiptLineId: 'rl-lpn-released',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toBe(
        'Đã release một phần',
      ),
    );
    // rl-lpn-nolpn is QC-ready but not LPN-ready -- must not be offered as a
    // "next unit to release" candidate, or clicking it force-navigates to the
    // 'release' step and blockedActionMessage unmounts the whole panel with
    // no LPN form to actually resolve it.
    expect(screen.queryByTestId('inbound-release-remaining-units-button')).toBeNull();
  });

  it('re-review patch: "Release đơn vị còn lại" picks a deterministic candidate (by id) when two siblings share the exact same receivedAt', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      // rl-tie-a and rl-tie-b share the EXACT same receivedAt -- declared in
      // reverse-of-id array order so a naive stable sort with no secondary
      // key would keep them in this (wrong, non-deterministic) order.
      receiptLines: [
        {
          id: 'rl-tie-b',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-tie-a',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-tie-released',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:10:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-tie-b',
          receiptLineId: 'rl-tie-b',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:20:00Z',
        } as unknown as QcTask,
        {
          id: 'qc-tie-a',
          receiptLineId: 'rl-tie-a',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:21:00Z',
        } as unknown as QcTask,
        {
          id: 'qc-tie-released',
          receiptLineId: 'rl-tie-released',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:30:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        { id: 'lpn-tie-b', receiptLineId: 'rl-tie-b', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
        { id: 'lpn-tie-a', receiptLineId: 'rl-tie-a', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
        { id: 'lpn-tie-released', receiptLineId: 'rl-tie-released', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-tie',
          receiptLineId: 'rl-tie-released',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const releaseRemainingButton = await screen.findByTestId('inbound-release-remaining-units-button');
    await actor.click(releaseRemainingButton);

    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();
    // Deterministic tie-break by id: 'rl-tie-a' < 'rl-tie-b' lexicographically.
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-tie-a').getAttribute('aria-current'),
    ).toBe('true');
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-tie-b').getAttribute('aria-current'),
    ).toBeNull();
  });

  it('code-review patch: "Release đơn vị còn lại" targets the earliest-received valid candidate even when the backend array order disagrees', async () => {
    const actor = userEvent.setup();
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      // Deliberately declared OUT of receivedAt order: rl-sort-later (the
      // later-received, WRONG candidate) appears first in the array, then
      // rl-sort-earlier (the correct, earliest-received candidate), then the
      // already-released line last. A bare `.find()` with no sort would match
      // rl-sort-later first since array order alone is not a contract.
      receiptLines: [
        {
          id: 'rl-sort-later',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:05:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-sort-earlier',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
        {
          id: 'rl-sort-released',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:10:00Z',
          discrepancySignals: [],
          expectedQuantity: 3,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [
        {
          id: 'qc-sort-later',
          receiptLineId: 'rl-sort-later',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:20:00Z',
        } as unknown as QcTask,
        {
          id: 'qc-sort-earlier',
          receiptLineId: 'rl-sort-earlier',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:25:00Z',
        } as unknown as QcTask,
        {
          id: 'qc-sort-released',
          receiptLineId: 'rl-sort-released',
          inboundPlanLineId: 'line-1',
          taskStatus: 'NotRequired',
          required: false,
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          createdAt: '2026-07-14T01:30:00Z',
        } as unknown as QcTask,
      ],
      qcResults: [],
      lpns: [
        { id: 'lpn-sort-later', receiptLineId: 'rl-sort-later', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
        { id: 'lpn-sort-earlier', receiptLineId: 'rl-sort-earlier', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
        { id: 'lpn-sort-released', receiptLineId: 'rl-sort-released', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-sort',
          receiptLineId: 'rl-sort-released',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    const releaseRemainingButton = await screen.findByTestId('inbound-release-remaining-units-button');
    await actor.click(releaseRemainingButton);

    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-sort-earlier').getAttribute('aria-current'),
    ).toBe('true');
    expect(
      screen.getByTestId('inbound-receipt-line-rail-button-rl-sort-later').getAttribute('aria-current'),
    ).toBeNull();
  });

  it('IFB-23 review fix: keeps the release panel mounted (not re-blocked on QC) for a receipt line that was released and later re-inspected to a worse QC status', async () => {
    const { receivingFake } = setup([makePlan()]);
    allowReceiving(receivingFake);
    receivingFake.operationalState = multiReceiptLineOperationalState({
      receiptLines: [
        {
          id: 'rl-23-reinspect',
          receiptId: 'receipt-1',
          inboundPlanId: 'inbound-plan-1',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          status: 'Received',
          receivedAt: '2026-07-14T01:00:00Z',
          discrepancySignals: [],
          expectedQuantity: 1,
          actualQuantity: 1,
        } as unknown as ReceiptLine,
      ],
      qcTasks: [],
      // Released while READY_FOR_PUTAWAY, then re-inspected afterward to a
      // blocked status -- `putawayReady` (driven by the LATEST QcResult) now
      // reads false, but the release already exists and must not be hidden.
      qcResults: [
        {
          id: 'qcr-23-reinspect-1',
          receiptLineId: 'rl-23-reinspect',
          targetInventoryStatusCode: 'READY_FOR_PUTAWAY',
          recordedAt: '2026-07-14T01:10:00Z',
        } as unknown as QcResult,
        {
          id: 'qcr-23-reinspect-2',
          receiptLineId: 'rl-23-reinspect',
          targetInventoryStatusCode: 'QUARANTINE',
          recordedAt: '2026-07-14T01:30:00Z',
        } as unknown as QcResult,
      ],
      lpns: [
        { id: 'lpn-23-reinspect', receiptLineId: 'rl-23-reinspect', inboundPlanLineId: 'line-1' } as unknown as InboundLpn,
      ],
      releases: [
        {
          id: 'release-23-reinspect',
          receiptLineId: 'rl-23-reinspect',
          inboundPlanLineId: 'line-1',
          skuId: 'sku-1',
          quantity: 1,
        } as unknown as InboundPutawayRelease,
      ],
    });
    renderReceivingPage('/inbound-receiving/inbound-plan-1');

    // Panel must still mount and show the existing release, not the
    // "Cần trạng thái READY_FOR_PUTAWAY trước khi release." blocked message.
    expect(await screen.findByTestId('inbound-release-putaway-panel')).toBeTruthy();
    expect(screen.queryByText('Cần trạng thái READY_FOR_PUTAWAY trước khi release.')).toBeNull();
    // Code-review patch: the completeness math itself must also stay correct --
    // this line's only receipt line already has a release covering its full
    // quantity, so the badge must read fully "Đã release", not regress to
    // "Đã release một phần" just because a later re-inspection moved the
    // QC status away from READY_FOR_PUTAWAY.
    await waitFor(() =>
      expect(screen.getByTestId('inbound-line-stage-chip-line-1').textContent).toBe('Đã release'),
    );
  });

});

describe('isPlanLineFullyReleased (review fix)', () => {
  it('returns false when there is no matching receipt line even if a release record matches lineId/skuId', () => {
    const releases = [
      { receiptLineId: 'rl-orphan', inboundPlanLineId: 'line-1', skuId: 'sku-1', quantity: 1, releasedAt: '2026-07-13T01:00:00Z' },
    ];

    expect(isPlanLineFullyReleased([], releases, [], 'line-1', 'sku-1')).toBe(false);
  });

  it('IFB-23 review fix: excludes a permanently QC-blocked receipt line from the required quantity, so completeness is reachable once every releasABLE unit is released', () => {
    const receiptLines = [
      { id: 'rl-a', inboundPlanLineId: 'line-1', actualQuantity: 1, skuId: 'sku-1' },
      { id: 'rl-b', inboundPlanLineId: 'line-1', actualQuantity: 1, skuId: 'sku-1' },
    ];
    const qcResults = [
      { receiptLineId: 'rl-b', targetInventoryStatusCode: 'QUARANTINE', recordedAt: '2026-07-13T01:00:00Z' },
    ];
    const releases = [
      { receiptLineId: 'rl-a', inboundPlanLineId: 'line-1', skuId: 'sku-1', quantity: 1, releasedAt: '2026-07-13T02:00:00Z' },
    ];

    expect(isPlanLineFullyReleased(receiptLines, releases, qcResults, 'line-1', 'sku-1')).toBe(true);
  });

  it('IFB-23 review fix: dedupes a receipt line with 2 release rows before summing, instead of double-counting it', () => {
    const receiptLines = [
      { id: 'rl-a', inboundPlanLineId: 'line-1', actualQuantity: 1, skuId: 'sku-1' },
      { id: 'rl-b', inboundPlanLineId: 'line-1', actualQuantity: 1, skuId: 'sku-1' },
    ];
    const releases = [
      { receiptLineId: 'rl-a', inboundPlanLineId: 'line-1', skuId: 'sku-1', quantity: 1, releasedAt: '2026-07-13T01:00:00Z' },
      { receiptLineId: 'rl-a', inboundPlanLineId: 'line-1', skuId: 'sku-1', quantity: 1, releasedAt: '2026-07-13T02:00:00Z' },
    ];

    // rl-a's duplicate release rows must collapse to ONE unit's worth of
    // quantity (1), not 2 -- rl-b was never released, so this must stay false.
    expect(isPlanLineFullyReleased(receiptLines, releases, [], 'line-1', 'sku-1')).toBe(false);
  });

  it('code-review patch: keeps counting an already-released receipt line even after it is re-inspected to a worse QC status', () => {
    const receiptLines = [{ id: 'rl-a', inboundPlanLineId: 'line-1', actualQuantity: 1, skuId: 'sku-1' }];
    const releases = [
      { receiptLineId: 'rl-a', inboundPlanLineId: 'line-1', skuId: 'sku-1', quantity: 1, releasedAt: '2026-07-13T02:00:00Z' },
    ];
    const qcResults = [
      { receiptLineId: 'rl-a', targetInventoryStatusCode: 'READY_FOR_PUTAWAY', recordedAt: '2026-07-13T01:00:00Z' },
      { receiptLineId: 'rl-a', targetInventoryStatusCode: 'QUARANTINE', recordedAt: '2026-07-13T03:00:00Z' },
    ];

    // rl-a already has a release covering its full actualQuantity -- the
    // LATER re-inspection to QUARANTINE must not strip it out of the
    // completeness math retroactively; it stays fully released.
    expect(isPlanLineFullyReleased(receiptLines, releases, qcResults, 'line-1', 'sku-1')).toBe(true);
  });
});
