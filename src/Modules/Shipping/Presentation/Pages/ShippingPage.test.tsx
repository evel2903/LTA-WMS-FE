// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import { useShippingMutations } from '@modules/Shipping/Application/Commands/UseShippingMutations';
import {
  useShippingStaging,
  useShippingStagingList,
} from '@modules/Shipping/Application/Queries/UseShipping';
import type { ShipmentPackageStaging } from '@modules/Shipping/Domain/Types/Shipping';
import {
  ShippingCreatePage,
  ShippingDetailPage,
} from '@modules/Shipping/Presentation/Pages/ShippingDetailPage';
import { ShippingPage } from '@modules/Shipping/Presentation/Pages/ShippingPage';

vi.mock('@modules/Shipping/Application/Commands/UseShippingMutations', () => ({
  useShippingMutations: vi.fn(),
}));

vi.mock('@modules/Shipping/Application/Queries/UseShipping', () => ({
  useShippingStaging: vi.fn(),
  useShippingStagingList: vi.fn(),
}));

function makeStaging(overrides: Partial<ShipmentPackageStaging> = {}): ShipmentPackageStaging {
  return {
    id: 'staging-1',
    stagingCode: 'STG-001',
    packageId: 'package-1',
    packageCode: 'PKG-001',
    outboundOrderId: 'outbound-1',
    warehouseProfileId: 'profile-1',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-1',
    ownerId: 'owner-1',
    ownerCode: 'OWN-1',
    status: 'Staged',
    inventoryStatusCode: 'STAGED',
    shipmentReference: 'SHIP-001',
    stagingLaneCode: 'STAGE-A',
    stagingLocationId: null,
    stagingLocationCode: null,
    dockDoorId: null,
    dockDoorCode: null,
    truckReference: null,
    vehicleNumber: null,
    driverName: null,
    carrierId: null,
    carrierCode: null,
    coreFlowInstanceId: 'core-flow-1',
    stagedAt: '2026-06-24T00:00:00.000Z',
    stagedBy: 'shipper-1',
    dockAssignedAt: null,
    dockAssignedBy: null,
    truckAssignedAt: null,
    truckAssignedBy: null,
    loadReference: null,
    loadedAt: null,
    loadedBy: null,
    shipmentConfirmedAt: null,
    shipmentConfirmedBy: null,
    gateOutReference: null,
    gateOutAt: null,
    gateOutBy: null,
    goodsIssueTrigger: null,
    goodsIssueTriggerStatus: null,
    goodsIssueTriggeredAt: null,
    goodsIssueTriggeredBy: null,
    goodsIssueStatus: null,
    goodsIssuePostedAt: null,
    goodsIssuePostedBy: null,
    goodsIssueInventoryTransactionId: null,
    goodsIssueInventoryMovementId: null,
    loadingOutboxMessageId: null,
    shipmentConfirmOutboxMessageId: null,
    gateOutOutboxMessageId: null,
    goodsIssueTriggerOutboxMessageId: null,
    goodsIssueOutboxMessageId: null,
    shipmentClosedOutboxMessageId: null,
    shipmentClosedAt: null,
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:00:00.000Z',
    ...overrides,
  };
}

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    stagePackage: { mutate: vi.fn(), isPending: false, error: null },
    assignDock: { mutate: vi.fn(), isPending: false, error: null },
    assignTruck: { mutate: vi.fn(), isPending: false, error: null },
    scanLoading: { mutate: vi.fn(), isPending: false, error: null },
    confirmShipment: { mutate: vi.fn(), isPending: false, error: null },
    recordGateOut: { mutate: vi.fn(), isPending: false, error: null },
    evaluateGoodsIssueTrigger: { mutate: vi.fn(), isPending: false, error: null },
    postGoodsIssue: { mutate: vi.fn(), isPending: false, error: null },
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/shipping']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

type MockMutationOptions<TData> = {
  onSuccess?: (data: TData) => void;
};

