// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInventoryStatusRepository } from '@modules/InventoryStatus/Application/Interfaces/IInventoryStatusRepository';
import type { InventoryStatus } from '@modules/InventoryStatus/Domain/Entities/InventoryStatus';
import type { UpdateInventoryStatusInput } from '@modules/InventoryStatus/Domain/Types/InventoryStatusTypes';

const repo = vi.hoisted(() => ({ current: null as unknown as IInventoryStatusRepository }));
vi.mock('@modules/InventoryStatus/Infrastructure/Repositories/InventoryStatusRepositoryInstance', () => ({
  get inventoryStatusRepository() {
    return repo.current;
  },
}));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Sonner', () => ({ toast: { error: toastError } }));

import { InventoryStatusCatalogPage } from '@modules/InventoryStatus/Presentation/Pages/InventoryStatusCatalogPage';
import { useInventoryStatusStore } from '@modules/InventoryStatus/Application/Stores/InventoryStatusStore';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

function makeStatus(overrides: Partial<InventoryStatus> = {}): InventoryStatus {
  return {
    id: 'is1',
    statusCode: 'AVAILABLE',
    displayName: 'Available',
    stageGroup: 'Storage',
    allowsAllocation: true,
    allowsPick: true,
    hold: false,
    isTerminal: false,
    isMilestone: false,
    sortOrder: 10,
    status: 'Active',
    sourceSystem: null,
    referenceId: null,
    updatedAt: '2026-06-21T00:00:00.000Z',
    ...overrides,
  };
}

class FakeRepository implements Partial<IInventoryStatusRepository> {
  items: InventoryStatus[];
  constructor(initial: InventoryStatus[]) {
    this.items = initial;
  }
  list = vi.fn(() => Promise.resolve(page([...this.items])));
  getById = vi.fn((id: string) => Promise.resolve(this.items.find((i) => i.id === id)!));
  update = vi.fn((id: string, input: UpdateInventoryStatusInput) => {
    const idx = this.items.findIndex((i) => i.id === id);
    this.items[idx] = {
      ...this.items[idx],
      ...input,
      updatedAt: '2026-06-21T01:00:00.000Z',
    };
    return Promise.resolve(this.items[idx]);
  });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InventoryStatusCatalogPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useInventoryStatusStore.setState({ selectedId: null });
  toastError.mockClear();
});
afterEach(() => cleanup());

describe('InventoryStatusCatalogPage (C14)', () => {
  it('toggles the hold flag with a reason code and re-reads it (AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeStatus({ hold: false })]);
    repo.current = fake;
    renderPage();

    await actor.click(await screen.findByRole('button', { name: 'AVAILABLE' }));
    const updateBtn = await screen.findByRole('button', { name: 'Update inventory status' });
    const editForm = updateBtn.closest('form') as HTMLFormElement;

    await actor.click(within(editForm).getByLabelText('Hold')); // off -> on
    await actor.type(within(editForm).getByLabelText('Reason code'), 'RC-MD-UPDATE');
    await actor.click(updateBtn);

    await waitFor(() =>
      expect(fake.update).toHaveBeenCalledWith(
        'is1',
        expect.objectContaining({ hold: true, reasonCode: 'RC-MD-UPDATE' }),
      ),
    );
    // UI re-reads the held status — the table Hold flag flips to ✓ (aria-label "Hold: yes").
    expect(await within(screen.getByRole('table')).findByLabelText('Hold: yes')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('shows a permission-denied state when the list 403s (AC4)', async () => {
    const fake = new FakeRepository([]);
    fake.list = vi.fn(() => Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })));
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
  });

  it('surfaces a missing/invalid reason (BUSINESS_RULE) inline, not as a toast (AC4)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeStatus()]);
    fake.update = vi.fn(() =>
      Promise.reject(
        new ApiError({
          status: 400,
          code: 'BUSINESS_RULE',
          message: 'Reason code is required for this change.',
        }),
      ),
    );
    repo.current = fake;
    renderPage();

    await actor.click(await screen.findByRole('button', { name: 'AVAILABLE' }));
    const updateBtn = await screen.findByRole('button', { name: 'Update inventory status' });
    const editForm = updateBtn.closest('form') as HTMLFormElement;
    await actor.type(within(editForm).getByLabelText('Reason code'), 'RC-WRONG');
    await actor.click(updateBtn);

    expect(await screen.findByText('Reason code is required for this change.')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });
});
