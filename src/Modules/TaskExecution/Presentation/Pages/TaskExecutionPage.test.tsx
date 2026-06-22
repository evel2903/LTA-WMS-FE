// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import type { User } from '@modules/Auth/Domain/Entities/User';
import type { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import type { MobileScanEvent, MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type {
  ClaimMobileTaskInput,
  MobileTaskListFilter,
  RecordMobileScanInput,
} from '@modules/TaskExecution/Domain/Types/MobileTaskQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as ITaskExecutionRepository }));
vi.mock(
  '@modules/TaskExecution/Infrastructure/Repositories/TaskExecutionRepositoryInstance',
  () => ({
    get taskExecutionRepository() {
      return repo.current;
    },
  }),
);

import { TaskExecutionPage } from '@modules/TaskExecution/Presentation/Pages/TaskExecutionPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function makeTask(overrides: Partial<MobileTask> = {}): MobileTask {
  return {
    id: 'task-a',
    taskCode: 'MT-001',
    taskType: 'Putaway',
    taskStatus: 'Released',
    warehouseId: 'warehouse-a',
    warehouseCode: 'WH-A',
    ownerId: 'owner-a',
    ownerCode: 'OWN-A',
    sourceDocumentType: 'PutawayTask',
    sourceDocumentId: 'putaway-1',
    sourceDocumentCode: 'PUT-001',
    priority: 10,
    assignedUserId: null,
    claimedAt: null,
    releasedAt: null,
    dueAt: '2026-06-22T10:00:00.000Z',
    deviceCode: null,
    sessionId: null,
    taskPayload: { source: 'STAGE-01', target: 'A-01-01' },
    createdAt: '2026-06-22T08:00:00.000Z',
    updatedAt: '2026-06-22T08:00:00.000Z',
    ...overrides,
  };
}

function makeScan(overrides: Partial<MobileScanEvent> = {}): MobileScanEvent {
  return {
    id: 'scan-1',
    taskId: 'task-a',
    taskCode: 'MT-001',
    warehouseId: 'warehouse-a',
    ownerId: 'owner-a',
    scanType: 'Item',
    rawValue: '(01)01234567890128(10)LOT-A',
    normalizedValue: '01234567890128',
    result: 'Accepted',
    resolvedObjectType: 'SKU',
    resolvedObjectId: 'sku-1',
    parsedValueJson: { gtin: '01234567890128', lot: 'LOT-A' },
    rejectionCode: null,
    rejectionMessage: null,
    reasonCode: null,
    deviceCode: 'RF-01',
    sessionId: null,
    actorUserId: 'current-user',
    createdAt: '2026-06-22T08:30:00.000Z',
    ...overrides,
  };
}

class FakeRepository implements Partial<ITaskExecutionRepository> {
  public items: MobileTask[];

  constructor(initial: MobileTask[] = []) {
    this.items = initial;
  }

  list = vi.fn((filter?: MobileTaskListFilter) =>
    Promise.resolve(
      page(
        this.items.filter((item) => {
          if (filter?.warehouseId && item.warehouseId !== filter.warehouseId) return false;
          if (filter?.taskType && item.taskType !== filter.taskType) return false;
          if (filter?.taskStatus && item.taskStatus !== filter.taskStatus) return false;
          return true;
        }),
      ),
    ),
  );

  getById = vi.fn((id: string) =>
    Promise.resolve(this.items.find((item) => item.id === id) ?? this.items[0]),
  );

  claim = vi.fn((id: string, input?: ClaimMobileTaskInput) => {
    const index = this.items.findIndex((item) => item.id === id);
    this.items[index] = {
      ...this.items[index],
      taskStatus: 'Claimed',
      assignedUserId: 'current-user',
      deviceCode: input?.deviceCode ?? null,
      sessionId: input?.sessionId ?? null,
    };
    return Promise.resolve(this.items[index]);
  });

  release = vi.fn((id: string) => {
    const index = this.items.findIndex((item) => item.id === id);
    this.items[index] = { ...this.items[index], taskStatus: 'Released', assignedUserId: null };
    return Promise.resolve(this.items[index]);
  });

  recordScan = vi.fn((_id: string, input: RecordMobileScanInput) =>
    Promise.resolve(
      makeScan({
        scanType: input.scanType,
        rawValue: input.rawValue,
        deviceCode: input.deviceCode ?? null,
        sessionId: input.sessionId ?? null,
      }),
    ),
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TaskExecutionPage />
    </QueryClientProvider>,
  );
}

function setCurrentUser() {
  useAuthStore.getState().setUser({
    id: 'current-user' as User['id'],
    emailAddress: 'operator@example.com',
    role: 'User',
  });
}

afterEach(() => {
  cleanup();
  useAuthStore.getState().setUnauthenticated();
});

describe('TaskExecutionPage', () => {
  it('renders mobile task cards and claim/release controls without a table layout', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask()]);
    setCurrentUser();
    repo.current = fake;
    renderPage();

    const taskCard = await screen.findByRole('button', { name: /MT-001/i });
    expect(screen.queryByRole('table')).toBeNull();
    expect(taskCard).toBeTruthy();
    expect(screen.getByText(/scan and confirm controls/i)).toBeTruthy();

    await actor.click(taskCard);
    await actor.type(screen.getByLabelText('Device code'), 'RF-01');
    await actor.click(screen.getByRole('button', { name: 'Claim task' }));

    await waitFor(() => expect(fake.claim).toHaveBeenCalledWith('task-a', { deviceCode: 'RF-01' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Release task' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    await actor.click(screen.getByRole('button', { name: 'Release task' }));
    await waitFor(() => expect(fake.release).toHaveBeenCalledWith('task-a'));
  });

  it('shows permission denied read-only state and hides mutation buttons', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No mobile task read' }),
      ),
    );
    repo.current = fake;
    renderPage();

    expect(await screen.findByText(/permission denied/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Claim task' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Release task' })).toBeNull();
  });

  it('records scan evidence and shows accepted GS1 feedback', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask({ taskStatus: 'Claimed', assignedUserId: 'current-user' })]);
    setCurrentUser();
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: /MT-001/i });
    await actor.selectOptions(screen.getByLabelText('Scan type'), 'Item');
    await actor.type(screen.getByLabelText('Scan value'), '(01)01234567890128(10)LOT-A');
    await actor.click(screen.getByRole('button', { name: 'Record scan' }));

    await waitFor(() =>
      expect(fake.recordScan).toHaveBeenCalledWith('task-a', {
        scanType: 'Item',
        rawValue: '(01)01234567890128(10)LOT-A',
        manualEntry: false,
        reasonCode: undefined,
        deviceCode: undefined,
        sessionId: undefined,
      }),
    );
    expect(await screen.findByText(/Accepted scan/i)).toBeTruthy();
    expect(screen.getAllByText(/01234567890128/).length).toBeGreaterThan(0);
    expect(screen.getByText(/LOT-A/)).toBeTruthy();
  });

  it('shows rejected scan feedback from stable rejection payloads', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({ taskStatus: 'Claimed', assignedUserId: 'current-user' }),
    ]);
    fake.recordScan.mockResolvedValueOnce(
      makeScan({
        result: 'Rejected',
        normalizedValue: 'missing-barcode',
        resolvedObjectType: null,
        resolvedObjectId: null,
        parsedValueJson: {},
        rejectionCode: 'UNRESOLVED_BARCODE',
        rejectionMessage: 'Barcode could not be resolved',
      }),
    );
    setCurrentUser();
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: /MT-001/i });
    await actor.type(screen.getByLabelText('Scan value'), 'missing-barcode');
    await actor.click(screen.getByRole('button', { name: 'Record scan' }));

    expect(await screen.findByText(/Rejected scan/i)).toBeTruthy();
    expect(screen.getByText(/Barcode could not be resolved/i)).toBeTruthy();
  });

  it('clears previous scan feedback when a later scan mutation fails', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({ taskStatus: 'Claimed', assignedUserId: 'current-user' }),
    ]);
    fake.recordScan
      .mockResolvedValueOnce(makeScan())
      .mockRejectedValueOnce(new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Scan rejected' }));
    setCurrentUser();
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: /MT-001/i });
    await actor.type(screen.getByLabelText('Scan value'), '(01)01234567890128');
    await actor.click(screen.getByRole('button', { name: 'Record scan' }));
    expect(await screen.findByText(/Accepted scan/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('Scan value'), 'bad-scan');
    await actor.click(screen.getByRole('button', { name: 'Record scan' }));

    await waitFor(() => expect(fake.recordScan).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/Accepted scan/i)).toBeNull());
  });

  it('disables scan recording when another operator has claimed the task', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({ taskStatus: 'Claimed', assignedUserId: 'other-user' }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: /MT-001/i });
    await actor.type(screen.getByLabelText('Scan value'), '(01)01234567890128');

    expect(screen.getByRole('button', { name: 'Record scan' })).toHaveProperty('disabled', true);
    expect(fake.recordScan).not.toHaveBeenCalled();
  });

  it('requires a reason before recording manual-entry scan evidence', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({ taskStatus: 'Claimed', assignedUserId: 'current-user' }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: /MT-001/i });
    await actor.type(screen.getByLabelText('Scan value'), 'typed-sku');
    await actor.click(screen.getByLabelText('Manual entry'));

    expect(screen.getByRole('button', { name: 'Record scan' })).toHaveProperty('disabled', true);

    await actor.type(screen.getByLabelText('Reason code'), 'RC-V1-OVERRIDE');
    await actor.click(screen.getByRole('button', { name: 'Record scan' }));

    await waitFor(() =>
      expect(fake.recordScan).toHaveBeenCalledWith(
        'task-a',
        expect.objectContaining({
          rawValue: 'typed-sku',
          manualEntry: true,
          reasonCode: 'RC-V1-OVERRIDE',
        }),
      ),
    );
  });

  it('passes warehouse and task type filters to the repository', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({
        id: 'task-a',
        taskCode: 'MT-A',
        warehouseId: 'warehouse-a',
        warehouseCode: 'WH-A',
      }),
      makeTask({
        id: 'task-b',
        taskCode: 'MT-B',
        warehouseId: 'warehouse-b',
        warehouseCode: 'WH-B',
        taskType: 'Pick',
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: /MT-A/i });
    await actor.type(screen.getByLabelText('Warehouse filter'), 'warehouse-a');
    await actor.selectOptions(screen.getByLabelText('Task type filter'), 'Putaway');

    await waitFor(() =>
      expect(fake.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ warehouseId: 'warehouse-a', taskType: 'Putaway' }),
      ),
    );
  });

  it('disables task actions when the selected task state is terminal', async () => {
    const fake = new FakeRepository([
      makeTask({
        taskStatus: 'Completed',
        assignedUserId: 'current-user',
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderPage();

    await screen.findByRole('button', { name: /MT-001/i });

    expect(screen.getByRole('button', { name: 'Claim task' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Release task' })).toHaveProperty('disabled', true);
  });
});
