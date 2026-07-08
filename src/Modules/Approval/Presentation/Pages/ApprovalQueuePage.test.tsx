// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IApprovalRepository } from '@modules/Approval/Application/Interfaces/IApprovalRepository';
import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import type {
  ApprovalFilter,
  DecideApprovalInput,
} from '@modules/Approval/Domain/Types/ApprovalTypes';

const repo = vi.hoisted(() => ({ current: null as unknown as IApprovalRepository }));
vi.mock('@modules/Approval/Infrastructure/Repositories/ApprovalRepositoryInstance', () => ({
  get approvalRepository() {
    return repo.current;
  },
}));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { error: toastError } }));
const currentUser = vi.hoisted(() => ({
  current: { id: 'reviewer-1' },
}));
vi.mock('@modules/Auth/Application/UseCases/UseCurrentUser', () => ({
  useCurrentUser: () => currentUser.current,
}));
const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [
      { value: 'RC-APPROVE', label: 'RC-APPROVE - Duyệt yêu cầu' },
      { value: 'RC-REJECT', label: 'RC-REJECT - Từ chối yêu cầu' },
    ],
    isLoading: false,
    isError: false,
  })),
}));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

import { ApprovalQueuePage } from '@modules/Approval/Presentation/Pages/ApprovalQueuePage';
import { ApprovalRequestDetailPage } from '@modules/Approval/Presentation/Pages/ApprovalRequestDetailPage';
import { useApprovalStore } from '@modules/Approval/Application/Stores/ApprovalStore';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

function makeRequest(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: 'ar1',
    requesterUserId: 'u-req',
    action: 'Override',
    targetObjectType: 'WarehouseProfile',
    targetObjectId: 'wp-1',
    targetObjectCode: 'WP-MAIN',
    scope: null,
    requestReasonCodeId: null,
    requestReasonNote: null,
    evidenceRefs: null,
    decision: 'PENDING',
    decidedByUserId: null,
    decisionReasonCodeId: null,
    decisionNote: null,
    decidedAt: null,
    referenceType: 'WarehouseProfile',
    referenceId: 'wp-1',
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
    ...overrides,
  };
}

/** Fake whose stored request mutates so invalidated detail/list queries observe the decision. */
class FakeApprovalRepo implements Partial<IApprovalRepository> {
  live: ApprovalRequest;
  constructor(initial: ApprovalRequest) {
    this.live = initial;
  }
  list = vi.fn(() => Promise.resolve(page([this.live])));
  getById = vi.fn(() => Promise.resolve(this.live));
  approve = vi.fn((_id: string, _input: DecideApprovalInput) => {
    this.live = { ...this.live, decision: 'APPROVED', decidedByUserId: 'reviewer-1' };
    return Promise.resolve(this.live);
  });
  reject = vi.fn((_id: string, _input: DecideApprovalInput) => {
    this.live = { ...this.live, decision: 'REJECTED', decidedByUserId: 'reviewer-1' };
    return Promise.resolve(this.live);
  });
}

function renderPage(initialPath: string = ROUTES.FOUNDATION.APPROVALS) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.APPROVALS} element={<ApprovalQueuePage />} />
          <Route
            path={ROUTES.FOUNDATION.APPROVAL_DETAIL()}
            element={<ApprovalRequestDetailPage mode="detail" />}
          />
          <Route
            path={ROUTES.FOUNDATION.APPROVAL_ACTION()}
            element={<ApprovalRequestDetailPage mode="action" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useApprovalStore.setState({ selectedRequestId: null });
  currentUser.current = { id: 'reviewer-1' };
  toastError.mockClear();
  reasonCodeOptions.useReasonCodeOptions.mockClear();
});
afterEach(() => cleanup());

