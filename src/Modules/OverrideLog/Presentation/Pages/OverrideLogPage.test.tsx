// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IOverrideLogRepository } from '@modules/OverrideLog/Application/Interfaces/IOverrideLogRepository';
import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';

const repo = vi.hoisted(() => ({ current: null as unknown as IOverrideLogRepository }));
vi.mock('@modules/OverrideLog/Infrastructure/Repositories/OverrideLogRepositoryInstance', () => ({
  get overrideLogRepository() {
    return repo.current;
  },
}));

import { OverrideLogPage } from '@modules/OverrideLog/Presentation/Pages/OverrideLogPage';
import { useOverrideLogStore } from '@modules/OverrideLog/Application/Stores/OverrideLogStore';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
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
  beforeJson: { allowed: false },
  afterJson: { allowed: true },
  auditRef: 'audit-7',
  correlationId: 'corr-1',
  createdAt: '2026-06-21T00:00:00.000Z',
};

class FakeRepository implements Partial<IOverrideLogRepository> {
  list = vi.fn(() => Promise.resolve(page([log])));
  getById = vi.fn(() => Promise.resolve(log));
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <OverrideLogPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useOverrideLogStore.setState({ selectedLogId: null });
});
afterEach(() => cleanup());

describe('OverrideLogPage (C16)', () => {
  it('opens an override detail with before/after snapshots and exposes no mutate control (AC1/AC2/AC5)', async () => {
    const actor = userEvent.setup();
    repo.current = new FakeRepository();
    renderPage();

    await actor.click(await screen.findByRole('button', { name: 'RULE-PUTAWAY-01' }));

    expect(await screen.findByText('Before')).toBeTruthy();
    expect(screen.getByText('After')).toBeTruthy();
    // The after-image content is rendered read-only.
    expect(screen.getByText(/"allowed": true/)).toBeTruthy();

    // Immutable screen — no create/edit/delete/save mutate controls anywhere.
    expect(
      screen.queryByRole('button', { name: /create|new|edit|delete|save|update|approve|reject|override/i }),
    ).toBeNull();
    // The only interactive buttons are the row trigger + the Previous/Next pager.
    expect(screen.getByRole('button', { name: 'Previous' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('shows a permission-denied state when the list 403s (AC4)', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn(() => Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })));
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
  });
});
