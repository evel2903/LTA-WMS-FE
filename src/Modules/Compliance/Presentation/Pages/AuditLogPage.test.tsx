// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IComplianceRepository } from '@modules/Compliance/Application/Interfaces/IComplianceRepository';
import type { AuditLogEntry } from '@modules/Compliance/Domain/Entities/Compliance';

const repo = vi.hoisted(() => ({ current: null as unknown as IComplianceRepository }));
vi.mock('@modules/Compliance/Infrastructure/Repositories/ComplianceRepositoryInstance', () => ({
  get complianceRepository() {
    return repo.current;
  },
}));
vi.mock('@shared/Components/Ui/Sonner', () => ({ toast: { error: vi.fn() } }));

import { AuditLogPage } from '@modules/Compliance/Presentation/Pages/AuditLogPage';
import { useComplianceStore } from '@modules/Compliance/Application/Stores/ComplianceStore';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
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
  beforeJson: { State: 'DETECTED' },
  afterJson: { State: 'LOGGED' },
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
  getAuditLog = vi.fn(() => Promise.resolve(entry));
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuditLogPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useComplianceStore.setState({ selectedAuditLogId: null, selectedExceptionId: null });
});
afterEach(() => cleanup());

describe('AuditLogPage (C11 AC1 / AC2)', () => {
  it('opens an audit detail with the before/after snapshots (AC1)', async () => {
    const actor = userEvent.setup();
    repo.current = new FakeRepository() as unknown as IComplianceRepository;
    renderPage();

    await actor.click(await screen.findByText(new Date(entry.occurredAt).toLocaleString()));

    expect(await screen.findByText('Before')).toBeTruthy();
    expect(screen.getByText('After')).toBeTruthy();
    // The after-image content (State: LOGGED) is rendered read-only.
    expect(screen.getByText(/"State": "LOGGED"/)).toBeTruthy();
  });

  it('shows a permission-denied state when the audit query 403s', async () => {
    const fake = new FakeRepository();
    fake.listAuditLogs = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IComplianceRepository;
    renderPage();

    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
  });
});
