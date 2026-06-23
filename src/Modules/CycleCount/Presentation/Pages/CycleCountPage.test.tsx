// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CycleCountPage } from '@modules/CycleCount/Presentation/Pages/CycleCountPage';
import { useCycleCountMutations } from '@modules/CycleCount/Application/Commands/UseCycleCountMutations';
import { useCycleCountWorks } from '@modules/CycleCount/Application/Queries/UseCycleCountWorks';

vi.mock('@modules/CycleCount/Application/Commands/UseCycleCountMutations', () => ({
  useCycleCountMutations: vi.fn(),
}));

vi.mock('@modules/CycleCount/Application/Queries/UseCycleCountWorks', () => ({
  useCycleCountWorks: vi.fn(),
}));

const mutationState = () => ({
  createWork: { mutate: vi.fn(), isPending: false, error: null },
  submitWork: { mutate: vi.fn(), isPending: false, error: null },
  recountWork: { mutate: vi.fn(), isPending: false, error: null },
  postAdjustment: { mutate: vi.fn(), isPending: false, error: null },
  unlockWork: { mutate: vi.fn(), isPending: false, error: null },
});

describe('CycleCountPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(useCycleCountWorks).mockReturnValue({ data: undefined, isLoading: false, error: null } as unknown as ReturnType<
      typeof useCycleCountWorks
    >);
  });

  it('waits for a warehouse scope filter before loading cycle count works', () => {
    vi.mocked(useCycleCountMutations).mockReturnValue(
      mutationState() as unknown as ReturnType<typeof useCycleCountMutations>,
    );

    render(<CycleCountPage />);

    expect(screen.getByText('Enter a warehouse to load cycle count works.')).toBeTruthy();
    expect(useCycleCountWorks).toHaveBeenCalledWith(
      { warehouseId: undefined, workStatus: undefined },
      { enabled: false },
    );
  });

  it('submits the lock form through the cycle count mutation hook', () => {
    const mutations = mutationState();
    vi.mocked(useCycleCountMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useCycleCountMutations>,
    );

    render(<CycleCountPage />);

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
});
