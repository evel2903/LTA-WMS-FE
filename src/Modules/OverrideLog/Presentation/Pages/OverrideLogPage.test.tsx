// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IOverrideLogRepository } from '@modules/OverrideLog/Application/Interfaces/IOverrideLogRepository';
import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';
import type { OverrideLogFilter } from '@modules/OverrideLog/Domain/Types/OverrideLogTypes';

const repo = vi.hoisted(() => ({ current: null as unknown as IOverrideLogRepository }));
vi.mock('@modules/OverrideLog/Infrastructure/Repositories/OverrideLogRepositoryInstance', () => ({
  get overrideLogRepository() {
    return repo.current;
  },
}));

import { OverrideLogPage } from '@modules/OverrideLog/Presentation/Pages/OverrideLogPage';
import { OverrideLogDetailPage } from '@modules/OverrideLog/Presentation/Pages/OverrideLogDetailPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

const log: OverrideLog = {
  id: 'ov1',
  ruleId: 'rule-1',
  ruleCode: 'RULE-PUTAWAY-01',
  actorUserId: 'u1',
  targetObjectType: 'WarehouseProfile',
  targetObjectId: 'wp-1',
  targetObjectCode: 'WP-MAIN',
  scope: { warehouseId: 'wh-1' },
  controlMode: 'APPROVAL_REQUIRED',
  action: 'Override',
  reasonCodeId: 'rc-1',
  reasonNote: 'manual override',
  evidenceRefs: ['doc-1'],
  approvalRequestId: 'ar-9',
  beforeJson: {
    allowed: false,
    ruleFacts: { warehouseType: 'WT-01', skuClass: 'NORMAL' },
    checks: [{ code: 'capacity', result: 'blocked' }],
  },
  afterJson: {
    allowed: true,
    ruleFacts: { warehouseType: 'WT-01', skuClass: 'NORMAL' },
    checks: [{ code: 'capacity', result: 'override-approved', approver: 'u2' }],
  },
  auditRef: 'audit-7',
  correlationId: 'corr-1',
  createdAt: '2026-06-21T00:00:00.000Z',
};

class FakeRepository implements Partial<IOverrideLogRepository> {
  list = vi.fn(() => Promise.resolve(page([log])));
  getById = vi.fn((id: string) => Promise.resolve({ ...log, id }));
}

