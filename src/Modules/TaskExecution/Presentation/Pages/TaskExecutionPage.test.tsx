// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import { useAuthStore } from '@modules/Auth/Application/Stores/AuthStore';
import type { User } from '@modules/Auth/Domain/Entities/User';
import type { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import type { MobileScanEvent, MobileTask } from '@modules/TaskExecution/Domain/Types/MobileTask';
import type {
  ClaimMobileTaskInput,
  ConfirmPickTaskInput,
  ConfirmPickTaskResult,
  MobileTaskListFilter,
  PickExceptionResult,
  RecordMobileScanInput,
  ReportPickExceptionInput,
  RequestPickSubstitutionInput,
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

import { TaskExecutionDetailPage } from '@modules/TaskExecution/Presentation/Pages/TaskExecutionDetailPage';
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
    this.items.find((item) => item.id === id)
      ? Promise.resolve(this.items.find((item) => item.id === id) as MobileTask)
      : Promise.reject(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Task not found' })),
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
        normalizedValue:
          input.scanType === 'Quantity' || input.scanType === 'Lot' || input.scanType === 'Serial' || input.scanType === 'ExpiryDate'
            ? input.rawValue
            : '01234567890128',
        resolvedObjectId:
          input.scanType === 'Location' ? 'loc-source' : input.scanType === 'Item' ? 'sku-1' : null,
        result: input.rawValue.includes('wrong') ? 'Rejected' : 'Accepted',
        parsedValueJson:
          input.scanType === 'Item'
            ? { gtin: '01234567890128', Quantity: 5, LotNumber: 'LOT-A' }
            : input.scanType === 'Quantity'
              ? {}
              : undefined,
      }),
    ),
  );

  confirmPickTask = vi.fn(
    (mobileTaskId: string, _input: ConfirmPickTaskInput): Promise<ConfirmPickTaskResult> => {
      const mobileTask = this.items.find((item) => item.id === mobileTaskId) ?? null;
      return Promise.resolve({
        pickTask: { Id: 'pick-task-1', Status: 'Completed' },
        mobileTask: mobileTask ? { ...mobileTask, taskStatus: 'Completed' } : null,
        inventoryControl: {
          InventoryTransaction: { ToInventoryStatusCode: 'PICKED' },
        },
        scanEvidence: [],
        outboxMessageId: 'outbox-1',
        isDuplicate: false,
      });
    },
  );

  reportPickException = vi.fn(
    (mobileTaskId: string, _input: ReportPickExceptionInput): Promise<PickExceptionResult> => {
      const mobileTask = this.items.find((item) => item.id === mobileTaskId) ?? null;
      return Promise.resolve({
        pickTask: { Id: 'pick-task-1', ExceptionType: 'ShortPick' },
        mobileTask: mobileTask ? { ...mobileTask, taskStatus: 'Blocked' } : null,
        exceptionCase: { Id: 'exception-1' },
        replenishmentRequired: true,
        replenishmentTask: null,
        substitutionStatus: null,
        approvalRequest: null,
        isDuplicate: false,
      });
    },
  );

  requestPickSubstitution = vi.fn(
    (mobileTaskId: string, input: RequestPickSubstitutionInput): Promise<PickExceptionResult> => {
      const mobileTask = this.items.find((item) => item.id === mobileTaskId) ?? null;
      return Promise.resolve({
        pickTask: { Id: 'pick-task-1', SubstitutionStatus: input.policyDecision },
        mobileTask,
        exceptionCase: null,
        replenishmentRequired: false,
        replenishmentTask: null,
        substitutionStatus:
          input.policyDecision === 'RequireApproval' ? 'PendingApproval' : 'AutoApplied',
        approvalRequest: input.policyDecision === 'RequireApproval' ? { Id: 'approval-1' } : null,
        isDuplicate: false,
      });
    },
  );
}

