// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IPutawayRepository } from '@modules/Putaway/Application/Interfaces/IPutawayRepository';
import type {
  ConfirmPutawayTaskResult,
  PutawayTask,
} from '@modules/Putaway/Domain/Types/PutawayTask';
import type {
  ConfirmPutawayTaskInput,
  PutawayTaskListFilter,
  ReleasePutawayTaskInput,
} from '@modules/Putaway/Domain/Types/PutawayTaskQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IPutawayRepository }));
vi.mock('@modules/Putaway/Infrastructure/Repositories/PutawayRepositoryInstance', () => ({
  get putawayRepository() {
    return repo.current;
  },
}));

import { PutawayDetailPage } from '@modules/Putaway/Presentation/Pages/PutawayDetailPage';
import { PutawayPage as PutawayListPage } from '@modules/Putaway/Presentation/Pages/PutawayPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function makeTask(overrides: Partial<PutawayTask> = {}): PutawayTask {
  return {
    id: 'putaway-1',
    taskCode: 'PUT-001',
    taskStatus: 'Released',
    inboundPutawayReleaseId: 'release-1',
    receiptId: 'receipt-1',
    receiptLineId: 'receipt-line-1',
    inboundPlanId: 'plan-1',
    inboundPlanLineId: 'plan-line-1',
    inboundLpnId: 'lpn-1',
    ownerId: 'owner-1',
    ownerCode: 'OWN-A',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-A',
    skuId: 'sku-1',
    skuCode: 'SKU-A',
    uomId: 'uom-1',
    uomCode: 'EA',
    quantity: 5,
    lpnCode: 'LPN-001',
    ssccCode: null,
    inventoryStatusCode: 'READY_FOR_PUTAWAY',
    sourceLocationId: 'staging-1',
    sourceLocationCode: 'RCV-STG-01',
    targetLocationId: 'loc-1',
    targetLocationCode: 'A-01',
    targetLocationProfileId: 'profile-1',
    priority: 50,
    workPoolCode: null,
    assignedUserId: null,
    constraintJson: { SelectedBy: 'suggested_target' },
    eligibilityDecisionJson: { Decision: 'Released' },
    outboxMessageId: 'outbox-1',
    mobileTaskId: 'mobile-1',
    reasonCode: null,
    reasonCodeId: null,
    reasonNote: null,
    evidenceRefs: [],
    idempotencyKey: 'putaway-key-1',
    releasedAt: '2026-06-23T03:00:00.000Z',
    releasedBy: 'operator-1',
    isDuplicate: false,
    createdAt: '2026-06-23T03:00:00.000Z',
    updatedAt: '2026-06-23T03:00:00.000Z',
    ...overrides,
  };
}

function makeConfirmResult(
  task: PutawayTask = makeTask({ taskStatus: 'Confirmed' }),
): ConfirmPutawayTaskResult {
  return {
    putawayTask: task,
    inventoryTransaction: {
      id: 'transaction-1',
      transactionCode: 'ITX-001',
      transactionType: 'PutawayConfirm',
      transactionStatus: 'Posted',
      putawayTaskId: task.id,
      putawayTaskCode: task.taskCode,
      inventoryMovementId: 'movement-1',
      ownerId: task.ownerId,
      ownerCode: task.ownerCode,
      warehouseId: task.warehouseId,
      warehouseCode: task.warehouseCode,
      skuId: task.skuId,
      skuCode: task.skuCode,
      uomId: task.uomId,
      uomCode: task.uomCode,
      quantity: task.quantity,
      fromInventoryStatusCode: 'READY_FOR_PUTAWAY',
      toInventoryStatusCode: 'AVAILABLE',
      fromLocationId: task.sourceLocationId,
      fromLocationCode: task.sourceLocationCode,
      toLocationId: task.targetLocationId,
      toLocationCode: task.targetLocationCode,
      lpnCode: task.lpnCode,
      ssccCode: task.ssccCode,
      idempotencyKey: 'confirm-key-1',
      outboxMessageId: 'outbox-confirm-1',
      reasonCode: null,
      reasonCodeId: null,
      reasonNote: null,
      evidenceRefs: [],
      postedAt: '2026-06-23T04:00:00.000Z',
      postedBy: 'operator-1',
      createdAt: '2026-06-23T04:00:00.000Z',
      updatedAt: '2026-06-23T04:00:00.000Z',
    },
    inventoryMovement: {
      id: 'movement-1',
      movementCode: 'IMV-001',
      movementStatus: 'Posted',
      inventoryTransactionId: 'transaction-1',
      putawayTaskId: task.id,
      putawayTaskCode: task.taskCode,
      ownerId: task.ownerId,
      ownerCode: task.ownerCode,
      warehouseId: task.warehouseId,
      warehouseCode: task.warehouseCode,
      skuId: task.skuId,
      skuCode: task.skuCode,
      uomId: task.uomId,
      uomCode: task.uomCode,
      quantity: task.quantity,
      fromDimensionId: 'dimension-source',
      fromBalanceId: 'balance-source',
      fromLocationId: task.sourceLocationId,
      fromLocationCode: task.sourceLocationCode,
      fromInventoryStatusCode: 'READY_FOR_PUTAWAY',
      toDimensionId: 'dimension-target',
      toBalanceId: 'balance-target',
      toLocationId: task.targetLocationId,
      toLocationCode: task.targetLocationCode,
      toInventoryStatusCode: 'AVAILABLE',
      lpnCode: task.lpnCode,
      ssccCode: task.ssccCode,
      scanEvidenceJson: { StorageMilestone: 'Stored' },
      createdAt: '2026-06-23T04:00:00.000Z',
      createdBy: 'operator-1',
    },
    sourceBalance: {
      balanceId: 'balance-source',
      dimensionId: 'dimension-source',
      qtyOnHand: 0,
      qtyReserved: 0,
      qtyAvailable: 0,
    },
    targetBalance: {
      balanceId: 'balance-target',
      dimensionId: 'dimension-target',
      qtyOnHand: task.quantity,
      qtyReserved: 0,
      qtyAvailable: task.quantity,
    },
    scanResults: [
      {
        scanType: 'SourceLocation',
        rawValue: 'RCV-STG-01',
        expectedValue: 'RCV-STG-01',
        result: 'Accepted',
      },
      { scanType: 'TargetLocation', rawValue: 'A-01', expectedValue: 'A-01', result: 'Accepted' },
    ],
    outboxMessageId: 'outbox-confirm-1',
    isDuplicate: false,
  };
}

