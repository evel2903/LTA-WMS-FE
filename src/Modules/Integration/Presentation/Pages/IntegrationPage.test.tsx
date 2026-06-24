// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIntegrationMutations } from '@modules/Integration/Application/Commands/UseIntegrationMutations';
import {
  useIntegrationDeadLetter,
  useIntegrationDeadLetters,
} from '@modules/Integration/Application/Queries/UseIntegrationDeadLetters';
import type { OutboxMessage } from '@modules/Integration/Domain/Types/Integration';
import { IntegrationDeadLetterDetailPage } from '@modules/Integration/Presentation/Pages/IntegrationDeadLetterDetailPage';
import { IntegrationPage } from '@modules/Integration/Presentation/Pages/IntegrationPage';

vi.mock('@modules/Integration/Application/Commands/UseIntegrationMutations', () => ({
  useIntegrationMutations: vi.fn(),
}));

vi.mock('@modules/Integration/Application/Queries/UseIntegrationDeadLetters', () => ({
  useIntegrationDeadLetter: vi.fn(),
  useIntegrationDeadLetters: vi.fn(),
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

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    retryDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    manualFixDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    acknowledgeDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    ignoreDeadLetter: { mutate: vi.fn(), isPending: false, error: null },
    recordFailure: { mutate: vi.fn(), isPending: false, error: null },
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
});
