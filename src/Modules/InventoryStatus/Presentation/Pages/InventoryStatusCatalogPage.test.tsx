// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
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
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { error: toastError } }));
const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [
      { value: 'RC-MD-UPDATE', label: 'RC-MD-UPDATE - Cập nhật master data' },
      { value: 'RC-WRONG', label: 'RC-WRONG - Sai rule' },
    ],
    isLoading: false,
    isError: false,
  })),
}));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

import { InventoryStatusCatalogPage } from '@modules/InventoryStatus/Presentation/Pages/InventoryStatusCatalogPage';
import { InventoryStatusDetailPage } from '@modules/InventoryStatus/Presentation/Pages/InventoryStatusDetailPage';
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

function JumpButton({ label, to }: { label: string; to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      {label}
    </button>
  );
}

function renderPage(
  initialEntries: string[] = [ROUTES.FOUNDATION.INVENTORY_STATUS],
  jump?: { label: string; to: string },
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        {jump ? <JumpButton label={jump.label} to={jump.to} /> : null}
        <Routes>
          <Route path={ROUTES.FOUNDATION.INVENTORY_STATUS} element={<InventoryStatusCatalogPage />} />
          <Route
            path={ROUTES.FOUNDATION.INVENTORY_STATUS_DETAIL()}
            element={<InventoryStatusDetailPage mode="detail" />}
          />
          <Route
            path={ROUTES.FOUNDATION.INVENTORY_STATUS_EDIT()}
            element={<InventoryStatusDetailPage mode="edit" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useInventoryStatusStore.setState({ selectedId: null });
  toastError.mockClear();
  reasonCodeOptions.useReasonCodeOptions.mockClear();
});
afterEach(() => cleanup());

describe('InventoryStatusCatalogPage (C14)', () => {
  it('toggles the hold flag with a reason code and re-reads it (AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeStatus({ hold: false })]);
    repo.current = fake;
    const { container } = renderPage();

    const [openButton] = await screen.findAllByRole('button', {
      name: 'Mở chi tiết trạng thái tồn kho AVAILABLE',
    });
    expect(container.querySelector('.overflow-x-auto table')).toBeTruthy();
    await actor.click(openButton);
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa trạng thái' }));
    const updateBtn = await screen.findByRole('button', { name: 'Cập nhật trạng thái tồn kho' });
    const editForm = updateBtn.closest('form') as HTMLFormElement;

    await actor.click(within(editForm).getByLabelText('Tạm giữ')); // off -> on
    await actor.click(within(editForm).getByLabelText('Mã lý do thay đổi'));
    await actor.click(await screen.findByRole('option', { name: 'RC-MD-UPDATE - Cập nhật master data' }));
    await actor.click(updateBtn);

    await waitFor(() =>
      expect(fake.update).toHaveBeenCalledWith(
        'is1',
        expect.objectContaining({ hold: true, reasonCode: 'RC-MD-UPDATE' }),
      ),
    );
    expect(await screen.findByRole('heading', { name: 'AVAILABLE' })).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('clears inline mutation error when navigating to another inventory status route', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeStatus(),
      makeStatus({ id: 'is2', statusCode: 'QUALITY_HOLD', displayName: 'Quality Hold', sortOrder: 20 }),
    ]);
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
    renderPage([ROUTES.FOUNDATION.INVENTORY_STATUS_EDIT('is1')], {
      label: 'Open second inventory status',
      to: ROUTES.FOUNDATION.INVENTORY_STATUS_EDIT('is2'),
    });

    const updateBtn = await screen.findByRole('button', { name: 'Cập nhật trạng thái tồn kho' });
    const editForm = updateBtn.closest('form') as HTMLFormElement;
    await actor.click(within(editForm).getByLabelText('Mã lý do thay đổi'));
    await actor.click(await screen.findByRole('option', { name: 'RC-MD-UPDATE - Cập nhật master data' }));
    await actor.click(updateBtn);
    expect(await screen.findByText('Cần mã lý do cho thay đổi này.')).toBeTruthy();

    await actor.click(screen.getByRole('button', { name: 'Open second inventory status' }));

    expect(await screen.findByRole('heading', { name: 'QUALITY_HOLD' })).toBeTruthy();
    expect(screen.queryByText('Cần mã lý do cho thay đổi này.')).toBeNull();
  });

  it('shows a permission-denied state when the list 403s (AC4)', async () => {
    const fake = new FakeRepository([]);
    fake.list = vi.fn(() => Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })));
    repo.current = fake;
    renderPage();

    expect((await screen.findAllByText(/không có quyền/i)).length).toBeGreaterThan(0);
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

    const [openButton] = await screen.findAllByRole('button', {
      name: 'Mở chi tiết trạng thái tồn kho AVAILABLE',
    });
    await actor.click(openButton);
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa trạng thái' }));
    const updateBtn = await screen.findByRole('button', { name: 'Cập nhật trạng thái tồn kho' });
    const editForm = updateBtn.closest('form') as HTMLFormElement;
    await actor.click(within(editForm).getByLabelText('Mã lý do thay đổi'));
    await actor.click(await screen.findByRole('option', { name: 'RC-WRONG - Sai rule' }));
    await actor.click(updateBtn);

    expect(await screen.findByText('Cần mã lý do cho thay đổi này.')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Cần mã lý do cho thay đổi này.');
    expect(toastError).not.toHaveBeenCalled();
  });
});