class FakeRepository implements Partial<IPutawayRepository> {
  public items: PutawayTask[];

  constructor(items: PutawayTask[] = []) {
    this.items = items;
  }

  list = vi.fn((filter?: PutawayTaskListFilter) =>
    Promise.resolve(
      page(
        this.items.filter((item) => {
          if (filter?.warehouseId && item.warehouseId !== filter.warehouseId) return false;
          if (filter?.taskStatus && item.taskStatus !== filter.taskStatus) return false;
          return true;
        }),
      ),
    ),
  );

  getById = vi.fn((id: string) => {
    const item = this.items.find((task) => task.id === id);
    return item
      ? Promise.resolve(item)
      : Promise.reject(
          new ApiError({ status: 404, code: 'NOT_FOUND', message: `Putaway task ${id} not found` }),
        );
  });

  release = vi.fn((input: ReleasePutawayTaskInput) => {
    const created = makeTask({
      id: 'putaway-new',
      inboundPutawayReleaseId: input.inboundPutawayReleaseId,
      sourceLocationCode: input.sourceLocationCode ?? 'RCV-STG-01',
      idempotencyKey: input.idempotencyKey,
    });
    this.items.unshift(created);
    return Promise.resolve(created);
  });

  confirm = vi.fn((taskId: string, input: ConfirmPutawayTaskInput) => {
    const task = this.items.find((item) => item.id === taskId) ?? makeTask({ id: taskId });
    const confirmed = makeTask({
      ...task,
      taskStatus: 'Confirmed',
      idempotencyKey: input.idempotencyKey,
    });
    return Promise.resolve(makeConfirmResult(confirmed));
  });
}

