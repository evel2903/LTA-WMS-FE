// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IComplianceRepository } from '@modules/Compliance/Application/Interfaces/IComplianceRepository';
import type { ExceptionCase } from '@modules/Compliance/Domain/Entities/Compliance';

const repo = vi.hoisted(() => ({ current: null as unknown as IComplianceRepository }));
vi.mock('@modules/Compliance/Infrastructure/Repositories/ComplianceRepositoryInstance', () => ({
  get complianceRepository() {
    return repo.current;
  },
}));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Toast', () => ({ toast: { error: toastError } }));

import { ExceptionQueuePage } from '@modules/Compliance/Presentation/Pages/ExceptionQueuePage';
import { useComplianceStore } from '@modules/Compliance/Application/Stores/ComplianceStore';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

function makeCase(overrides: Partial<ExceptionCase> = {}): ExceptionCase {
  return {
    id: 'e1',
    exceptionType: 'CTRL-EX-01',
    state: 'DETECTED',
    subStatus: null,
    outcome: null,
    referenceType: 'ASN',
    referenceId: 'asn-9',
    warehouseId: null,
    ownerId: null,
    reasonCodeId: null,
    assignedToUserId: null,
    assignedRoleId: null,
    detectedRuleId: null,
    approvalRequestId: null,
    severity: 'HIGH',
    evidenceRefs: null,
    resolutionNote: null,
    openedAt: '2026-06-21T00:00:00.000Z',
    resolvedAt: null,
    closedAt: null,
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ExceptionQueuePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useComplianceStore.setState({ selectedAuditLogId: null, selectedExceptionId: null });
  toastError.mockClear();
});
afterEach(() => cleanup());

describe('ExceptionQueuePage (C11 AC3 / AC4 / AC5)', () => {
  it('drives a valid transition: DETECTED → Log → state re-read offers the next action (AC5)', async () => {
    const actor = userEvent.setup();
    const live = makeCase({ state: 'DETECTED' });
    const fake = new FakeExceptionRepo(live);
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    // Select the only case via its Type cell (the row trigger).
    await actor.click(await screen.findByRole('button', { name: 'CTRL-EX-01' }));
    // DETECTED → the single legal action is "Log".
    await actor.click(await screen.findByRole('button', { name: 'Log' }));

    // After log+refetch the case is LOGGED, whose next legal action is "Assign".
    expect(await screen.findByRole('button', { name: 'Assign' })).toBeTruthy();
    expect(fake.logException).toHaveBeenCalledWith('e1', { hardBlock: false });
  });

  it('shows read-only when the case detail 403s (AC4)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeExceptionRepo(makeCase({ state: 'LOGGED' }));
    fake.getException = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    await actor.click(await screen.findByRole('button', { name: 'CTRL-EX-01' }));
    expect(await screen.findByText(/không có quyền thao tác/i)).toBeTruthy();
  });

  it('keeps the selected case read-only when the list refetch 403s after a cached row', async () => {
    const actor = userEvent.setup();
    const live = makeCase({ state: 'DETECTED' });
    const fake = new FakeExceptionRepo(live);
    fake.listExceptions = vi
      .fn()
      .mockResolvedValueOnce({ ...page([live]), totalPages: 2 })
      .mockRejectedValueOnce(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'scope denied' }));
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    await actor.click(await screen.findByRole('button', { name: 'CTRL-EX-01' }));
    await actor.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
    expect(await screen.findByText(/không có quyền thao tác/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Log' })).toBeNull();
  });

  it('surfaces a lifecycle-blocked BUSINESS_RULE inline, not as a toast (AC4)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeExceptionRepo(makeCase({ state: 'IN_REVIEW_PENDING_APPROVAL' }));
    fake.resolveException = vi.fn(() =>
      Promise.reject(
        new ApiError({
          status: 400,
          code: 'BUSINESS_RULE',
          message: 'Resolve requires evidence for this exception type',
        }),
      ),
    );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    await actor.click(await screen.findByRole('button', { name: 'CTRL-EX-01' }));
    await actor.click(await screen.findByRole('button', { name: 'Resolve' }));

    expect(await screen.findByText('Resolve requires evidence for this exception type')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });
});

/** Fake whose stored case mutates so invalidated detail/list queries observe the transition. */
class FakeExceptionRepo implements Partial<IComplianceRepository> {
  live: ExceptionCase;
  constructor(initial: ExceptionCase) {
    this.live = initial;
  }
  listExceptions = vi.fn(() => Promise.resolve(page([this.live])));
  getException = vi.fn(() => Promise.resolve(this.live));
  logException = vi.fn((_id: string, _input: { hardBlock?: boolean }) => {
    this.live = { ...this.live, state: 'LOGGED' };
    return Promise.resolve(this.live);
  });
  assignException = vi.fn(() => Promise.resolve(this.live));
  submitException = vi.fn(() => Promise.resolve(this.live));
  resolveException = vi.fn(() => Promise.resolve(this.live));
  closeException = vi.fn(() => Promise.resolve(this.live));
}
