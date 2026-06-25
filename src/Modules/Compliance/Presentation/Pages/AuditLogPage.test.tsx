// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IComplianceRepository } from '@modules/Compliance/Application/Interfaces/IComplianceRepository';
import type { AuditLogEntry } from '@modules/Compliance/Domain/Entities/Compliance';
import type { AuditLogFilter } from '@modules/Compliance/Domain/Types/ComplianceTypes';

const repo = vi.hoisted(() => ({ current: null as unknown as IComplianceRepository }));
vi.mock('@modules/Compliance/Infrastructure/Repositories/ComplianceRepositoryInstance', () => ({
  get complianceRepository() {
    return repo.current;
  },
}));
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { error: vi.fn() } }));

import { AuditLogPage } from '@modules/Compliance/Presentation/Pages/AuditLogPage';
import { AuditLogDetailPage } from '@modules/Compliance/Presentation/Pages/AuditLogDetailPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

const entry: AuditLogEntry = {
  id: 'a1',
  occurredAt: '2026-06-21T00:00:00.000Z',
  actorUserId: 'u1',
  actorRoleCodes: ['WMS_ADMIN'],
  actorType: 'USER',
  action: 'Update',
  objectType: 'ExceptionCase',
  objectId: 'e1',
  objectCode: 'EXC-1',
  beforeJson: {
    State: 'DETECTED',
    Lines: [{ Sku: 'SKU-1', Quantity: 10, Lot: 'LOT-1' }],
    Control: { ReasonRequired: true, ApprovalRequired: false },
  },
  afterJson: {
    State: 'LOGGED',
    Lines: [{ Sku: 'SKU-1', Quantity: 8, Lot: 'LOT-1', Variance: 2 }],
    Control: { ReasonRequired: true, ApprovalRequired: true, EvidenceRefs: ['doc-1', 'doc-2'] },
  },
  reasonCodeId: null,
  reasonNote: null,
  evidenceRefs: null,
  referenceType: 'ASN',
  referenceId: 'asn-9',
  warehouseId: null,
  ownerId: null,
  correlationId: 'corr-1',
  result: 'SUCCESS',
};

class FakeRepository implements Partial<IComplianceRepository> {
  listAuditLogs = vi.fn(() => Promise.resolve(page([entry])));
  getAuditLog = vi.fn((id: string) => Promise.resolve({ ...entry, id }));
}