function renderPage(entry = '/putaway/putaway-1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/putaway/:id" element={<PutawayDetailPage />} />
          <Route path="/putaway/:id/:action" element={<PutawayDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderListPage(entry = '/putaway') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/putaway" element={<PutawayListPage />} />
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

describe('PutawayPage', () => {
  it('keeps putaway root list-only and routes actions to detail pages', async () => {
    const fake = new FakeRepository([makeTask()]);
    repo.current = fake;

    renderListPage();

    expect(await screen.findByText('PUT-001')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open detail' })).toHaveProperty(
      'href',
      expect.stringContaining('/putaway/putaway-1'),
    );
    expect(screen.getByRole('link', { name: /Confirm scan/i })).toHaveProperty(
      'href',
      expect.stringContaining('/putaway/putaway-1/confirm'),
    );
    expect(screen.queryByRole('button', { name: /Release putaway task/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Confirm putaway scan/i })).toBeNull();
    expect(fake.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, taskStatus: 'Released' }),
    );
  });

  it('renders putaway tasks and releases a new task through repository layer', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask()]);
    repo.current = fake;

    renderPage();

    expect(await screen.findByText('PUT-001')).toBeTruthy();
    await actor.type(screen.getByLabelText('Inbound putaway release id'), 'release-2');
    await actor.type(screen.getByLabelText('Source location code'), 'RCV-STG-02');
    await actor.type(screen.getByLabelText('Idempotency key'), 'putaway-key-2');
    await actor.click(screen.getByRole('button', { name: /Release putaway task/i }));

    await waitFor(() =>
      expect(fake.release).toHaveBeenCalledWith({
        inboundPutawayReleaseId: 'release-2',
        sourceLocationCode: 'RCV-STG-02',
        targetLocationId: undefined,
        priority: 50,
        workPoolCode: undefined,
        reasonCode: undefined,
        reasonNote: undefined,
        evidenceRefs: [],
        idempotencyKey: 'putaway-key-2',
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/putaway/putaway-new'),
    );
    expect(await screen.findByText(/PUT-001 released/i)).toBeTruthy();
  });

  it('shows backend blocked reason from ApiError', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask()]);
    fake.release = vi.fn(() =>
      Promise.reject(
        new ApiError({
          status: 400,
          code: 'BUSINESS_RULE',
          message: 'Target location is not eligible for putaway',
        }),
      ),
    );
    repo.current = fake;

    renderPage();

    await actor.type(screen.getByLabelText('Inbound putaway release id'), 'release-1');
    await actor.type(screen.getByLabelText('Idempotency key'), 'putaway-key-1');
    await actor.click(screen.getByRole('button', { name: /Release putaway task/i }));

    expect(await screen.findByText(/Target location is not eligible for putaway/i)).toBeTruthy();
  });

  it('confirms putaway scan through repository layer', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask()]);
    repo.current = fake;

    renderPage();

    await screen.findByText('PUT-001');
    await actor.click(screen.getByRole('button', { name: /Use for confirm/i }));
    expect(screen.getByLabelText('Source scan')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Target scan')).toHaveProperty('value', '');
    await actor.type(screen.getByLabelText('Source scan'), 'RCV-STG-01');
    await actor.type(screen.getByLabelText('Target scan'), 'A-01');
    await actor.type(screen.getByLabelText('LPN or SSCC scan'), 'LPN-001');
    await actor.type(screen.getByLabelText('Confirmed qty'), '5');
    await actor.clear(screen.getByLabelText('Confirm idempotency key'));
    await actor.type(screen.getByLabelText('Confirm idempotency key'), 'confirm-key-1');
    await actor.click(screen.getByRole('button', { name: /Confirm putaway scan/i }));

    await waitFor(() =>
      expect(fake.confirm).toHaveBeenCalledWith('putaway-1', {
        sourceLocationScan: 'RCV-STG-01',
        targetLocationScan: 'A-01',
        lpnScan: 'LPN-001',
        confirmedQuantity: 5,
        reasonCode: undefined,
        reasonNote: undefined,
        evidenceRefs: [],
        deviceCode: undefined,
        sessionId: undefined,
        idempotencyKey: 'confirm-key-1',
      }),
    );
    expect(await screen.findByText(/PUT-001 confirmed/i)).toBeTruthy();
    expect(await screen.findByText(/Transaction: ITX-001/i)).toBeTruthy();
  });

  it('keeps confirm disabled when quantity is not a positive number', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask()]);
    repo.current = fake;

    renderPage();

    await actor.type(screen.getByLabelText('Confirm task id'), 'putaway-1');
    await actor.type(screen.getByLabelText('Source scan'), 'RCV-STG-01');
    await actor.type(screen.getByLabelText('Target scan'), 'A-01');
    await actor.type(screen.getByLabelText('Confirmed qty'), 'abc');
    await actor.type(screen.getByLabelText('Confirm idempotency key'), 'confirm-key-1');

    expect(screen.getByRole('button', { name: /Confirm putaway scan/i })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('shows confirm blocked reason from ApiError', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask()]);
    fake.confirm = vi.fn(() =>
      Promise.reject(
        new ApiError({
          status: 400,
          code: 'BUSINESS_RULE',
          message: 'Putaway scan confirmation failed',
          details: {
            ScanResults: [
              {
                ScanType: 'TargetLocation',
                RawValue: 'WRONG-LOC',
                ExpectedValue: 'A-01',
                Result: 'Rejected',
              },
            ],
          },
        }),
      ),
    );
    repo.current = fake;

    renderPage();

    await actor.type(screen.getByLabelText('Confirm task id'), 'putaway-1');
    await actor.type(screen.getByLabelText('Source scan'), 'RCV-STG-01');
    await actor.type(screen.getByLabelText('Target scan'), 'WRONG-LOC');
    await actor.type(screen.getByLabelText('Confirm idempotency key'), 'confirm-key-1');
    await actor.click(screen.getByRole('button', { name: /Confirm putaway scan/i }));

    expect(await screen.findByText(/Putaway scan confirmation failed/i)).toBeTruthy();
    expect(await screen.findByText(/TargetLocation expected A-01, got WRONG-LOC/i)).toBeTruthy();
  });
});
