// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIntegrationMutations } from '@modules/Integration/Application/Commands/UseIntegrationMutations';
import {
  useIntegrationDeadLetter,
  useIntegrationDeadLetters,
} from '@modules/Integration/Application/Queries/UseIntegrationDeadLetters';
import {
  useIntegrationReconciliationItems,
  useIntegrationReconciliationRun,
  useIntegrationReconciliationRuns,
} from '@modules/Integration/Application/Queries/UseIntegrationReconciliation';
import type { OutboxMessage, ReconciliationItem, ReconciliationRun } from '@modules/Integration/Domain/Types/Integration';
import { IntegrationDeadLetterDetailPage } from '@modules/Integration/Presentation/Pages/IntegrationDeadLetterDetailPage';
import { IntegrationPage } from '@modules/Integration/Presentation/Pages/IntegrationPage';
import { IntegrationReconciliationDetailPage } from '@modules/Integration/Presentation/Pages/IntegrationReconciliationDetailPage';
import { IntegrationReconciliationPage } from '@modules/Integration/Presentation/Pages/IntegrationReconciliationPage';

vi.mock('@modules/Integration/Application/Commands/UseIntegrationMutations', () => ({
  useIntegrationMutations: vi.fn(),
}));

vi.mock('@modules/Integration/Application/Queries/UseIntegrationDeadLetters', () => ({
  useIntegrationDeadLetter: vi.fn(),
  useIntegrationDeadLetters: vi.fn(),
}));

vi.mock('@modules/Integration/Application/Queries/UseIntegrationReconciliation', () => ({
  useIntegrationReconciliationItems: vi.fn(),
  useIntegrationReconciliationRun: vi.fn(),
  useIntegrationReconciliationRuns: vi.fn(),
}));

function makeMessage(overrides: Partial<OutboxMessage> = {}): OutboxMessage {
  return {
    id: 'outbox-1',
    sourceMessageId: 'source-1',
    messageId: 'msg-1',
    eventType: 'GoodsIssuePosted',
    version: '1.0',
    businessReference: 'SHIP-001',
    sourceSystem: 'LTA-WMS',
    targetSystem: 'ERP_TMS',
    warehouseContext: 'WT-01',
    ownerContext: 'OWNER-A',
    eventTime: '2026-06-25T00:00:00.000Z',
    correlationId: 'corr-1',
    causationId: 'cause-1',
    payload: { shipmentReference: 'SHIP-001' },
    status: 'DeadLetter',
    attemptCount: 5,
    maxAttempts: 5,
    nextRetryAt: null,
    lastError: 'ERP timeout',
    failureCategory: 'RetryExhausted',
    deadLetterReason: 'ERP timeout',
    deadLetteredAt: '2026-06-25T00:05:00.000Z',
    resolutionAction: null,
    actionIdempotencyKey: null,
    resolvedAt: null,
    resolvedBy: null,
    reasonCode: null,
    reasonCodeId: null,
    reasonNote: null,
    evidenceRefs: [],
    createdAt: '2026-06-25T00:00:00.000Z',
    createdBy: 'user-1',
    updatedAt: '2026-06-25T00:05:00.000Z',
    isDuplicate: false,
    ...overrides,
  };
}

function makeRun(overrides: Partial<ReconciliationRun> = {}): ReconciliationRun {
  return {
    id: 'run-1',
    businessReference: 'SHIP-001',
    warehouseId: 'WT-01',
    ownerId: 'OWNER-A',
    runStatus: 'CompletedWithMismatch',
    sourceCounts: { OutboxMessages: 1, QuantityMismatches: 1 },
    itemCount: 1,
    mismatchCount: 1,
    exceptionCount: 1,
    idempotencyKey: 'recon-1',
    reasonCode: 'RC-V1-DEAD-LETTER-FIX',
    reasonCodeId: 'reason-1',
    reasonNote: 'Manual reconciliation',
    evidenceRefs: ['ticket:RECON-1'],
    resolvedAt: null,
    resolvedBy: null,
    createdAt: '2026-06-25T00:00:00.000Z',
    createdBy: 'user-1',
    updatedAt: '2026-06-25T00:05:00.000Z',
    isDuplicate: false,
    ...overrides,
  };
}

