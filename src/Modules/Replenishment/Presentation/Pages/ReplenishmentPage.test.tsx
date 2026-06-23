// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReplenishmentPage } from '@modules/Replenishment/Presentation/Pages/ReplenishmentPage';
import { useReplenishmentMutations } from '@modules/Replenishment/Application/Commands/UseReplenishmentMutations';
import { useReplenishmentTasks } from '@modules/Replenishment/Application/Queries/UseReplenishmentTasks';

vi.mock('@modules/Replenishment/Application/Commands/UseReplenishmentMutations', () => ({
  useReplenishmentMutations: vi.fn(),
}));

vi.mock('@modules/Replenishment/Application/Queries/UseReplenishmentTasks', () => ({
  useReplenishmentTasks: vi.fn(),
}));

const mutationState = () => ({
  releaseTask: { mutate: vi.fn(), isPending: false, error: null },
  confirmTask: { mutate: vi.fn(), isPending: false, error: null },
  cancelTask: { mutate: vi.fn(), isPending: false, error: null },
  recordReconciliationFailure: { mutate: vi.fn(), isPending: false, error: null },
});

describe('ReplenishmentPage', () => {
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
  });

  it('waits for warehouse or owner scope before loading replenishment tasks', () => {
    vi.mocked(useReplenishmentMutations).mockReturnValue(
      mutationState() as unknown as ReturnType<typeof useReplenishmentMutations>,
    );

    render(<ReplenishmentPage />);

    expect(screen.getByText('Enter warehouse or owner to load replenishment tasks.')).toBeTruthy();
    expect(useReplenishmentTasks).toHaveBeenCalledWith(
      { warehouseId: undefined, ownerId: undefined, taskStatus: undefined },
      { enabled: false },
    );
  });

  it('submits release task through the replenishment mutation hook', () => {
    const mutations = mutationState();
    vi.mocked(useReplenishmentMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useReplenishmentMutations>,
    );

    render(<ReplenishmentPage />);

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

  it('submits confirm, cancel and reconciliation using the guarded page forms', () => {
    const mutations = mutationState();
    vi.mocked(useReplenishmentMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useReplenishmentMutations>,
    );

    render(<ReplenishmentPage />);

    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'warehouse-1' } });
    fireEvent.change(screen.getByLabelText('Selected task id'), { target: { value: 'task-1' } });
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
        ownerId: undefined,
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

    render(<ReplenishmentPage />);

    fireEvent.change(screen.getByLabelText('Warehouse'), { target: { value: 'warehouse-1' } });
    fireEvent.change(screen.getByLabelText('Business reference'), { target: { value: 'ITX-001' } });
    fireEvent.change(screen.getByLabelText('Error message'), { target: { value: 'ERP mismatch' } });
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'RF-001' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'recon-fail-1' } });
    fireEvent.change(screen.getByLabelText('Payload JSON'), { target: { value: '{bad-json' } });
    fireEvent.click(screen.getByRole('button', { name: /record failure/i }));

    expect(screen.getByText('Payload phải là JSON hợp lệ.')).toBeTruthy();
    expect(mutations.recordReconciliationFailure.mutate).not.toHaveBeenCalled();
  });
});