function renderPage(initialPath: string = ROUTES.FOUNDATION.AUDIT) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.AUDIT} element={<AuditLogPage />} />
          <Route path={ROUTES.FOUNDATION.AUDIT_DETAIL()} element={<AuditLogDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('AuditLogPage (C11 AC1 / AC2)', () => {
  it('navigates from the audit list to a dedicated read-only detail route (AC1)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.listAuditLogs = vi.fn(() => Promise.resolve({ ...page([entry]), page: 2, totalPages: 2 }));
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    expect(await screen.findByText(new Date(entry.occurredAt).toLocaleString())).toBeTruthy();
    expect(fake.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 }));
    expect(screen.queryByText('Trước thay đổi')).toBeNull();

    await actor.click(screen.getByRole('button', { name: new Date(entry.occurredAt).toLocaleString() }));

    expect(await screen.findByText('Trước thay đổi')).toBeTruthy();
    expect(screen.getByText('Sau thay đổi')).toBeTruthy();
    expect(screen.getByText(/"State": "LOGGED"/)).toBeTruthy();
    expect(screen.getByText(/"EvidenceRefs"/)).toBeTruthy();
    expect(fake.getAuditLog).toHaveBeenCalledWith('a1');

    expect(
      screen.queryByRole('button', { name: /create|new|edit|delete|save|update|approve|reject|override/i }),
    ).toBeNull();
  });

  it('loads an audit detail directly by route id', async () => {
    const fake = new FakeRepository();
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(ROUTES.FOUNDATION.AUDIT_DETAIL('a1'));

    expect(await screen.findByText('Trước thay đổi')).toBeTruthy();
    expect(screen.getByRole('link', { name: /quay lại nhật ký kiểm toán/i })).toBeTruthy();
    expect(fake.getAuditLog).toHaveBeenCalledWith('a1');
  });

  it('uses the router-decoded audit route id before querying and comparing detail data', async () => {
    const fake = new FakeRepository();
    fake.getAuditLog = vi.fn((id: string) => Promise.resolve({ ...entry, id, objectCode: id }));
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(ROUTES.FOUNDATION.AUDIT_DETAIL('audit/a?#1'));

    expect(await screen.findByText('audit/a?#1')).toBeTruthy();
    expect(fake.getAuditLog).toHaveBeenCalledWith('audit/a?#1');
  });

  it('preserves literal percent sequences in audit route ids', async () => {
    const fake = new FakeRepository();
    fake.getAuditLog = vi.fn((id: string) => Promise.resolve({ ...entry, id, objectCode: id }));
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(ROUTES.FOUNDATION.AUDIT_DETAIL('audit%23id'));

    expect(await screen.findByText('audit%23id')).toBeTruthy();
    expect(fake.getAuditLog).toHaveBeenCalledWith('audit%23id');
  });

  it('keeps list search context on the detail back link', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.listAuditLogs = vi.fn(() => Promise.resolve({ ...page([entry]), page: 2, totalPages: 2 }));
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(`${ROUTES.FOUNDATION.AUDIT}?actorUserId=u1&reasonCodeId=rc-1&page=2`);

    await screen.findByText(new Date(entry.occurredAt).toLocaleString());
    await waitFor(() =>
      expect(fake.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 50, actorUserId: 'u1', reasonCodeId: 'rc-1' }),
      ),
    );

    await actor.click(screen.getByRole('button', { name: new Date(entry.occurredAt).toLocaleString() }));

    const backLink = await screen.findByRole('link', { name: /quay lại nhật ký kiểm toán/i });
    expect((backLink as HTMLAnchorElement).getAttribute('href')).toBe(
      '/foundation/audit?actorUserId=u1&reasonCodeId=rc-1&page=2',
    );
  });

  it('keeps stale audit rows disabled until debounced filters have refetched', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    const rowButton = await screen.findByRole('button', {
      name: new Date(entry.occurredAt).toLocaleString(),
    });
    await actor.type(screen.getByLabelText('ID người thực hiện'), 'u2');
    expect((rowButton as HTMLButtonElement).disabled).toBe(true);
    await actor.click(rowButton);
    expect(fake.getAuditLog).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(fake.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ actorUserId: 'u2', page: 1, pageSize: 50 }),
      ),
    );
    await waitFor(() => expect((rowButton as HTMLButtonElement).disabled).toBe(false));
    await actor.click(rowButton);

    const backLink = await screen.findByRole('link', { name: /quay lại nhật ký kiểm toán/i });
    expect((backLink as HTMLAnchorElement).getAttribute('href')).toBe('/foundation/audit?actorUserId=u2');
  });

  it('keeps preserved audit rows disabled when a filtered refetch fails', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.listAuditLogs = vi
      .fn()
      .mockResolvedValueOnce(page([entry]))
      .mockRejectedValueOnce(
        new ApiError({ status: 500, code: 'UNKNOWN', message: 'Audit filter failed' }),
      );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    expect(await screen.findByRole('button', { name: new Date(entry.occurredAt).toLocaleString() })).toBeTruthy();
    await actor.type(screen.getByLabelText('ID người thực hiện'), 'u2');

    await waitFor(() =>
      expect(fake.listAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ actorUserId: 'u2', page: 1, pageSize: 50 }),
      ),
    );
    const staleRow = screen.getByRole('button', { name: new Date(entry.occurredAt).toLocaleString() });
    expect((staleRow as HTMLButtonElement).disabled).toBe(true);
    await actor.click(staleRow);
    expect(fake.getAuditLog).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('clamps an out-of-range audit page back to the last available page', async () => {
    const fake = new FakeRepository();
    fake.listAuditLogs = vi.fn((filter?: AuditLogFilter) => {
      if (filter?.page === 999) {
        return Promise.resolve({ items: [], page: 999, pageSize: 50, totalItems: 1, totalPages: 2 });
      }
      return Promise.resolve({ ...page([entry]), page: 2, totalPages: 2 });
    });
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(`${ROUTES.FOUNDATION.AUDIT}?page=999`);

    await waitFor(() =>
      expect(fake.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 50 })),
    );
    expect(await screen.findByText(new Date(entry.occurredAt).toLocaleString())).toBeTruthy();
    expect(screen.getByText('Page 2 / 2')).toBeTruthy();
  });

  it('normalizes invalid enum, date, and decimal page values from the audit URL', async () => {
    const fake = new FakeRepository();
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(
      `${ROUTES.FOUNDATION.AUDIT}?action=NotReal&objectType=Nope&from=abc&to=2026-99-99&page=1.5`,
    );

    await waitFor(() =>
      expect(fake.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })),
    );
    expect(fake.listAuditLogs).toHaveBeenCalledWith(
      expect.not.objectContaining({
        action: 'NotReal',
        objectType: 'Nope',
        from: 'abc',
        to: '2026-99-99T23:59:59.999Z',
      }),
    );
  });

  it('drops reversed audit date ranges from shared URLs', async () => {
    const fake = new FakeRepository();
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(`${ROUTES.FOUNDATION.AUDIT}?from=2026-06-25&to=2026-06-24`);

    await waitFor(() =>
      expect(fake.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })),
    );
    expect(fake.listAuditLogs).toHaveBeenCalledWith(
      expect.not.objectContaining({
        from: '2026-06-25',
        to: '2026-06-24T23:59:59.999Z',
      }),
    );
  });

  it('removes an out-of-range audit page when an empty result has no pages', async () => {
    const fake = new FakeRepository();
    fake.listAuditLogs = vi.fn((filter?: AuditLogFilter) => {
      if (filter?.page === 999) {
        return Promise.resolve({ items: [], page: 999, pageSize: 50, totalItems: 0, totalPages: 0 });
      }
      return Promise.resolve({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 });
    });
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(`${ROUTES.FOUNDATION.AUDIT}?page=999`);

    await waitFor(() =>
      expect(fake.listAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })),
    );
    expect(await screen.findByText('Không có sự kiện kiểm toán khớp bộ lọc.')).toBeTruthy();
  });

  it('does not render stale audit detail data when the returned id differs from the route id', async () => {
    const fake = new FakeRepository();
    fake.getAuditLog = vi.fn(() => Promise.resolve({ ...entry, id: 'other-audit' }));
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(ROUTES.FOUNDATION.AUDIT_DETAIL('a1'));

    expect(await screen.findByText(/Không tìm thấy bản ghi/i)).toBeTruthy();
    expect(screen.queryByText('Trước thay đổi')).toBeNull();
  });

  it('does not render pager controls for an empty audit list', async () => {
    const fake = new FakeRepository();
    fake.listAuditLogs = vi.fn(() =>
      Promise.resolve({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 }),
    );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    expect(await screen.findByText('Không có sự kiện kiểm toán khớp bộ lọc.')).toBeTruthy();
    expect(screen.queryByText(/Page 1/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Trước' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tiếp' })).toBeNull();
  });

  it('shows a permission-required state when the audit query 403s', async () => {
    const fake = new FakeRepository();
    fake.listAuditLogs = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    expect(await screen.findByText(/Cần quyền truy cập/i)).toBeTruthy();
  });

  it('keeps loaded rows visible when a non-403 refetch fails', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.listAuditLogs = vi
      .fn()
      .mockResolvedValueOnce({ ...page([entry]), totalPages: 2 })
      .mockRejectedValueOnce(
        new ApiError({ status: 500, code: 'UNKNOWN', message: 'Audit refetch failed' }),
      );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    expect(await screen.findByText(new Date(entry.occurredAt).toLocaleString())).toBeTruthy();
    await actor.click(screen.getByRole('button', { name: 'Tiếp' }));

    await waitFor(() => expect(fake.listAuditLogs).toHaveBeenCalledTimes(2));
    expect(screen.getByText(new Date(entry.occurredAt).toLocaleString())).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('Audit refetch failed')).toBeNull();
  });

  it('keeps an initial non-403 list error blocking when no rows have loaded', async () => {
    const fake = new FakeRepository();
    fake.listAuditLogs = vi.fn(() =>
      Promise.reject(new ApiError({ status: 500, code: 'UNKNOWN', message: 'Initial audit failed' })),
    );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    expect(await screen.findByText('Initial audit failed')).toBeTruthy();
  });

  it('surfaces a non-403 detail error without rendering a list-row fallback', async () => {
    const fake = new FakeRepository();
    fake.getAuditLog = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 500, code: 'UNKNOWN', message: 'Audit detail temporarily unavailable' }),
      ),
    );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage(ROUTES.FOUNDATION.AUDIT_DETAIL('a1'));

    expect(await screen.findByText('Audit detail temporarily unavailable')).toBeTruthy();
    expect(screen.queryByText('Trước thay đổi')).toBeNull();
  });
});
