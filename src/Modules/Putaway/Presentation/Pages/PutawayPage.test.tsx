// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IPutawayRepository } from '@modules/Putaway/Application/Interfaces/IPutawayRepository';
import type { PutawayTask } from '@modules/Putaway/Domain/Types/PutawayTask';
import type {
  PutawayTaskListFilter,
  ReleasePutawayTaskInput,
} from '@modules/Putaway/Domain/Types/PutawayTaskQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IPutawayRepository }));
vi.mock('@modules/Putaway/Infrastructure/Repositories/PutawayRepositoryInstance', () => ({
  get putawayRepository() {
    return repo.current;
  },
}));

import { PutawayPage } from '@modules/Putaway/Presentation/Pages/PutawayPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function makeTask(overrides: Partial<PutawayTask> = {}): PutawayTask {
  return {
    id: 'putaway-1',
    taskCode: 'PUT-001',
    taskStatus: 'Released',
    inboundPutawayReleaseId: 'release-1',
    receiptId: 'receipt-1',
    receiptLineId: 'receipt-line-1',
    inboundPlanId: 'plan-1',
    inboundPlanLineId: 'plan-line-1',
    inboundLpnId: 'lpn-1',
    ownerId: 'owner-1',
    ownerCode: 'OWN-A',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-A',
    skuId: 'sku-1',
    skuCode: 'SKU-A',
    uomId: 'uom-1',
    uomCode: 'EA',
    quantity: 5,
    lpnCode: 'LPN-001',
    ssccCode: null,
    inventoryStatusCode: 'READY_FOR_PUTAWAY',
    sourceLocationId: 'staging-1',
    sourceLocationCode: 'RCV-STG-01',
    targetLocationId: 'loc-1',
    targetLocationCode: 'A-01',
    targetLocationProfileId: 'profile-1',
    priority: 50,
    workPoolCode: null,
    assignedUserId: null,
    constraintJson: { SelectedBy: 'suggested_target' },
    eligibilityDecisionJson: { Decision: 'Released' },
    outboxMessageId: 'outbox-1',
    mobileTaskId: 'mobile-1',
    reasonCode: null,
    reasonCodeId: null,
    reasonNote: null,
    evidenceRefs: [],
    idempotencyKey: 'putaway-key-1',
    releasedAt: '2026-06-23T03:00:00.000Z',
    releasedBy: 'operator-1',
    isDuplicate: false,
    createdAt: '2026-06-23T03:00:00.000Z',
    updatedAt: '2026-06-23T03:00:00.000Z',
    ...overrides,
  };
}

class FakeRepository implements Partial<IPutawayRepository> {
  public items: PutawayTask[];

  constructor(items: PutawayTask[] = []) {
    this.items = items;
  }

  list = vi.fn((filter?: PutawayTaskListFilter) =>
    Promise.resolve(
      page(
        this.items.filter((item) => {
          if (filter?.warehouseId && item.warehouseId !== filter.warehouseId) return false;
          if (filter?.taskStatus && item.taskStatus !== filter.taskStatus) return false;
          return true;
        }),
      ),
    ),
  );

  getById = vi.fn((id: string) => Promise.resolve(this.items.find((item) => item.id === id) ?? this.items[0]));

  release = vi.fn((input: ReleasePutawayTaskInput) => {
    const created = makeTask({
      id: 'putaway-new',
      inboundPutawayReleaseId: input.inboundPutawayReleaseId,
      sourceLocationCode: input.sourceLocationCode ?? 'RCV-STG-01',
      idempotencyKey: input.idempotencyKey,
    });
    this.items.unshift(created);
    return Promise.resolve(created);
  });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PutawayPage />
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('PutawayPage', () => {
  it('renders putaway tasks and releases a new task through repository layer', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask()]);
    repo.current = fake;

    renderPage();

    expect(await screen.findByText('PUT-001')).toBeTruthy();
    await actor.type(screen.getByLabelText('Inbound putaway release id'), 'release-2');
    await actor.type(screen.getByLabelText('Source location code'), 'RCV-STG-02');
    await actor.type(screen.getByLabelText('Idempotency key'), 'putaway-key-2');
    await actor.click(screen.getByRole('button', { name: /Release putaway task/i }));

    await waitFor(() =>
      expect(fake.release).toHaveBeenCalledWith({
        inboundPutawayReleaseId: 'release-2',
        sourceLocationCode: 'RCV-STG-02',
        targetLocationId: undefined,
        priority: 50,
        workPoolCode: undefined,
        reasonCode: undefined,
        reasonNote: undefined,
        evidenceRefs: [],
        idempotencyKey: 'putaway-key-2',
      }),
    );
    expect(await screen.findByText(/PUT-001 released/i)).toBeTruthy();
  });

  it('shows backend blocked reason from ApiError', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    fake.release = vi.fn(() =>
      Promise.reject(
        new ApiError({
          status: 400,
          code: 'BUSINESS_RULE',
          message: 'Target location is not eligible for putaway',
        }),
      ),
    );
    repo.current = fake;

    renderPage();

    await actor.type(screen.getByLabelText('Inbound putaway release id'), 'release-1');
    await actor.type(screen.getByLabelText('Idempotency key'), 'putaway-key-1');
    await actor.click(screen.getByRole('button', { name: /Release putaway task/i }));

    expect(await screen.findByText(/Target location is not eligible for putaway/i)).toBeTruthy();
  });
});