describe('ApprovalQueuePage (C15)', () => {
  async function findFirstApprovalRowButton(): Promise<HTMLButtonElement> {
    const buttons = await screen.findAllByRole('button', {
      name: /Mở chi tiết yêu cầu phê duyệt Hồ sơ kho · WP-MAIN/i,
    });
    return buttons[0] as HTMLButtonElement;
  }

  async function openFirstApproval(actor: ReturnType<typeof userEvent.setup>) {
    await actor.click(await findFirstApprovalRowButton());
  }

  it('approves a PENDING request and re-reads APPROVED (AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeApprovalRepo(makeRequest());
    repo.current = fake;
    renderPage();

    expect(await screen.findByLabelText('Bộ lọc hàng đợi phê duyệt')).toBeTruthy();
    expect(screen.getByLabelText('Danh sách hàng đợi phê duyệt')).toBeTruthy();
    expect((await screen.findAllByText('Hồ sơ kho · WP-MAIN')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Ghi đè')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Chờ duyệt')).length).toBeGreaterThan(0);
    await openFirstApproval(actor);
    await actor.click(await screen.findByRole('link', { name: 'Mở quyết định' }));
    await actor.click(await screen.findByRole('button', { name: 'Phê duyệt' }));

    await waitFor(() => expect(fake.approve).toHaveBeenCalledWith('ar1', expect.any(Object)));
    // UI re-reads the decided request on the action route.
    await waitFor(() => expect(screen.getAllByText('Đã phê duyệt').length).toBeGreaterThan(0));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('rejects via the same form and surfaces a BUSINESS_RULE inline, not as a toast (AC4/AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeApprovalRepo(makeRequest());
    fake.reject = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Request already decided' }),
      ),
    );
    repo.current = fake;
    renderPage();

    await openFirstApproval(actor);
    await actor.click(await screen.findByRole('link', { name: 'Mở quyết định' }));
    await actor.click(await screen.findByRole('button', { name: 'Từ chối' }));

    expect(await screen.findByText('Yêu cầu đã được quyết định')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Yêu cầu đã được quyết định');
    expect(toastError).not.toHaveBeenCalled();
    // Panel stays open — the decision form is still mounted.
    expect(screen.getByRole('button', { name: 'Phê duyệt' })).toBeTruthy();
  });

  it('disables stale approval rows when a filtered refetch fails', async () => {
    const actor = userEvent.setup();
    const live = makeRequest();
    const fake = new FakeApprovalRepo(live);
    fake.list = vi
      .fn()
      .mockResolvedValueOnce(page([live]))
      .mockRejectedValueOnce(
        new ApiError({ status: 500, code: 'UNKNOWN', message: 'filter failed' }),
      );
    repo.current = fake;
    renderPage();

    const staleRow = await findFirstApprovalRowButton();
    await actor.type(screen.getByLabelText('ID người yêu cầu'), 'u2');

    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(
        expect.objectContaining({ requesterUserId: 'u2', page: 1 }),
      ),
    );
    await waitFor(() => expect(staleRow.disabled).toBe(true));
    await actor.click(staleRow);
    expect(fake.getById).not.toHaveBeenCalled();
  });

  it('clamps an out-of-range approval page back to the last available page', async () => {
    const actor = userEvent.setup();
    const live = makeRequest();
    const fake = new FakeApprovalRepo(live);
    fake.list = vi.fn((filter?: ApprovalFilter) => {
      if (filter?.page === 2) {
        return Promise.resolve({ items: [], page: 2, pageSize: 20, totalItems: 1, totalPages: 1 });
      }
      return Promise.resolve({ ...page([live]), totalPages: 2 });
    });
    repo.current = fake;
    renderPage();

    await actor.click(await screen.findByRole('button', { name: 'Tiếp' }));

    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
    await waitFor(() =>
      expect(fake.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    );
  });

  it('falls back to target id and preserves approval notes as evidence text', async () => {
    const fake = new FakeApprovalRepo(
      makeRequest({
        targetObjectCode: ' ',
        requestReasonNote: 'approved by warehouse lead',
      }),
    );
    repo.current = fake;
    renderPage();

    expect((await screen.findAllByText('Hồ sơ kho · wp-1')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('approved by warehouse lead').length).toBeGreaterThan(0);
    expect(screen.queryByText('Đã phê duyệt bởi warehouse lead')).toBeNull();
  });

  it('does not render or mutate stale approval detail data when route id changes', async () => {
    const fake = new FakeApprovalRepo(makeRequest({ id: 'ar-old' }));
    fake.getById = vi.fn(() => Promise.resolve(makeRequest({ id: 'ar-old' })));
    repo.current = fake;
    renderPage(ROUTES.FOUNDATION.APPROVAL_ACTION('ar-new'));

    expect(await screen.findByText('Không tìm thấy bản ghi')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Phê duyệt' })).toBeNull();
    expect(fake.getById).toHaveBeenCalledWith('ar-new');
  });

  it('blocks self-decide when the reviewer is the requester (AC4)', async () => {
    const actor = userEvent.setup();
    currentUser.current = { id: 'u-req' }; // same as requesterUserId
    const fake = new FakeApprovalRepo(makeRequest());
    repo.current = fake;
    renderPage();

    await openFirstApproval(actor);
    await actor.click(await screen.findByRole('link', { name: 'Mở quyết định' }));

    // Scope to the unique panel suffix — the page header also mentions self-approval.
    expect(await screen.findByText(/Không thể tự duyệt yêu cầu/i)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Không thể tự duyệt yêu cầu');
    expect(screen.queryByRole('button', { name: 'Phê duyệt' })).toBeNull();
  });

  it('describes the detail route as route-level read-only, not permission denied', async () => {
    const actor = userEvent.setup();
    const fake = new FakeApprovalRepo(makeRequest());
    repo.current = fake;
    renderPage();

    await openFirstApproval(actor);

    expect(
      await screen.findAllByText(
        'Route xem chi tiết chỉ hiển thị evidence. Mở quyết định để thao tác.',
      ),
    ).toHaveLength(2);
    expect(screen.queryByText('Chỉ đọc - bạn không có quyền duyệt.')).toBeNull();
  });

  it('shows a permission-denied state when the list 403s (AC4)', async () => {
    const fake = new FakeApprovalRepo(makeRequest());
    fake.list = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/không có quyền/i)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
