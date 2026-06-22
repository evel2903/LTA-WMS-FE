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
import type { MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type {
  ClaimMobileTaskInput,
  MobileTaskListFilter,
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