describe('Shipping list/detail pages', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(useShippingStagingList).mockReturnValue({
      data: { items: [makeStaging()], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStagingList>);
    vi.mocked(useShippingStaging).mockReturnValue({
      data: makeStaging(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStaging>);
    vi.mocked(useShippingMutations).mockReturnValue(
      mutationState() as unknown as ReturnType<typeof useShippingMutations>,
    );
  });

  it('renders shipping staging as detail links on the root list without action controls', () => {
    renderWithRouter(<ShippingPage />);

    const link = screen.getByRole('link', { name: /STG-001/i });
    expect(link.getAttribute('href')).toBe('/shipping/staging-1');
    expect(screen.queryByText('Thao tác giao hàng')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Gán dock$/i })).toBeNull();
    expect(useShippingStagingList).toHaveBeenCalledWith({
      warehouseId: undefined,
      ownerId: undefined,
      packageId: undefined,
      outboundOrderId: undefined,
      status: undefined,
    });
  });

  it('stages a package from the create route', () => {
    const mutations = mutationState({
      stagePackage: {
        mutate: vi.fn(
          (_payload: unknown, options?: MockMutationOptions<ShipmentPackageStaging>) => {
            options?.onSuccess?.(makeStaging());
          },
        ),
        isPending: false,
        error: null,
      },
    });
    vi.mocked(useShippingMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useShippingMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/shipping/new" element={<ShippingCreatePage />} />
        <Route path="/shipping/:id" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/new'],
    );

    fireEvent.change(screen.getByLabelText('ID kiện hàng'), { target: { value: 'package-1' } });
    fireEvent.change(screen.getByLabelText('Tham chiếu lô giao hàng'), {
      target: { value: 'SHIP-001' },
    });
    fireEvent.change(screen.getByLabelText('Mã làn staging'), { target: { value: 'STAGE-A' } });
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng'), { target: { value: 'scan:stage' } });
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'stage-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Đưa kiện vào staging$/i }));

    expect(mutations.stagePackage.mutate).toHaveBeenCalledWith(
      {
        packageId: 'package-1',
        shipmentReference: 'SHIP-001',
        stagingLaneCode: 'STAGE-A',
        stagingLocationId: undefined,
        stagingLocationCode: undefined,
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: undefined,
        evidenceRefs: ['scan:stage'],
        idempotencyKey: 'stage-1',
      },
      expect.any(Object),
    );
  });

  it('submits dock and truck milestones from the detail route', () => {
    const mutations = mutationState({
      assignDock: {
        mutate: vi.fn(
          (_payload: unknown, options?: MockMutationOptions<ShipmentPackageStaging>) => {
            options?.onSuccess?.(makeStaging({ status: 'DockAssigned', dockDoorCode: 'DOCK-01' }));
          },
        ),
        isPending: false,
        error: null,
      },
      assignTruck: {
        mutate: vi.fn(
          (_payload: unknown, options?: MockMutationOptions<ShipmentPackageStaging>) => {
            options?.onSuccess?.(
              makeStaging({ status: 'ReadyForLoading', truckReference: 'TRUCK-001' }),
            );
          },
        ),
        isPending: false,
        error: null,
      },
    });
    vi.mocked(useShippingMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useShippingMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id/:action" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1/dock'],
    );

    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng'), { target: { value: 'dock:scan' } });
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'dock-1' } });
    fireEvent.change(screen.getByLabelText('Mã cửa dock'), { target: { value: 'DOCK-01' } });
    fireEvent.click(screen.getByRole('button', { name: /^Gán dock$/i }));

    expect(mutations.assignDock.mutate).toHaveBeenCalledWith(
      {
        id: 'staging-1',
        payload: {
          dockDoorId: undefined,
          dockDoorCode: 'DOCK-01',
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['dock:scan'],
          idempotencyKey: 'dock-1',
        },
      },
      expect.any(Object),
    );

    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'truck-1' } });
    fireEvent.change(screen.getByLabelText('Tham chiếu xe tải'), { target: { value: 'TRUCK-001' } });
    fireEvent.change(screen.getByLabelText('Biển số xe'), { target: { value: '51C-001' } });
    fireEvent.click(screen.getByRole('button', { name: /^Gán xe tải$/i }));

    expect(mutations.assignTruck.mutate).toHaveBeenCalledWith(
      {
        id: 'staging-1',
        payload: {
          truckReference: 'TRUCK-001',
          vehicleNumber: '51C-001',
          driverName: undefined,
          carrierId: undefined,
          carrierCode: undefined,
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['dock:scan'],
          idempotencyKey: 'truck-1',
        },
      },
      expect.any(Object),
    );
  });

  it('shows permission denied state without action controls when detail read is forbidden', () => {
    vi.mocked(useShippingStaging).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No shipment read' }),
    } as unknown as ReturnType<typeof useShippingStaging>);

    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1'],
    );

    expect(screen.getByRole('heading', { name: 'Từ chối quyền truy cập' })).toBeTruthy();
    expect(screen.queryByText('Thao tác giao hàng')).toBeNull();
  });

  it('opens loading action for ReadyForLoading staging without putting actions on the list', () => {
    vi.mocked(useShippingStaging).mockReturnValue({
      data: makeStaging({
        status: 'ReadyForLoading',
        dockDoorCode: 'DOCK-01',
        truckReference: 'TRUCK-001',
      }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStaging>);

    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1'],
    );

    expect(screen.getByRole('link', { name: /Mở chất hàng/i }).getAttribute('href')).toBe(
      '/shipping/staging-1/loading',
    );
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), {
      target: { value: 'dock-after-ready' },
    });
    expect(
      screen.getByRole('button', { name: /^Gán dock$/i }).getAttribute('disabled'),
    ).not.toBeNull();
  });

  it('keeps the loading action available for Loaded staging and blocks dock regression', () => {
    vi.mocked(useShippingStaging).mockReturnValue({
      data: makeStaging({
        status: 'Loaded',
        dockDoorCode: 'DOCK-01',
        truckReference: 'TRUCK-001',
        loadedAt: '2026-06-24T01:00:00.000Z',
      }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStaging>);

    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1'],
    );

    expect(screen.getByRole('link', { name: /Mở chất hàng/i }).getAttribute('href')).toBe(
      '/shipping/staging-1/loading',
    );
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), {
      target: { value: 'dock-after-loaded' },
    });
    expect(
      screen.getByRole('button', { name: /^Gán dock$/i }).getAttribute('disabled'),
    ).not.toBeNull();
  });

  it('submits loading scan and shipment confirmation from the loading action route', async () => {
    const mutations = mutationState({
      scanLoading: {
        mutate: vi.fn(
          (_payload: unknown, options?: MockMutationOptions<ShipmentPackageStaging>) => {
            options?.onSuccess?.(
              makeStaging({
                status: 'Loaded',
                loadReference: 'LOAD-001',
                loadedAt: '2026-06-24T01:00:00.000Z',
              }),
            );
          },
        ),
        isPending: false,
        error: null,
      },
      confirmShipment: {
        mutate: vi.fn(
          (_payload: unknown, options?: MockMutationOptions<ShipmentPackageStaging>) => {
            options?.onSuccess?.(
              makeStaging({
                status: 'ShipmentConfirmed',
                shipmentConfirmedAt: '2026-06-24T01:05:00.000Z',
              }),
            );
          },
        ),
        isPending: false,
        error: null,
      },
    });
    vi.mocked(useShippingMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useShippingMutations>,
    );
    vi.mocked(useShippingStaging).mockReturnValue({
      data: makeStaging({
        status: 'ReadyForLoading',
        dockDoorCode: 'DOCK-01',
        truckReference: 'TRUCK-001',
      }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStaging>);

    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id/:action" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1/loading'],
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'STG-001' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng'), { target: { value: 'loading:scan' } });
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'loading-1' } });
    fireEvent.change(screen.getByLabelText('Tham chiếu chất hàng'), { target: { value: 'LOAD-001' } });
    fireEvent.click(screen.getByRole('button', { name: /^Quét chất hàng$/i }));

    expect(mutations.scanLoading.mutate).toHaveBeenCalledWith(
      {
        id: 'staging-1',
        payload: {
          scannedPackageId: 'package-1',
          scannedPackageCode: 'PKG-001',
          shipmentReference: 'SHIP-001',
          loadReference: 'LOAD-001',
          truckReference: 'TRUCK-001',
          vehicleNumber: undefined,
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['loading:scan'],
          idempotencyKey: 'loading-1',
        },
      },
      expect.any(Object),
    );

    vi.mocked(useShippingStaging).mockReturnValue({
      data: makeStaging({
        status: 'Loaded',
        dockDoorCode: 'DOCK-01',
        truckReference: 'TRUCK-001',
        loadReference: 'LOAD-001',
        loadedAt: '2026-06-24T01:00:00.000Z',
      }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStaging>);
    cleanup();
    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id/:action" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1/loading'],
    );
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng'), {
      target: { value: 'confirm:shipment' },
    });
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'confirm-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Xác nhận lô giao hàng$/i }));

    expect(mutations.confirmShipment.mutate).toHaveBeenCalledWith(
      {
        id: 'staging-1',
        payload: {
          shipmentReference: 'SHIP-001',
          requireFullLoad: true,
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['confirm:shipment'],
          idempotencyKey: 'confirm-1',
        },
      },
      expect.any(Object),
    );
    expect(screen.queryByRole('button', { name: /Ghi nhận cổng ra/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ghi nhận xuất kho/i })).toBeNull();
  });

  it('submits gate-out from the dedicated action route', () => {
    const mutations = mutationState({
      recordGateOut: {
        mutate: vi.fn(
          (_payload: unknown, options?: MockMutationOptions<ShipmentPackageStaging>) => {
            options?.onSuccess?.(
              makeStaging({
                status: 'GateOutRecorded',
                gateOutReference: 'GATE-OUT-001',
                gateOutAt: '2026-06-24T02:00:00.000Z',
                goodsIssueTrigger: 'at_gate_out',
                goodsIssueTriggerStatus: 'Ready',
              }),
            );
          },
        ),
        isPending: false,
        error: null,
      },
    });
    vi.mocked(useShippingMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useShippingMutations>,
    );
    vi.mocked(useShippingStaging).mockReturnValue({
      data: makeStaging({
        status: 'ShipmentConfirmed',
        truckReference: 'TRUCK-001',
        vehicleNumber: '51C-001',
        shipmentConfirmedAt: '2026-06-24T01:05:00.000Z',
      }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStaging>);

    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id/:action" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1/gate-out'],
    );

    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng'), { target: { value: 'gate:out' } });
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'gate-out-1' } });
    fireEvent.change(screen.getByLabelText('Tham chiếu cổng ra'), {
      target: { value: 'GATE-OUT-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Ghi nhận cổng ra$/i }));

    expect(mutations.recordGateOut.mutate).toHaveBeenCalledWith(
      {
        id: 'staging-1',
        payload: {
          gateOutReference: 'GATE-OUT-001',
          truckReference: 'TRUCK-001',
          vehicleNumber: '51C-001',
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['gate:out'],
          idempotencyKey: 'gate-out-1',
        },
      },
      expect.any(Object),
    );
  });

  it('posts Goods Issue from the dedicated action route after trigger is ready', () => {
    const mutations = mutationState({
      postGoodsIssue: {
        mutate: vi.fn(
          (_payload: unknown, options?: MockMutationOptions<ShipmentPackageStaging>) => {
            options?.onSuccess?.(
              makeStaging({
                status: 'GateOutRecorded',
                goodsIssueTrigger: 'at_gate_out',
                goodsIssueTriggerStatus: 'Ready',
                goodsIssueStatus: 'Posted',
                goodsIssuePostedAt: '2026-06-24T02:05:00.000Z',
                goodsIssueInventoryTransactionId: 'gi-txn-1',
                goodsIssueOutboxMessageId: 'outbox-gi-1',
                shipmentClosedOutboxMessageId: 'outbox-close-1',
              }),
            );
          },
        ),
        isPending: false,
        error: null,
      },
    });
    vi.mocked(useShippingMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useShippingMutations>,
    );
    vi.mocked(useShippingStaging).mockReturnValue({
      data: makeStaging({
        status: 'GateOutRecorded',
        goodsIssueTrigger: 'at_gate_out',
        goodsIssueTriggerStatus: 'Ready',
        goodsIssueStatus: null,
      }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStaging>);

    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id/:action" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1/goods-issue'],
    );

    expect(screen.getByRole('heading', { name: 'Ghi nhận xuất kho' })).toBeTruthy();
    expect(screen.getByText('Sự kiện hạ nguồn đang chờ')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tham chiếu bằng chứng'), { target: { value: 'gi:post' } });
    fireEvent.change(screen.getByLabelText('Khóa idempotency'), { target: { value: 'gi-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ghi nhận xuất kho$/i }));

    expect(mutations.postGoodsIssue.mutate).toHaveBeenCalledWith(
      {
        id: 'staging-1',
        payload: {
          reasonCode: 'RC-V1-GOODS-ISSUE-CORRECTION',
          reasonNote: undefined,
          evidenceRefs: ['gi:post'],
          idempotencyKey: 'gi-1',
        },
      },
      expect.any(Object),
    );
  });
});
