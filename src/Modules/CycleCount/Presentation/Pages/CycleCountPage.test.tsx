// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CycleCountCreatePage,
  CycleCountDetailPage,
} from '@modules/CycleCount/Presentation/Pages/CycleCountDetailPage';
import { CycleCountPage } from '@modules/CycleCount/Presentation/Pages/CycleCountPage';
import { useCycleCountMutations } from '@modules/CycleCount/Application/Commands/UseCycleCountMutations';
import {
  useCycleCountWork,
  useCycleCountWorks,
} from '@modules/CycleCount/Application/Queries/UseCycleCountWorks';
import type { CycleCountWork } from '@modules/CycleCount/Domain/Types/CycleCountWork';

vi.mock('@modules/CycleCount/Application/Commands/UseCycleCountMutations', () => ({
  useCycleCountMutations: vi.fn(),
}));

vi.mock('@modules/CycleCount/Application/Queries/UseCycleCountWorks', () => ({
  useCycleCountWorks: vi.fn(),
  useCycleCountWork: vi.fn(),
}));

function makeWork(overrides: Partial<CycleCountWork> = {}): CycleCountWork {
  return {
    id: 'work-1',
    countCode: 'CC-001',
    workStatus: 'CountingLocked',
    sourceBalanceId: 'balance-1',
    lockedBalanceId: 'balance-1',
    originalInventoryStatusCode: 'AVAILABLE',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-1',
    ownerId: 'owner-1',
    ownerCode: 'OWN',
    skuId: 'sku-1',
    skuCode: 'SKU-1',
    locationId: 'loc-1',
    locationCode: 'A-01',
    uomId: 'uom-1',
    uomCode: 'EA',
    lpnCode: null,
    expectedQuantity: 4,
    countedQuantity: null,
    varianceQuantity: null,
    toleranceQuantity: 0,
    approvalRequestId: null,
    lockTransactionId: 'tx-lock',
    adjustmentTransactionId: null,
    unlockTransactionId: null,
    reasonCode: 'RC-V1-HOLD-RELEASE',
    reasonCodeId: 'reason-1',
    reasonNote: null,
    evidenceRefs: [],
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:00:00.000Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

const mutationState = () => ({
  createWork: { mutate: vi.fn(), isPending: false, error: null },
  submitWork: { mutate: vi.fn(), isPending: false, error: null },
  recountWork: { mutate: vi.fn(), isPending: false, error: null },
  postAdjustment: { mutate: vi.fn(), isPending: false, error: null },
  unlockWork: { mutate: vi.fn(), isPending: false, error: null },
});

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/cycle-count']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('CycleCount list/detail pages', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(useCycleCountWorks).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCycleCountWorks>);
    vi.mocked(useCycleCountWork).mockReturnValue({
      data: makeWork(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCycleCountWork>);
    vi.mocked(useCycleCountMutations).mockReturnValue(
      mutationState() as unknown as ReturnType<typeof useCycleCountMutations>,
    );
  });

  it('waits for a warehouse scope filter before loading cycle count works', () => {
    renderWithRouter(<CycleCountPage />);

    expect(screen.getByText('Enter a warehouse to load cycle count works.')).toBeTruthy();
    expect(useCycleCountWorks).toHaveBeenCalledWith(
      { warehouseId: undefined, workStatus: undefined },
      { enabled: false },
    );
    expect(screen.queryByRole('button', { name: /create lock/i })).toBeNull();
  });

  it('renders cycle count work as a detail link on the root list', () => {
    vi.mocked(useCycleCountWorks).mockReturnValue({
      data: { items: [makeWork()], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCycleCountWorks>);

    renderWithRouter(<CycleCountPage />);
    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'warehouse-1' } });

    const link = screen.getByRole('link', { name: /CC-001/i });
    expect(link.getAttribute('href')).toBe('/cycle-count/work-1');
  });

  it('submits the lock form through the create route', () => {
    const mutations = mutationState();
    vi.mocked(useCycleCountMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useCycleCountMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/cycle-count/new" element={<CycleCountCreatePage />} />
        <Route path="/cycle-count/:id" element={<CycleCountDetailPage />} />
      </Routes>,
      ['/cycle-count/new'],
    );

    fireEvent.change(screen.getByLabelText('Source balance id'), { target: { value: 'balance-1' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'cc-lock-1' } });
    fireEvent.click(screen.getByRole('button', { name: /create lock/i }));

    expect(mutations.createWork.mutate).toHaveBeenCalledWith(
      {
        sourceBalanceId: 'balance-1',
        quantity: 4,
        toleranceQuantity: 0,
        reasonCode: 'RC-V1-HOLD-RELEASE',
        reasonNote: undefined,
        evidenceRefs: [],
        idempotencyKey: 'cc-lock-1',
      },
      expect.any(Object),
    );
  });

  it('submits count, recount, adjustment and unlock from detail route using route id', () => {
    const mutations = mutationState();
    vi.mocked(useCycleCountMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useCycleCountMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/cycle-count/:id" element={<CycleCountDetailPage />} />
      </Routes>,
      ['/cycle-count/work-1'],
    );

    expect(screen.queryByRole('button', { name: /create lock/i })).toBeNull();
    expect(useCycleCountWork).toHaveBeenCalledWith('work-1');
    fireEvent.change(screen.getByLabelText('Counted quantity'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'RF-001' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'cc-submit-1' } });

    fireEvent.click(screen.getByRole('button', { name: /submit count/i }));
    expect(mutations.submitWork.mutate).toHaveBeenCalledWith(
      {
        id: 'work-1',
        payload: {
          countedQuantity: 5,
          approvalRequestId: undefined,
          reasonCode: 'RC-V1-HOLD-RELEASE',
          reasonNote: undefined,
          evidenceRefs: ['RF-001'],
          idempotencyKey: 'cc-submit-1',
        },
      },
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole('button', { name: /recount/i }));
    expect(mutations.recountWork.mutate).toHaveBeenCalledWith(
      {
        id: 'work-1',
        payload: {
          reasonCode: 'RC-V1-HOLD-RELEASE',
          reasonNote: undefined,
          evidenceRefs: ['RF-001'],
          idempotencyKey: 'cc-submit-1',
        },
      },
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole('button', { name: /adjust/i }));
    expect(mutations.postAdjustment.mutate).toHaveBeenCalledWith(
      {
        id: 'work-1',
        payload: {
          reasonCode: 'RC-V1-ADJUSTMENT',
          reasonNote: undefined,
          evidenceRefs: ['RF-001'],
          approvalRequestId: undefined,
          idempotencyKey: 'cc-submit-1',
        },
      },
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    expect(mutations.unlockWork.mutate).toHaveBeenCalledWith(
      {
        id: 'work-1',
        payload: {
          reasonCode: 'RC-V1-HOLD-RELEASE',
          reasonNote: undefined,
          evidenceRefs: ['RF-001'],
          idempotencyKey: 'cc-submit-1',
        },
      },
      expect.any(Object),
    );
  });

  it('keeps terminal cycle count work read-only for mutation actions', () => {
    const mutations = mutationState();
    vi.mocked(useCycleCountWork).mockReturnValue({
      data: makeWork({ workStatus: 'Unlocked' }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useCycleCountWork>);
    vi.mocked(useCycleCountMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useCycleCountMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/cycle-count/:id" element={<CycleCountDetailPage />} />
      </Routes>,
      ['/cycle-count/work-1'],
    );

    fireEvent.change(screen.getByLabelText('Counted quantity'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'cc-terminal-1' } });

    expect(screen.getByRole('button', { name: /submit count/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /recount/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /adjust/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /unlock/i })).toHaveProperty('disabled', true);
    expect(mutations.submitWork.mutate).not.toHaveBeenCalled();
  });
});