function renderPage(initialPath: string = ROUTES.FOUNDATION.OVERRIDES) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.OVERRIDES} element={<OverrideLogPage />} />
          <Route path={ROUTES.FOUNDATION.OVERRIDE_DETAIL()} element={<OverrideLogDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('OverrideLogPage (C16)', () => {
  it('navigates from the list to a dedicated read-only detail route (AC1/AC2/AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.list = vi.fn(() => Promise.resolve({ ...page([log]), page: 2, totalPages: 2 }));
    repo.current = fake;
    renderPage();

    expect(await screen.findByRole('button', { name: 'RULE-PUTAWAY-01' })).toBeTruthy();
    expect(fake.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 }));
    expect(screen.queryByText('Trước thay đổi')).toBeNull();

    await actor.click(screen.getByRole('button', { name: 'RULE-PUTAWAY-01' }));

    expect(await screen.findByText('Trước thay đổi')).toBeTruthy();
    expect(screen.getByText('Sau thay đổi')).toBeTruthy();
    expect(screen.getByText(/"allowed": true/)).toBeTruthy();
    expect(screen.getByText(/"override-approved"/)).toBeTruthy();
    expect(fake.getById).toHaveBeenCalledWith('ov1');

    expect(
      screen.queryByRole('button', { name: /create|new|edit|delete|save|update|approve|reject|override/i }),
    ).toBeNull();
    expect(screen.getByRole('link', { name: /quay lại nhật ký ghi đè/i })).toBeTruthy();
  });

  it('loads an override detail directly by route id', async () => {
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage(ROUTES.FOUNDATION.OVERRIDE_DETAIL('ov1'));

    expect(await screen.findByText('Trước thay đổi')).toBeTruthy();
    expect(screen.getByText('Sau thay đổi')).toBeTruthy();
    expect(fake.getById).toHaveBeenCalledWith('ov1');
  });

  it('uses the router-decoded override route id before querying and comparing detail data', async () => {
    const fake = new FakeRepository();
    fake.getById = vi.fn((id: string) => Promise.resolve({ ...log, id, ruleCode: id }));
    repo.current = fake;
    renderPage(ROUTES.FOUNDATION.OVERRIDE_DETAIL('override/a?#1'));

    expect(await screen.findAllByText('override/a?#1')).toHaveLength(2);
    expect(fake.getById).toHaveBeenCalledWith('override/a?#1');
  });

  it('preserves literal percent sequences in override route ids', async () => {
    const fake = new FakeRepository();
    fake.getById = vi.fn((id: string) => Promise.resolve({ ...log, id, ruleCode: id }));
    repo.current = fake;
    renderPage(ROUTES.FOUNDATION.OVERRIDE_DETAIL('override%25id'));

    expect(await screen.findAllByText('override%25id')).toHaveLength(2);
    expect(fake.getById).toHaveBeenCalledWith('override%25id');
  });

  it('keeps list search context on the detail back link', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.list = vi.fn(() => Promise.resolve({ ...page([log]), page: 2, totalPages: 2 }));
    repo.current = fake;
    renderPage(`${ROUTES.FOUNDATION.OVERRIDES}?ruleId=rule-1&actorUserId=u1&page=2`);

    await screen.findByRole('button', { name: 'RULE-PUTAWAY-01' });
    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 50, ruleId: 'rule-1', actorUserId: 'u1' }),
      ),
    );

    await actor.click(screen.getByRole('button', { name: 'RULE-PUTAWAY-01' }));

    const backLink = await screen.findByRole('link', { name: /quay lại nhật ký ghi đè/i });
    expect((backLink as HTMLAnchorElement).getAttribute('href')).toBe(
      '/foundation/overrides?ruleId=rule-1&actorUserId=u1&page=2',
    );
  });

  it('keeps stale override rows disabled until debounced filters have refetched', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage();

    const rowButton = await screen.findByRole('button', { name: 'RULE-PUTAWAY-01' });
    await actor.type(screen.getByLabelText('ID quy tắc'), 'rule-2');
    expect((rowButton as HTMLButtonElement).disabled).toBe(true);
    await actor.click(rowButton);
    expect(fake.getById).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(
        expect.objectContaining({ ruleId: 'rule-2', page: 1, pageSize: 50 }),
      ),
    );
    await waitFor(() => expect((rowButton as HTMLButtonElement).disabled).toBe(false));
    await actor.click(rowButton);

    const backLink = await screen.findByRole('link', { name: /quay lại nhật ký ghi đè/i });
    expect((backLink as HTMLAnchorElement).getAttribute('href')).toBe('/foundation/overrides?ruleId=rule-2');
  });

  it('keeps preserved override rows disabled when a filtered refetch fails', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.list = vi
      .fn()
      .mockResolvedValueOnce(page([log]))
      .mockRejectedValueOnce(
        new ApiError({ status: 500, code: 'UNKNOWN', message: 'Override filter failed' }),
      );
    repo.current = fake;
    renderPage();

    expect(await screen.findByRole('button', { name: 'RULE-PUTAWAY-01' })).toBeTruthy();
    await actor.type(screen.getByLabelText('ID quy tắc'), 'rule-2');

    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(
        expect.objectContaining({ ruleId: 'rule-2', page: 1, pageSize: 50 }),
      ),
    );
    const staleRow = screen.getByRole('button', { name: 'RULE-PUTAWAY-01' });
    expect((staleRow as HTMLButtonElement).disabled).toBe(true);
    await actor.click(staleRow);
    expect(fake.getById).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('clamps an out-of-range override page back to the last available page', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn((filter?: OverrideLogFilter) => {
      if (filter?.page === 999) {
        return Promise.resolve({ items: [], page: 999, pageSize: 50, totalItems: 1, totalPages: 2 });
      }
      return Promise.resolve({ ...page([log]), page: 2, totalPages: 2 });
    });
    repo.current = fake;
    renderPage(`${ROUTES.FOUNDATION.OVERRIDES}?page=999`);

    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 50 })),
    );
    expect(await screen.findByRole('button', { name: 'RULE-PUTAWAY-01' })).toBeTruthy();
    expect(screen.getByText('Page 2 / 2')).toBeTruthy();
  });

  it('normalizes invalid enum, date, and decimal page values from the override URL', async () => {
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage(
      `${ROUTES.FOUNDATION.OVERRIDES}?targetObjectType=Nope&from=abc&to=2026-99-99&page=1.5`,
    );

    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })),
    );
    expect(fake.list).toHaveBeenCalledWith(
      expect.not.objectContaining({
        targetObjectType: 'Nope',
        from: 'abc',
        to: '2026-99-99T23:59:59.999Z',
      }),
    );
  });

  it('drops reversed override date ranges from shared URLs', async () => {
    const fake = new FakeRepository();
    repo.current = fake;
    renderPage(`${ROUTES.FOUNDATION.OVERRIDES}?from=2026-06-25&to=2026-06-24`);

    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })),
    );
    expect(fake.list).toHaveBeenCalledWith(
      expect.not.objectContaining({
        from: '2026-06-25',
        to: '2026-06-24T23:59:59.999Z',
      }),
    );
  });

  it('removes an out-of-range override page when an empty result has no pages', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn((filter?: OverrideLogFilter) => {
      if (filter?.page === 999) {
        return Promise.resolve({ items: [], page: 999, pageSize: 50, totalItems: 0, totalPages: 0 });
      }
      return Promise.resolve({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 });
    });
    repo.current = fake;
    renderPage(`${ROUTES.FOUNDATION.OVERRIDES}?page=999`);

    await waitFor(() =>
      expect(fake.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })),
    );
    expect(await screen.findByText('Không có nhật ký ghi đè khớp bộ lọc.')).toBeTruthy();
  });

  it('does not render stale override detail data when the returned id differs from the route id', async () => {
    const fake = new FakeRepository();
    fake.getById = vi.fn(() => Promise.resolve({ ...log, id: 'other-override' }));
    repo.current = fake;
    renderPage(ROUTES.FOUNDATION.OVERRIDE_DETAIL('ov1'));

    expect(await screen.findByText(/Không tìm thấy bản ghi/i)).toBeTruthy();
    expect(screen.queryByText('Trước thay đổi')).toBeNull();
  });

  it('does not render pager controls for an empty override list', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn(() =>
      Promise.resolve({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 }),
    );
    repo.current = fake;
    renderPage();

    expect(await screen.findByText('Không có nhật ký ghi đè khớp bộ lọc.')).toBeTruthy();
    expect(screen.queryByText(/Page 1/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Trước' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tiếp' })).toBeNull();
  });

  it('shows a permission-required state when the list 403s (AC4)', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn(() => Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })));
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/Cần quyền truy cập/i)).toBeTruthy();
  });

  it('surfaces a detail error without rendering a list-row fallback', async () => {
    const fake = new FakeRepository();
    fake.getById = vi.fn(() =>
      Promise.reject(new ApiError({ status: 500, code: 'UNKNOWN', message: 'Override detail failed' })),
    );
    repo.current = fake;
    renderPage(ROUTES.FOUNDATION.OVERRIDE_DETAIL('ov1'));

    expect(await screen.findByText('Override detail failed')).toBeTruthy();
    expect(screen.queryByText('Trước thay đổi')).toBeNull();
  });
});
