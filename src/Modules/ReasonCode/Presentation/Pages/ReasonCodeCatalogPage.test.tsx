// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IReasonCodeRepository } from '@modules/ReasonCode/Application/Interfaces/IReasonCodeRepository';
import type { ReasonCode } from '@modules/ReasonCode/Domain/Entities/ReasonCode';
import type {
  CreateReasonCodeInput,
  UpdateReasonCodeInput,
} from '@modules/ReasonCode/Domain/Types/ReasonCodeTypes';

const repo = vi.hoisted(() => ({ current: null as unknown as IReasonCodeRepository }));
vi.mock('@modules/ReasonCode/Infrastructure/Repositories/ReasonCodeRepositoryInstance', () => ({
  get reasonCodeRepository() {
    return repo.current;
  },
}));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { error: toastError } }));

import { ReasonCodeCatalogPage } from '@modules/ReasonCode/Presentation/Pages/ReasonCodeCatalogPage';
import { ReasonCodeDetailPage } from '@modules/ReasonCode/Presentation/Pages/ReasonCodeDetailPage';
import { useReasonCodeStore } from '@modules/ReasonCode/Application/Stores/ReasonCodeStore';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

function makeReasonCode(overrides: Partial<ReasonCode> = {}): ReasonCode {
  return {
    id: 'r1',
    reasonCode: 'RC-ADJ-01',
    reasonGroup: 'INVENTORY_ADJUSTMENT',
    description: null,
    appliesToActions: ['Adjust'],
    appliesToObjects: ['InventoryStatus'],
    evidenceRequired: false,
    approvalRequired: false,
    allowedRoleCodes: null,
    status: 'ACTIVE',
    version: 1,
    effectiveFrom: null,
    effectiveTo: null,
    ...overrides,
  };
}

class FakeRepository implements Partial<IReasonCodeRepository> {
  items: ReasonCode[];
  constructor(initial: ReasonCode[]) {
    this.items = initial;
  }
  list = vi.fn(() => Promise.resolve(page([...this.items])));
  getById = vi.fn((id: string) => Promise.resolve(this.items.find((i) => i.id === id)!));
  create = vi.fn((input: CreateReasonCodeInput) => {
    const created = makeReasonCode({
      id: `new-${this.items.length + 1}`,
      reasonCode: input.reasonCode,
      reasonGroup: input.reasonGroup,
      appliesToActions: input.appliesToActions,
      appliesToObjects: input.appliesToObjects,
    });
    this.items.push(created);
    return Promise.resolve(created);
  });
  update = vi.fn((id: string, input: UpdateReasonCodeInput) => {
    const idx = this.items.findIndex((i) => i.id === id);
    this.items[idx] = { ...this.items[idx], ...input, version: this.items[idx].version + 1 };
    return Promise.resolve(this.items[idx]);
  });
}

function renderPage(initialEntries: string[] = [ROUTES.FOUNDATION.REASON_CODES]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.REASON_CODES} element={<ReasonCodeCatalogPage />} />
          <Route path={ROUTES.FOUNDATION.REASON_CODE_NEW} element={<ReasonCodeDetailPage mode="create" />} />
          <Route path={ROUTES.FOUNDATION.REASON_CODE_DETAIL()} element={<ReasonCodeDetailPage mode="detail" />} />
          <Route path={ROUTES.FOUNDATION.REASON_CODE_EDIT()} element={<ReasonCodeDetailPage mode="edit" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useReasonCodeStore.setState({ selectedId: null });
  toastError.mockClear();
});
afterEach(() => cleanup());

describe('ReasonCodeCatalogPage (C13)', () => {
  it('creates a reason code and re-reads it into the list (AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeReasonCode()]);
    repo.current = fake;
    renderPage();

    await actor.click(await screen.findByRole('link', { name: 'Tạo mã lý do' }));
    await actor.type(await screen.findByLabelText('Mã lý do'), 'RC-NEW-1');
    await actor.click(screen.getByLabelText('Update')); // an applies-to action
    await actor.click(screen.getByLabelText('SKU')); // an applies-to object
    await actor.click(screen.getByRole('button', { name: 'Tạo mã lý do' }));

    expect(await screen.findByText('RC-NEW-1')).toBeTruthy();
    expect(fake.create).toHaveBeenCalled();
  });

  it('inactivates a reason code via PATCH status=INACTIVE (AC2/AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeReasonCode({ status: 'ACTIVE' })]);
    repo.current = fake;
    renderPage();

    await actor.click(await screen.findByRole('button', { name: 'RC-ADJ-01' }));
    await actor.click(await screen.findByRole('link', { name: 'Chỉnh sửa mã lý do' }));
    // Scope to the edit form — a 'Status' filter select also exists in the toolbar.
    const updateBtn = await screen.findByRole('button', { name: 'Cập nhật mã lý do' });
    const editForm = updateBtn.closest('form') as HTMLFormElement;
    await actor.selectOptions(within(editForm).getByLabelText('Trạng thái'), 'INACTIVE');
    await actor.click(updateBtn);

    await waitFor(() =>
      expect(fake.update).toHaveBeenCalledWith('r1', expect.objectContaining({ status: 'INACTIVE' })),
    );
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLSelectElement>('Trạng thái').value).toBe('INACTIVE'),
    );
  });

  it('shows a permission-denied state when the list 403s (AC4)', async () => {
    const fake = new FakeRepository([]);
    fake.list = vi.fn(() => Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })));
    repo.current = fake;
    renderPage();

    expect((await screen.findAllByText(/không có quyền/i)).length).toBeGreaterThan(0);
  });

  it('does not fall back to create mode when selected detail fails without a list-row fallback', async () => {
    useReasonCodeStore.setState({ selectedId: 'missing-reason' });
    const fake = new FakeRepository([makeReasonCode({ id: 'other', reasonCode: 'RC-OTHER' })]);
    fake.getById = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 500, code: 'UNKNOWN', message: 'Không thể tải chi tiết mã lý do.' }),
      ),
    );
    repo.current = fake;
    renderPage([ROUTES.FOUNDATION.REASON_CODE_DETAIL('missing-reason')]);

    expect(await screen.findByText('Không thể tải mã lý do')).toBeTruthy();
    expect(screen.getByText('Không thể tải chi tiết mã lý do.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tạo mã lý do' })).toBeNull();
  });

  it('surfaces a 409 duplicate-code conflict inline, not as a toast (AC4)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeReasonCode()]);
    fake.create = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 409, code: 'CONFLICT', message: 'Reason code already exists: RC-DUP' }),
      ),
    );
    repo.current = fake;
    renderPage();

    await actor.click(await screen.findByRole('link', { name: 'Tạo mã lý do' }));
    await actor.type(await screen.findByLabelText('Mã lý do'), 'RC-DUP');
    await actor.click(screen.getByLabelText('Update'));
    await actor.click(screen.getByLabelText('SKU'));
    await actor.click(screen.getByRole('button', { name: 'Tạo mã lý do' }));

    expect(await screen.findByText('Mã lý do đã tồn tại: RC-DUP')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Mã lý do đã tồn tại: RC-DUP');
    expect(toastError).not.toHaveBeenCalled();
  });
});