function makeItem(overrides: Partial<ReconciliationItem> = {}): ReconciliationItem {
  return {
    id: 'item-1',
    runId: 'run-1',
    itemStatus: 'Open',
    severity: 'High',
    mismatchType: 'QuantityMismatch',
    sourceType: 'GoodsIssuePosted',
    sourceId: 'msg-1',
    expectedSummary: { Quantity: 10 },
    actualSummary: { Quantity: 8 },
    exceptionCaseId: 'exception-1',
    outboxMessageId: 'outbox-1',
    deadLetterMessageId: 'outbox-1',
    resolutionNote: null,
    approvalRequestId: null,
    reasonCode: null,
    reasonCodeId: null,
    reasonNote: null,
    evidenceRefs: [],
    resolvedAt: null,
    resolvedBy: null,
    createdAt: '2026-06-25T00:00:00.000Z',
    updatedAt: '2026-06-25T00:05:00.000Z',
    isDuplicate: false,
    ...overrides,
  };
}

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    retryDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    manualFixDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    acknowledgeDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    ignoreDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    recordFailure: { mutate: vi.fn(), isPending: false, error: null },
    createReconciliationRun: { mutate: vi.fn(), isPending: false, error: null },
    resolveReconciliationItem: { mutate: vi.fn(), isPending: false, error: null },
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/integration']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('Integration list/detail pages', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(useIntegrationDeadLetters).mockReturnValue({
      data: { items: [makeMessage()], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIntegrationDeadLetters>);
    vi.mocked(useIntegrationDeadLetter).mockReturnValue({
      data: makeMessage(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIntegrationDeadLetter>);
    vi.mocked(useIntegrationReconciliationRuns).mockReturnValue({
      data: { items: [makeRun()], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIntegrationReconciliationRuns>);
    vi.mocked(useIntegrationReconciliationRun).mockReturnValue({
      data: makeRun(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIntegrationReconciliationRun>);
    vi.mocked(useIntegrationReconciliationItems).mockReturnValue({
      data: { items: [makeItem()], page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIntegrationReconciliationItems>);
    vi.mocked(useIntegrationMutations).mockReturnValue(
      mutationState() as unknown as ReturnType<typeof useIntegrationMutations>,
    );
  });

  it('renders dead-letter list as links and keeps action forms off the list page', () => {
    renderWithRouter(<IntegrationPage />);

    expect(screen.getByRole('link', { name: /SHIP-001/i }).getAttribute('href')).toBe(
      '/integration/dead-letters/outbox-1',
    );
    expect(screen.queryByRole('button', { name: /Apply action/i })).toBeNull();
    expect(useIntegrationDeadLetters).toHaveBeenCalledWith({
      businessReference: undefined,
      warehouseContext: undefined,
      ownerContext: undefined,
      eventType: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      updatedFrom: undefined,
      updatedTo: undefined,
      status: 'DeadLetter',
    });
  });

  it('submits retry from the detail action route with reason, evidence and idempotency', () => {
    const mutations = mutationState({
      retryDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    });
    vi.mocked(useIntegrationMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useIntegrationMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/integration/dead-letters/:id/:action" element={<IntegrationDeadLetterDetailPage />} />
      </Routes>,
      ['/integration/dead-letters/outbox-1/retry'],
    );

    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'ticket:INT-1' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'retry-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Apply action$/i }));

    expect(mutations.retryDeadLetter.mutate).toHaveBeenCalledWith(
      {
        id: 'outbox-1',
        payload: {
          reasonCode: 'RC-V1-DEAD-LETTER-FIX',
          reasonNote: undefined,
          evidenceRefs: ['ticket:INT-1'],
          idempotencyKey: 'retry-1',
          manualFixPayload: null,
        },
      },
      expect.any(Object),
    );
  });

  it('blocks manual fix when payload JSON is invalid before mutation', () => {
    const mutations = mutationState({
      manualFixDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    });
    vi.mocked(useIntegrationMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useIntegrationMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/integration/dead-letters/:id/:action" element={<IntegrationDeadLetterDetailPage />} />
      </Routes>,
      ['/integration/dead-letters/outbox-1/manual-fix'],
    );

    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'ticket:INT-2' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'fix-1' } });
    fireEvent.change(screen.getByLabelText('Manual fix payload JSON'), { target: { value: '{bad-json' } });
    fireEvent.click(screen.getByRole('button', { name: /^Apply action$/i }));

    expect(screen.getByText('Manual fix payload must be valid JSON.')).toBeTruthy();
    expect(mutations.manualFixDeadLetter.mutate).not.toHaveBeenCalled();
  });

  it('renders resolved dead-letter as read-only with resolution audit context', () => {
    vi.mocked(useIntegrationDeadLetter).mockReturnValue({
      data: makeMessage({
        status: 'Acknowledged',
        resolutionAction: 'Acknowledge',
        resolvedAt: '2026-06-25T00:10:00.000Z',
        resolvedBy: 'user-2',
        reasonCode: 'RC-V1-DEAD-LETTER-FIX',
        reasonNote: 'Recovered externally',
        evidenceRefs: ['ticket:ACK-1'],
      }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIntegrationDeadLetter>);

    renderWithRouter(
      <Routes>
        <Route path="/integration/dead-letters/:id" element={<IntegrationDeadLetterDetailPage />} />
      </Routes>,
      ['/integration/dead-letters/outbox-1'],
    );

    expect(screen.getByText('Read-only dead-letter')).toBeTruthy();
    expect(screen.getByText('Resolution action: Acknowledge')).toBeTruthy();
    expect(screen.getByText(/ticket:ACK-1/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Retry/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Apply action/i })).toBeNull();
  });

  it('renders reconciliation list as links and keeps resolve form off the list page', () => {
    renderWithRouter(<IntegrationReconciliationPage />, ['/integration/reconciliation']);

    expect(screen.getByRole('link', { name: /SHIP-001/i }).getAttribute('href')).toBe(
      '/integration/reconciliation/run-1',
    );
    expect(screen.queryByRole('button', { name: /Resolve item/i })).toBeNull();
    expect(useIntegrationReconciliationRuns).toHaveBeenCalledWith({
      businessReference: undefined,
      warehouseId: undefined,
      ownerId: undefined,
      runStatus: undefined,
      updatedFrom: undefined,
      updatedTo: undefined,
    });
  });

  it('submits reconciliation resolve from the detail action route with reason, evidence and idempotency', () => {
    const mutations = mutationState({
      resolveReconciliationItem: { mutate: vi.fn(), isPending: false, error: null },
    });
    vi.mocked(useIntegrationMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useIntegrationMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/integration/reconciliation/:id/:action" element={<IntegrationReconciliationDetailPage />} />
      </Routes>,
      ['/integration/reconciliation/run-1/resolve'],
    );

    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'ticket:RECON-1' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'resolve-1' } });
    fireEvent.change(screen.getByLabelText('Resolution note'), {
      target: { value: 'External correction confirmed' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Resolve item$/i }));

    expect(mutations.resolveReconciliationItem.mutate).toHaveBeenCalledWith(
      {
        id: 'item-1',
        payload: {
          reasonCode: 'RC-V1-DEAD-LETTER-FIX',
          reasonNote: undefined,
          evidenceRefs: ['ticket:RECON-1'],
          idempotencyKey: 'resolve-1',
          resolutionNote: 'External correction confirmed',
          approvalRequestId: undefined,
          impactsInventory: false,
          impactsFinance: false,
        },
      },
      expect.any(Object),
    );
  });

  it('shows blocked state and prevents reconciliation impact submit without approval', () => {
    const mutations = mutationState({
      resolveReconciliationItem: { mutate: vi.fn(), isPending: false, error: null },
    });
    vi.mocked(useIntegrationMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useIntegrationMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/integration/reconciliation/:id/:action" element={<IntegrationReconciliationDetailPage />} />
      </Routes>,
      ['/integration/reconciliation/run-1/resolve'],
    );

    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'ticket:RECON-1' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'resolve-1' } });
    fireEvent.change(screen.getByLabelText('Resolution note'), {
      target: { value: 'Would affect inventory' },
    });
    fireEvent.click(screen.getByLabelText('Impacts inventory'));
    fireEvent.click(screen.getByRole('button', { name: /^Resolve item$/i }));

    expect(screen.getByText('Blocked by workflow control')).toBeTruthy();
    expect(mutations.resolveReconciliationItem.mutate).not.toHaveBeenCalled();
  });
});
