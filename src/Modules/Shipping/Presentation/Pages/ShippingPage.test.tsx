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
    expect(screen.queryByText('Shipping actions')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Assign dock$/i })).toBeNull();
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

    fireEvent.change(screen.getByLabelText('Package id'), { target: { value: 'package-1' } });
    fireEvent.change(screen.getByLabelText('Shipment reference'), {
      target: { value: 'SHIP-001' },
    });
    fireEvent.change(screen.getByLabelText('Staging lane code'), { target: { value: 'STAGE-A' } });
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'scan:stage' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'stage-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Stage package$/i }));

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

    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'dock:scan' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'dock-1' } });
    fireEvent.change(screen.getByLabelText('Dock door code'), { target: { value: 'DOCK-01' } });
    fireEvent.click(screen.getByRole('button', { name: /^Assign dock$/i }));

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

    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'truck-1' } });
    fireEvent.change(screen.getByLabelText('Truck reference'), { target: { value: 'TRUCK-001' } });
    fireEvent.change(screen.getByLabelText('Vehicle number'), { target: { value: '51C-001' } });
    fireEvent.click(screen.getByRole('button', { name: /^Assign truck$/i }));

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

    expect(screen.getByRole('heading', { name: 'Permission denied' })).toBeTruthy();
    expect(screen.queryByText('Shipping actions')).toBeNull();
  });

  it('keeps ReadyForLoading staging read-only and does not expose loading scan', () => {
    vi.mocked(useShippingStaging).mockReturnValue({
      data: makeStaging({ status: 'ReadyForLoading' }),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useShippingStaging>);

    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1'],
    );

    expect(screen.getByText('Ready for loading')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Load/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: /^Assign dock$/i }).getAttribute('disabled'),
    ).not.toBeNull();
  });

  it('does not open a V1-25 loading action route from the V1-24 shell', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/shipping/:id/:action" element={<ShippingDetailPage />} />
        <Route path="/shipping/:id" element={<ShippingDetailPage />} />
      </Routes>,
      ['/shipping/staging-1/loading'],
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'STG-001' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Load/i })).toBeNull();
  });
});