function renderWithClient(ui: React.ReactElement, initialEntries = ['/mobile/tasks']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderListPage() {
  return renderWithClient(<TaskExecutionPage />);
}

function renderDetailPage(path = '/mobile/tasks/task-a') {
  return renderWithClient(
    <Routes>
      <Route path="/mobile/tasks/:id" element={<TaskExecutionDetailPage />} />
      <Route path="/mobile/tasks/:id/:action" element={<TaskExecutionDetailPage />} />
    </Routes>,
    [path],
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

describe('TaskExecution list/detail pages', () => {
  it('renders mobile task cards as detail links and keeps action controls off the root list', async () => {
    const fake = new FakeRepository([makeTask()]);
    repo.current = fake;
    renderListPage();

    const taskLink = await screen.findByRole('link', { name: /MT-001/i });
    expect(taskLink.getAttribute('href')).toBe('/mobile/tasks/task-a');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nhận tác vụ' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ghi nhận quét' })).toBeNull();
  });

  it('shows permission denied state on the root list and hides mutation buttons', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No mobile task read' }),
      ),
    );
    repo.current = fake;
    renderListPage();

    expect((await screen.findAllByText(/không có quyền/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Nhận tác vụ' })).toBeNull();
  });

  it('claims and releases from the task detail route using the route id', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([makeTask()]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage();

    await screen.findByText('MT-001');
    expect(fake.getById).toHaveBeenCalledWith('task-a');
    await actor.type(screen.getByLabelText('Mã thiết bị'), 'RF-01');
    await actor.click(screen.getByRole('button', { name: 'Nhận tác vụ' }));

    await waitFor(() => expect(fake.claim).toHaveBeenCalledWith('task-a', { deviceCode: 'RF-01' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Nhả tác vụ' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    await actor.click(screen.getByRole('button', { name: 'Nhả tác vụ' }));
    await waitFor(() => expect(fake.release).toHaveBeenCalledWith('task-a'));
  });

  it('records scan evidence and shows accepted GS1 feedback on detail route', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({ taskStatus: 'Claimed', assignedUserId: 'current-user' }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage('/mobile/tasks/task-a/scan');

    await screen.findByText('MT-001');
    await actor.selectOptions(screen.getByLabelText('Loại quét'), 'Item');
    await actor.type(screen.getByLabelText('Giá trị quét'), '(01)01234567890128(10)LOT-A');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));

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
    expect(await screen.findByText(/Lượt quét được chấp nhận/i)).toBeTruthy();
    expect(screen.getAllByText(/01234567890128/).length).toBeGreaterThan(0);
    expect(screen.getByText(/LOT-A/)).toBeTruthy();
  });

  it('requires a reason before recording manual-entry scan evidence', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({ taskStatus: 'Claimed', assignedUserId: 'current-user' }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage();

    await screen.findByText('MT-001');
    await actor.type(screen.getByLabelText('Giá trị quét'), 'typed-sku');
    await actor.click(screen.getByLabelText('Nhập thủ công'));

    expect(screen.getByRole('button', { name: 'Ghi nhận quét' })).toHaveProperty('disabled', true);

    await actor.type(screen.getByLabelText('Mã lý do'), 'RC-V1-OVERRIDE');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));

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

  it('confirms a pick task from detail route after accepted location, item and quantity scans', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({
        taskType: 'Pick',
        taskStatus: 'Claimed',
        assignedUserId: 'current-user',
        sourceDocumentType: 'PickTask',
        sourceDocumentId: 'pick-task-1',
        sourceDocumentCode: 'PT-001',
        taskPayload: {
          PickTaskId: 'pick-task-1',
          SourceLocationId: 'loc-source',
          SkuId: 'sku-1',
          SkuCode: 'SKU-1',
          Quantity: 5,
          LotNumber: 'LOT-A',
          TargetReference: 'SHIP_TO:CUST-1',
        },
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage('/mobile/tasks/task-a/confirm');

    await screen.findByText('Kỳ vọng thực hiện lấy hàng');
    expect(screen.getByRole('button', { name: 'Xác nhận lấy hàng' })).toHaveProperty('disabled', true);

    await actor.selectOptions(screen.getByLabelText('Loại quét'), 'Location');
    await actor.type(screen.getByLabelText('Giá trị quét'), 'loc-source');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));
    await screen.findByText(/Lượt quét được chấp nhận/i);

    await actor.selectOptions(screen.getByLabelText('Loại quét'), 'Item');
    await actor.type(screen.getByLabelText('Giá trị quét'), '(01)01234567890128(10)LOT-A(30)5');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Xác nhận lấy hàng' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    await actor.click(screen.getByRole('button', { name: 'Xác nhận lấy hàng' }));

    await waitFor(() =>
      expect(fake.confirmPickTask).toHaveBeenCalledWith(
        'task-a',
        expect.objectContaining({
          mobileTaskId: 'task-a',
          reasonCode: 'RC-V1-DISCREPANCY',
          idempotencyKey: 'pick-confirm:pick-task-1:task-a',
        }),
      ),
    );
    expect(await screen.findByText('Đã ghi nhận xác nhận lấy hàng')).toBeTruthy();
  });

  it('shows dedicated Lô/Serial/Hạn dùng scan inputs only for the fields the pick task expects (IDC-06 AC1-3)', async () => {
    const fake = new FakeRepository([
      makeTask({
        taskType: 'Pick',
        taskStatus: 'Claimed',
        assignedUserId: 'current-user',
        sourceDocumentType: 'PickTask',
        sourceDocumentId: 'pick-task-1',
        taskPayload: {
          PickTaskId: 'pick-task-1',
          SourceLocationId: 'loc-source',
          SkuId: 'sku-1',
          Quantity: 5,
          SerialNumber: 'SN-1',
        },
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage('/mobile/tasks/task-a/confirm');

    await screen.findByText('Kỳ vọng thực hiện lấy hàng');
    expect(await screen.findByLabelText('Quét serial')).toBeTruthy();
    expect(screen.queryByLabelText('Quét lô')).toBeNull();
    expect(screen.queryByLabelText('Quét hạn dùng')).toBeNull();
  });

  it('shows no dedicated Lô/Serial/Hạn dùng inputs when the pick task has no such expectation (IDC-06 AC3 regression)', async () => {
    const fake = new FakeRepository([
      makeTask({
        taskType: 'Pick',
        taskStatus: 'Claimed',
        assignedUserId: 'current-user',
        sourceDocumentType: 'PickTask',
        sourceDocumentId: 'pick-task-1',
        taskPayload: {
          PickTaskId: 'pick-task-1',
          SourceLocationId: 'loc-source',
          SkuId: 'sku-1',
          Quantity: 5,
        },
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage('/mobile/tasks/task-a/confirm');

    await screen.findByText('Kỳ vọng thực hiện lấy hàng');
    expect(screen.queryByLabelText('Quét lô')).toBeNull();
    expect(screen.queryByLabelText('Quét serial')).toBeNull();
    expect(screen.queryByLabelText('Quét hạn dùng')).toBeNull();
  });

  it('confirms a pick task using the dedicated Serial scan input, not the shared Item scan field (IDC-06 AC1, AC5)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({
        taskType: 'Pick',
        taskStatus: 'Claimed',
        assignedUserId: 'current-user',
        sourceDocumentType: 'PickTask',
        sourceDocumentId: 'pick-task-1',
        sourceDocumentCode: 'PT-001',
        taskPayload: {
          PickTaskId: 'pick-task-1',
          SourceLocationId: 'loc-source',
          SkuId: 'sku-1',
          SkuCode: 'SKU-1',
          Quantity: 5,
          SerialNumber: 'SN-1',
          TargetReference: 'SHIP_TO:CUST-1',
        },
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage('/mobile/tasks/task-a/confirm');

    await screen.findByText('Kỳ vọng thực hiện lấy hàng');

    await actor.selectOptions(screen.getByLabelText('Loại quét'), 'Location');
    await actor.type(screen.getByLabelText('Giá trị quét'), 'loc-source');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));
    await screen.findByText(/Lượt quét được chấp nhận/i);

    await actor.selectOptions(screen.getByLabelText('Loại quét'), 'Item');
    await actor.type(screen.getByLabelText('Giá trị quét'), '(01)01234567890128(30)5');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));

    await actor.type(await screen.findByLabelText('Quét serial'), 'SN-1');
    await actor.click(screen.getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() =>
      expect(fake.recordScan).toHaveBeenCalledWith(
        'task-a',
        expect.objectContaining({ scanType: 'Serial', rawValue: 'SN-1' }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Xác nhận lấy hàng' })).toHaveProperty(
        'disabled',
        false,
      ),
    );
    await actor.click(screen.getByRole('button', { name: 'Xác nhận lấy hàng' }));

    await waitFor(() => expect(fake.confirmPickTask).toHaveBeenCalledWith('task-a', expect.any(Object)));
  });

  it('does not carry the shared "Nhập tay" toggle into a dedicated Lot/Serial/Expiry submission (IDC-06 review fix)', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({
        taskType: 'Pick',
        taskStatus: 'Claimed',
        assignedUserId: 'current-user',
        sourceDocumentType: 'PickTask',
        sourceDocumentId: 'pick-task-1',
        taskPayload: {
          PickTaskId: 'pick-task-1',
          SourceLocationId: 'loc-source',
          SkuId: 'sku-1',
          Quantity: 5,
          SerialNumber: 'SN-1',
        },
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage('/mobile/tasks/task-a/confirm');

    await screen.findByText('Kỳ vọng thực hiện lấy hàng');

    // Operator ticks manual-entry for the (unrelated) shared Item-scan override flow.
    await actor.click(screen.getByLabelText('Nhập thủ công'));

    await actor.type(await screen.findByLabelText('Quét serial'), 'SN-1');
    await actor.click(screen.getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() =>
      expect(fake.recordScan).toHaveBeenCalledWith(
        'task-a',
        expect.objectContaining({ scanType: 'Serial', rawValue: 'SN-1', manualEntry: false }),
      ),
    );
  });

  it('reports pick exception and requests substitution from the detail route', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({
        taskType: 'Pick',
        taskStatus: 'Claimed',
        assignedUserId: 'current-user',
        sourceDocumentType: 'PickTask',
        sourceDocumentId: 'pick-task-1',
        sourceDocumentCode: 'PT-001',
        taskPayload: {
          PickTaskId: 'pick-task-1',
          SourceLocationId: 'loc-source',
          SkuId: 'sku-1',
          Quantity: 5,
        },
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage('/mobile/tasks/task-a/exception');

    await screen.findByText('Ngoại lệ lấy hàng');
    await actor.selectOptions(screen.getByLabelText('Loại ngoại lệ'), 'Damaged');
    await actor.type(screen.getByLabelText('Tham chiếu bằng chứng'), 'scan:damaged');
    await actor.type(screen.getByLabelText('Số lượng hư hỏng'), '1');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận ngoại lệ' }));

    await waitFor(() =>
      expect(fake.reportPickException).toHaveBeenCalledWith(
        'task-a',
        expect.objectContaining({
          mobileTaskId: 'task-a',
          exceptionType: 'Damaged',
          evidenceRefs: ['scan:damaged'],
          damagedQuantity: 1,
          idempotencyKey: 'pick-exception:pick-task-1:Damaged:scan:damaged',
        }),
      ),
    );
    expect(await screen.findByText(/Đã ghi nhận ngoại lệ lấy hàng/i)).toBeTruthy();

    await actor.type(screen.getByLabelText('ID SKU thay thế'), 'sku-sub');
    await actor.type(screen.getByLabelText(/^Số lượng$/), '2');
    await actor.selectOptions(screen.getByLabelText('Quyết định chính sách'), 'Allow');
    await actor.click(screen.getByRole('button', { name: 'Yêu cầu thay thế' }));

    await waitFor(() =>
      expect(fake.requestPickSubstitution).toHaveBeenCalledWith(
        'task-a',
        expect.objectContaining({
          mobileTaskId: 'task-a',
          substituteSkuId: 'sku-sub',
          quantity: 2,
          policyDecision: 'Allow',
          evidenceRefs: ['scan:damaged'],
          idempotencyKey: 'pick-substitution:pick-task-1:sku-sub:scan:damaged',
        }),
      ),
    );
    expect(await screen.findByText(/Ngữ cảnh thay thế đã được ghi nhận/i)).toBeTruthy();
  });

  it('disables pick confirmation when a later item scan is rejected', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makeTask({
        taskType: 'Pick',
        taskStatus: 'Claimed',
        assignedUserId: 'current-user',
        sourceDocumentType: 'PickTask',
        sourceDocumentId: 'pick-task-1',
        taskPayload: {
          PickTaskId: 'pick-task-1',
          SourceLocationId: 'loc-source',
          SkuId: 'sku-1',
          Quantity: 5,
          LotNumber: 'LOT-A',
        },
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage('/mobile/tasks/task-a/confirm');

    await screen.findByText('Kỳ vọng thực hiện lấy hàng');
    await actor.selectOptions(screen.getByLabelText('Loại quét'), 'Location');
    await actor.type(screen.getByLabelText('Giá trị quét'), 'loc-source');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));
    await screen.findByText(/Lượt quét được chấp nhận/i);

    await actor.selectOptions(screen.getByLabelText('Loại quét'), 'Item');
    await actor.type(screen.getByLabelText('Giá trị quét'), '(01)01234567890128(10)LOT-A(30)5');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Xác nhận lấy hàng' })).toHaveProperty(
        'disabled',
        false,
      ),
    );

    await actor.type(screen.getByLabelText('Giá trị quét'), 'wrong-item');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận quét' }));
    await screen.findByText(/Lượt quét bị từ chối/i);

    expect(screen.getByRole('button', { name: 'Xác nhận lấy hàng' })).toHaveProperty('disabled', true);
  });

  it('disables task actions when detail task state is terminal', async () => {
    const fake = new FakeRepository([
      makeTask({
        taskStatus: 'Completed',
        assignedUserId: 'current-user',
      }),
    ]);
    setCurrentUser();
    repo.current = fake;
    renderDetailPage();

    await screen.findByText('MT-001');
    expect(screen.getByRole('button', { name: 'Nhận tác vụ' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Nhả tác vụ' })).toHaveProperty('disabled', true);
  });

  it('shows not found when the route id has no matching task', async () => {
    const fake = new FakeRepository([makeTask()]);
    repo.current = fake;
    renderDetailPage('/mobile/tasks/missing-task');

    expect(await screen.findByText(/Không tìm thấy tác vụ mobile được yêu cầu/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Nhận tác vụ' })).toBeNull();
  });
});
