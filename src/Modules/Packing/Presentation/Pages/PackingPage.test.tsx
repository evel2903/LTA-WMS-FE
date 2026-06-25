// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import { usePackingMutations } from '@modules/Packing/Application/Commands/UsePackingMutations';
import { usePackage, usePackages } from '@modules/Packing/Application/Queries/UsePacking';
import type {
  PackSession,
  Package,
  ReadyForStagingResult,
} from '@modules/Packing/Domain/Types/Packing';
import {
  PackingCreatePage,
  PackingDetailPage,
} from '@modules/Packing/Presentation/Pages/PackingDetailPage';
import { PackingPage } from '@modules/Packing/Presentation/Pages/PackingPage';

vi.mock('@modules/Packing/Application/Commands/UsePackingMutations', () => ({
  usePackingMutations: vi.fn(),
}));

vi.mock('@modules/Packing/Application/Queries/UsePacking', () => ({
  usePackages: vi.fn(),
  usePackage: vi.fn(),
}));

function makePackage(overrides: Partial<Package> = {}): Package {
  return {
    id: 'package-1',
    packageCode: 'PKG-001',
    packSessionId: 'session-1',
    pickTaskId: 'pick-task-1',
    outboundOrderId: 'outbound-1',
    warehouseProfileId: 'profile-1',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WT-01',
    ownerId: 'owner-1',
    ownerCode: 'OWN',
    status: 'Packed',
    checkRequired: true,
    checkResult: 'Passed',
    cartonType: 'CARTON-STD',
    weight: 10,
    length: 30,
    width: 20,
    height: 15,
    labelBlockingDecision: 'Allowed',
    labelPrintJobId: 'print-job-1',
    labelPrintJobCode: 'PJ-001',
    closedAt: '2026-06-24T00:10:00.000Z',
    closedBy: 'user-1',
    readyForStagingAt: null,
    readyForStagingBy: null,
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:10:00.000Z',
    contents: [
      {
        id: 'content-1',
        packageId: 'package-1',
        pickTaskId: 'pick-task-1',
        outboundOrderLineId: 'line-1',
        sourceBalanceId: 'balance-1',
        sourceDimensionId: 'dimension-1',
        skuId: 'sku-1',
        skuCode: 'SKU-1',
        uomId: 'uom-1',
        uomCode: 'EA',
        quantity: 10,
        inventoryStatusCode: 'AVAILABLE',
        lotNumber: 'LOT-1',
        serialNumber: null,
        expiryDate: null,
        createdAt: '2026-06-24T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

function makeSession(): PackSession {
  return {
    id: 'session-1',
    sessionNumber: 'PACK-S-001',
    pickTaskId: 'pick-task-1',
    mobileTaskId: 'mobile-task-1',
    outboundOrderId: 'outbound-1',
    warehouseProfileId: 'profile-1',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WT-01',
    ownerId: 'owner-1',
    ownerCode: 'OWN',
    status: 'CheckingPassed',
    checkRequired: true,
    checkResult: 'Passed',
    checkExceptionCaseId: null,
    startedAt: '2026-06-24T00:00:00.000Z',
    startedBy: 'user-1',
    checkedAt: '2026-06-24T00:05:00.000Z',
    checkedBy: 'user-1',
  };
}

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    startSession: { mutate: vi.fn(), isPending: false, error: null },
    recordCheck: { mutate: vi.fn(), isPending: false, error: null },
    createPackage: { mutate: vi.fn(), isPending: false, error: null },
    closePackage: { mutate: vi.fn(), isPending: false, error: null },
    readyForStaging: { mutate: vi.fn(), isPending: false, error: null },
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/packing']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

type MockMutationOptions<TData> = {
  onSuccess?: (data: TData) => void;
};

describe('Packing list/detail pages', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(usePackages).mockReturnValue({
      data: { items: [makePackage()], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof usePackages>);
    vi.mocked(usePackage).mockReturnValue({
      data: makePackage(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof usePackage>);
    vi.mocked(usePackingMutations).mockReturnValue(
      mutationState() as unknown as ReturnType<typeof usePackingMutations>,
    );
  });

  it('renders packages as detail links on the root list without action controls', () => {
    renderWithRouter(<PackingPage />);

    const link = screen.getByRole('link', { name: /PKG-001/i });
    expect(link.getAttribute('href')).toBe('/packing/package-1');
    expect(screen.queryByText('Thao tác đóng gói')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Close package$/i })).toBeNull();
    expect(usePackages).toHaveBeenCalledWith({
      warehouseId: undefined,
      ownerId: undefined,
      pickTaskId: undefined,
      outboundOrderId: undefined,
      status: undefined,
    });
  });

  it('starts a session and creates a package from the create route', () => {
    const mutations = mutationState({
      startSession: {
        mutate: vi.fn((_payload: unknown, options?: MockMutationOptions<PackSession>) => {
          options?.onSuccess?.(makeSession());
        }),
        isPending: false,
        error: null,
      },
      createPackage: { mutate: vi.fn(), isPending: false, error: null },
    });
    vi.mocked(usePackingMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof usePackingMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/packing/new" element={<PackingCreatePage />} />
      </Routes>,
      ['/packing/new'],
    );

    fireEvent.change(screen.getByLabelText('ID tác vụ lấy hàng'), { target: { value: 'pick-task-1' } });
    fireEvent.change(screen.getByLabelText('ID tác vụ mobile'), {
      target: { value: 'mobile-task-1' },
    });
    fireEvent.change(screen.getByLabelText('ID hồ sơ kho'), {
      target: { value: 'profile-1' },
    });
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng'), { target: { value: 'scan:1' } });
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), {
      target: { value: 'session-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Bắt đầu phiên$/i }));

    expect(mutations.startSession.mutate).toHaveBeenCalledWith(
      {
        pickTaskId: 'pick-task-1',
        mobileTaskId: 'mobile-task-1',
        warehouseProfileId: 'profile-1',
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: undefined,
        evidenceRefs: ['scan:1'],
        idempotencyKey: 'session-1',
      },
      expect.any(Object),
    );

    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'create-1' } });
    fireEvent.change(screen.getByLabelText('Số lượng quan sát'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Khối lượng'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tạo kiện hàng$/i }));

    expect(mutations.createPackage.mutate).toHaveBeenCalledWith(
      {
        packSessionId: 'session-1',
        cartonType: 'CARTON-STD',
        weight: 10,
        length: undefined,
        width: undefined,
        height: undefined,
        contents: [{ pickTaskId: 'pick-task-1', quantity: 10 }],
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: undefined,
        evidenceRefs: ['scan:1'],
        idempotencyKey: 'create-1',
      },
      expect.any(Object),
    );
  });

  it('submits ready-for-staging through the action detail route and shows label gate result', () => {
    const result: ReadyForStagingResult = {
      package: makePackage({ status: 'ReadyForStaging' }),
      labelValidation: {
        allowed: true,
        blocked: false,
        decision: 'Allowed',
        requiredLabelType: 'PACKAGE',
        policyMode: 'Block',
        overrideAllowed: false,
        overrideAccepted: false,
        reason: 'matched label print job',
        matchedPrintJobId: 'print-job-1',
        matchedPrintJobCode: 'PJ-001',
        validationDetails: {},
      },
      isDuplicate: false,
    };
    const mutations = mutationState({
      readyForStaging: {
        mutate: vi.fn((_payload: unknown, options?: MockMutationOptions<ReadyForStagingResult>) => {
          options?.onSuccess?.(result);
        }),
        isPending: false,
        error: null,
      },
    });
    vi.mocked(usePackingMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof usePackingMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/packing/:id/:action" element={<PackingDetailPage />} />
      </Routes>,
      ['/packing/package-1/ready-for-staging'],
    );

    expect(usePackage).toHaveBeenCalledWith('package-1');
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng'), { target: { value: 'label:1' } });
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'ready-1' } });
    fireEvent.change(screen.getByLabelText('Loại nhãn'), { target: { value: 'PACKAGE' } });
    fireEvent.click(screen.getByRole('button', { name: /^Sẵn sàng staging$/i }));

    expect(mutations.readyForStaging.mutate).toHaveBeenCalledWith(
      {
        id: 'package-1',
        payload: {
          attemptOverride: false,
          labelType: 'PACKAGE',
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['label:1'],
          idempotencyKey: 'ready-1',
        },
      },
      expect.any(Object),
    );
    expect(screen.getByText('Đã ghi nhận sẵn sàng staging')).toBeTruthy();
  });

  it('shows permission denied state without action controls when detail read is forbidden', () => {
    vi.mocked(usePackage).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No package read' }),
    } as unknown as ReturnType<typeof usePackage>);

    renderWithRouter(
      <Routes>
        <Route path="/packing/:id" element={<PackingDetailPage />} />
      </Routes>,
      ['/packing/package-1'],
    );

    expect(screen.getByRole('heading', { name: 'Từ chối quyền truy cập' })).toBeTruthy();
    expect(screen.queryByText('Thao tác đóng gói')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Đóng kiện$/i })).toBeNull();
  });

  it('shows blocked detail state without mutation controls', () => {
    vi.mocked(usePackage).mockReturnValue({
      data: makePackage({ status: 'Blocked' }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof usePackage>);

    renderWithRouter(
      <Routes>
        <Route path="/packing/:id" element={<PackingDetailPage />} />
      </Routes>,
      ['/packing/package-1'],
    );

    expect(screen.getByRole('heading', { name: 'Kiện hàng bị chặn' })).toBeTruthy();
    expect(screen.queryByText('Thao tác đóng gói')).toBeNull();
  });

  it('keeps ready-for-staging package read-only on detail page', () => {
    vi.mocked(usePackage).mockReturnValue({
      data: makePackage({ status: 'ReadyForStaging' }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof usePackage>);

    renderWithRouter(
      <Routes>
        <Route path="/packing/:id" element={<PackingDetailPage />} />
      </Routes>,
      ['/packing/package-1'],
    );

    expect(screen.getByText('Kiện hàng chỉ đọc')).toBeTruthy();
    const readyButton = screen.getByRole('button', { name: /^Sẵn sàng staging$/i });
    expect((readyButton as HTMLButtonElement).disabled).toBe(true);
  });
});
