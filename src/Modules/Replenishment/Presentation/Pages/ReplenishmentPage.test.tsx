// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ReplenishmentCreatePage,
  ReplenishmentDetailPage,
} from '@modules/Replenishment/Presentation/Pages/ReplenishmentDetailPage';
import { ReplenishmentPage } from '@modules/Replenishment/Presentation/Pages/ReplenishmentPage';
import { useReplenishmentMutations } from '@modules/Replenishment/Application/Commands/UseReplenishmentMutations';
import {
  useReplenishmentTask,
  useReplenishmentTasks,
} from '@modules/Replenishment/Application/Queries/UseReplenishmentTasks';
import type { ReplenishmentTask } from '@modules/Replenishment/Domain/Types/ReplenishmentTask';

vi.mock('@modules/Replenishment/Application/Commands/UseReplenishmentMutations', () => ({
  useReplenishmentMutations: vi.fn(),
}));

vi.mock('@modules/Replenishment/Application/Queries/UseReplenishmentTasks', () => ({
  useReplenishmentTasks: vi.fn(),
  useReplenishmentTask: vi.fn(),
}));

function makeTask(overrides: Partial<ReplenishmentTask> = {}): ReplenishmentTask {
  return {
    id: 'task-1',
    taskCode: 'RPL-001',
    taskStatus: 'Released',
    triggerType: 'MinMax',
    sourceBalanceId: 'balance-source',
    sourceDimensionId: 'dim-source',
    sourceLocationId: 'bulk-1',
    sourceLocationCode: 'BULK-1',
    sourceInventoryStatusCode: 'AVAILABLE',
    targetLocationId: 'pick-face-1',
    targetLocationCode: 'PF-1',
    targetLocationProfileId: 'profile-1',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-1',
    ownerId: 'owner-1',
    ownerCode: 'OWN',
    skuId: 'sku-1',
    skuCode: 'SKU-1',
    uomId: 'uom-1',
    uomCode: 'EA',
    quantity: 12,
    shortPickReference: null,
    priority: null,
    workPoolCode: null,
    assignedUserId: null,
    eligibilityDecision: null,
    outboxMessageId: 'outbox-1',
    confirmTransactionId: null,
    confirmMovementId: null,
    confirmOutboxMessageId: null,
    reasonCode: 'RC-V1-REPLENISHMENT',
    reasonCodeId: 'reason-1',
    reasonNote: null,
    evidenceRefs: [],
    releasedAt: '2026-06-24T00:00:00.000Z',
    confirmedAt: null,
    cancelledAt: null,
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:00:00.000Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

const mutationState = () => ({
  releaseTask: { mutate: vi.fn(), isPending: false, error: null },
  confirmTask: { mutate: vi.fn(), isPending: false, error: null },
  cancelTask: { mutate: vi.fn(), isPending: false, error: null },
  recordReconciliationFailure: { mutate: vi.fn(), isPending: false, error: null },
});

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/replenishment']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('Replenishment list/detail pages', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(useReplenishmentTasks).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useReplenishmentTasks>);
    vi.mocked(useReplenishmentTask).mockReturnValue({
      data: makeTask(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useReplenishmentTask>);
    vi.mocked(useReplenishmentMutations).mockReturnValue(
      mutationState() as unknown as ReturnType<typeof useReplenishmentMutations>,
    );
  });

  it('waits for warehouse or owner scope before loading replenishment tasks', () => {
    renderWithRouter(<ReplenishmentPage />);

    expect(screen.getByText('Enter warehouse or owner to load replenishment tasks.')).toBeTruthy();
    expect(useReplenishmentTasks).toHaveBeenCalledWith(
      { warehouseId: undefined, ownerId: undefined, taskStatus: undefined },
      { enabled: false },
    );
    expect(screen.queryByRole('button', { name: /release task/i })).toBeNull();
  });

  it('renders replenishment tasks as detail links on the root list', () => {
    vi.mocked(useReplenishmentTasks).mockReturnValue({
      data: { items: [makeTask()], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useReplenishmentTasks>);

    renderWithRouter(<ReplenishmentPage />);
    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'warehouse-1' } });

    const link = screen.getByRole('link', { name: /RPL-001/i });
    expect(link.getAttribute('href')).toBe('/replenishment/task-1');
  });

  it('submits release task through the create route', () => {
    const mutations = mutationState();
    vi.mocked(useReplenishmentMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useReplenishmentMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/replenishment/new" element={<ReplenishmentCreatePage />} />
        <Route path="/replenishment/:id" element={<ReplenishmentDetailPage />} />
      </Routes>,
      ['/replenishment/new'],
    );

    fireEvent.change(screen.getByLabelText('Source balance id'), { target: { value: 'balance-source' } });
    fireEvent.change(screen.getByLabelText('Target location id'), { target: { value: 'pick-face-1' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'repl-release-1' } });
    fireEvent.click(screen.getByRole('button', { name: /release task/i }));

    expect(mutations.releaseTask.mutate).toHaveBeenCalledWith(
      {
        triggerType: 'MinMax',
        sourceBalanceId: 'balance-source',
        targetLocationId: 'pick-face-1',
        quantity: 12,
        shortPickReference: undefined,
        reasonCode: 'RC-V1-REPLENISHMENT',
        reasonNote: undefined,
        evidenceRefs: [],
        idempotencyKey: 'repl-release-1',
      },
      expect.any(Object),
    );
  });

  it('submits confirm, cancel and reconciliation using the detail route forms', () => {
    const mutations = mutationState();
    vi.mocked(useReplenishmentMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useReplenishmentMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/replenishment/:id" element={<ReplenishmentDetailPage />} />
      </Routes>,
      ['/replenishment/task-1'],
    );

    expect(screen.queryByRole('button', { name: /release task/i })).toBeNull();
    expect(useReplenishmentTask).toHaveBeenCalledWith('task-1');
    fireEvent.change(screen.getByLabelText('Movement reason'), { target: { value: 'RC-V1-ADJUSTMENT' } });
    fireEvent.change(screen.getByLabelText('Cancel reason'), { target: { value: 'RC-V1-REPLENISHMENT' } });
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'RF-001' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'repl-confirm-1' } });

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(mutations.confirmTask.mutate).toHaveBeenCalledWith(
      {
        id: 'task-1',
        payload: {
          reasonCode: 'RC-V1-ADJUSTMENT',
          reasonNote: undefined,
          evidenceRefs: ['RF-001'],
          idempotencyKey: 'repl-confirm-1',
        },
      },
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mutations.cancelTask.mutate).toHaveBeenCalledWith(
      {
        id: 'task-1',
        payload: {
          reasonCode: 'RC-V1-REPLENISHMENT',
          reasonNote: undefined,
          evidenceRefs: ['RF-001'],
          idempotencyKey: 'repl-confirm-1',
        },
      },
      expect.any(Object),
    );

    fireEvent.change(screen.getByLabelText('Business reference'), { target: { value: 'ITX-001' } });
    fireEvent.change(screen.getByLabelText('Error message'), { target: { value: 'ERP mismatch' } });
    fireEvent.change(screen.getByLabelText('Payload JSON'), { target: { value: '{"ExpectedQty":12}' } });
    fireEvent.click(screen.getByRole('button', { name: /record failure/i }));

    expect(mutations.recordReconciliationFailure.mutate).toHaveBeenCalledWith(
      {
        businessReference: 'ITX-001',
        eventType: 'InventoryReconciliationFailed',
        warehouseId: 'warehouse-1',
        ownerId: 'owner-1',
        errorMessage: 'ERP mismatch',
        retryStatus: 'PendingRetry',
        reasonCode: 'RC-V1-DEAD-LETTER-FIX',
        evidenceRefs: ['RF-001'],
        idempotencyKey: 'repl-confirm-1',
        payload: { ExpectedQty: 12 },
      },
      expect.any(Object),
    );
  });

  it('rejects invalid reconciliation payload JSON before mutation', () => {
    const mutations = mutationState();
    vi.mocked(useReplenishmentMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useReplenishmentMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/replenishment/:id" element={<ReplenishmentDetailPage />} />
      </Routes>,
      ['/replenishment/task-1'],
    );

    fireEvent.change(screen.getByLabelText('Business reference'), { target: { value: 'ITX-001' } });
    fireEvent.change(screen.getByLabelText('Error message'), { target: { value: 'ERP mismatch' } });
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'RF-001' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'recon-fail-1' } });
    fireEvent.change(screen.getByLabelText('Payload JSON'), { target: { value: '{bad-json' } });
    fireEvent.click(screen.getByRole('button', { name: /record failure/i }));

    expect(screen.getByText('Payload must be valid JSON.')).toBeTruthy();
    expect(mutations.recordReconciliationFailure.mutate).not.toHaveBeenCalled();
  });

  it('keeps terminal replenishment tasks read-only for confirm and cancel', () => {
    const mutations = mutationState();
    vi.mocked(useReplenishmentTask).mockReturnValue({
      data: makeTask({ taskStatus: 'Confirmed' }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useReplenishmentTask>);
    vi.mocked(useReplenishmentMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useReplenishmentMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/replenishment/:id" element={<ReplenishmentDetailPage />} />
      </Routes>,
      ['/replenishment/task-1'],
    );

    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'repl-terminal-1' } });

    expect(screen.getByRole('button', { name: /confirm/i })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveProperty('disabled', true);
    expect(mutations.confirmTask.mutate).not.toHaveBeenCalled();
    expect(mutations.cancelTask.mutate).not.toHaveBeenCalled();
  });
});
