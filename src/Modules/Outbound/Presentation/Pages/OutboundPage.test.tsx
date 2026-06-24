// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import { useOutboundMutations } from '@modules/Outbound/Application/Commands/UseOutboundMutations';
import {
  useOutboundAllocations,
  useOutboundOrder,
  useOutboundOrders,
  useOutboundPickReleases,
} from '@modules/Outbound/Application/Queries/UseOutboundOrders';
import type { OutboundOrder } from '@modules/Outbound/Domain/Types/OutboundOrder';
import {
  OutboundCreatePage,
  OutboundDetailPage,
} from '@modules/Outbound/Presentation/Pages/OutboundDetailPage';
import { OutboundPage } from '@modules/Outbound/Presentation/Pages/OutboundPage';

vi.mock('@modules/Outbound/Application/Commands/UseOutboundMutations', () => ({
  useOutboundMutations: vi.fn(),
}));

vi.mock('@modules/Outbound/Application/Queries/UseOutboundOrders', () => ({
  useOutboundOrders: vi.fn(),
  useOutboundOrder: vi.fn(),
  useOutboundAllocations: vi.fn(),
  useOutboundPickReleases: vi.fn(),
}));

function makeOrder(overrides: Partial<OutboundOrder> = {}): OutboundOrder {
  return {
    id: 'outbound-1',
    orderNumber: 'OB-001',
    sourceSystem: 'OMS',
    sourceReference: 'SO-001',
    businessReference: 'OMS:SO-001',
    customerId: 'customer-1',
    customerSourceSystem: 'OMS',
    customerExternalReference: 'EXT-CUST-1',
    customerCode: 'CUST-1',
    shipToReference: 'STORE-1',
    ownerId: 'owner-1',
    ownerCode: 'OWN',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-1',
    priority: null,
    cutoffAt: null,
    documentStatus: 'Validated',
    validationErrors: [],
    coreFlowInstanceId: 'core-flow-1',
    outboxMessageId: 'outbox-1',
    reasonCode: null,
    reasonCodeId: null,
    reasonNote: null,
    evidenceRefs: [],
    isDuplicate: false,
    lines: [
      {
        id: 'line-1',
        lineNumber: 1,
        skuId: 'sku-1',
        skuCode: 'SKU-1',
        uomId: 'uom-1',
        uomCode: 'EA',
        orderedQuantity: 12,
        externalLineReference: '1',
        validationErrors: [],
      },
    ],
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-06-24T00:00:00.000Z',
    ...overrides,
  };
}

function mutationState() {
  return {
    importOrder: { mutate: vi.fn(), isPending: false, error: null },
    validateOrder: { mutate: vi.fn(), isPending: false, error: null },
    holdOrder: { mutate: vi.fn(), isPending: false, error: null },
    rejectOrder: { mutate: vi.fn(), isPending: false, error: null },
    cancelOrder: { mutate: vi.fn(), isPending: false, error: null },
    allocateOrder: { mutate: vi.fn(), isPending: false, error: null },
    releaseOrder: { mutate: vi.fn(), isPending: false, error: null },
  };
}

function renderWithRouter(ui: React.ReactElement, initialEntries = ['/outbound']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('Outbound list/detail pages', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.mocked(useOutboundOrders).mockReturnValue({
      data: { items: [makeOrder()], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOutboundOrders>);
    vi.mocked(useOutboundOrder).mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOutboundOrder>);
    vi.mocked(useOutboundAllocations).mockReturnValue({
      data: {
        items: [
          {
            id: 'allocation-1',
            allocationNumber: 'AL-001',
            outboundOrderId: 'outbound-1',
            warehouseId: 'warehouse-1',
            warehouseCode: 'WH-1',
            ownerId: 'owner-1',
            ownerCode: 'OWN',
            policy: 'PartialBackorder',
            status: 'PartiallyAllocated',
            totalOrderedQuantity: 12,
            totalAllocatedQuantity: 8,
            totalBackorderedQuantity: 4,
            shortageReason: 'Insufficient eligible Available inventory in order warehouse',
            outboxMessageId: 'outbox-allocation-1',
            reasonCode: 'RC-V1-DISCREPANCY',
            reasonCodeId: 'reason-1',
            reasonNote: 'Thiếu tồn',
            evidenceRefs: ['shortage:1'],
            isDuplicate: false,
            lines: [],
            createdAt: '2026-06-24T00:00:00.000Z',
            updatedAt: '2026-06-24T00:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOutboundAllocations>);
    vi.mocked(useOutboundPickReleases).mockReturnValue({
      data: {
        items: [
          {
            id: 'release-1',
            releaseNumber: 'REL-001',
            outboundOrderId: 'outbound-1',
            allocationId: 'allocation-1',
            warehouseId: 'warehouse-1',
            warehouseCode: 'WH-1',
            ownerId: 'owner-1',
            ownerCode: 'OWN',
            releaseMode: 'Batch',
            batchSize: 50,
            status: 'Cancelled',
            blockReason: null,
            totalTaskCount: 1,
            totalReleasedQuantity: 8,
            outboxMessageId: 'outbox-release-1',
            reasonCode: null,
            reasonCodeId: null,
            reasonNote: null,
            evidenceRefs: [],
            isDuplicate: false,
            tasks: [
              {
                id: 'pick-task-1',
                pickReleaseId: 'release-1',
                outboundOrderId: 'outbound-1',
                allocationId: 'allocation-1',
                allocationLineId: 'allocation-line-1',
                outboundOrderLineId: 'line-1',
                taskNumber: 'PT-001',
                status: 'Released',
                sequence: 1,
                batchNumber: 'REL-001-B1',
                sourceBalanceId: 'balance-1',
                sourceDimensionId: 'dimension-1',
                sourceLocationId: 'location-1',
                targetLocationId: null,
                targetReference: 'STORE-1',
                skuId: 'sku-1',
                skuCode: 'SKU-1',
                uomId: 'uom-1',
                uomCode: 'EA',
                quantity: 8,
                inventoryStatusCode: 'AVAILABLE',
                lotNumber: 'LOT-1',
                serialNumber: null,
                expiryDate: null,
                createdAt: '2026-06-24T00:00:00.000Z',
              },
            ],
            createdAt: '2026-06-24T00:00:00.000Z',
            updatedAt: '2026-06-24T00:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOutboundPickReleases>);
    vi.mocked(useOutboundMutations).mockReturnValue(
      mutationState() as unknown as ReturnType<typeof useOutboundMutations>,
    );
  });

  it('renders outbound orders as detail links on the root list without governed actions', () => {
    renderWithRouter(<OutboundPage />);

    const link = screen.getByRole('link', { name: /OB-001/i });
    expect(link.getAttribute('href')).toBe('/outbound/outbound-1');
    expect(screen.queryByText('Governed actions')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Hold$/i })).toBeNull();
    expect(useOutboundOrders).toHaveBeenCalledWith({
      warehouseId: undefined,
      ownerId: undefined,
      sourceReference: undefined,
      documentStatus: undefined,
    });
  });

  it('submits outbound import through the create route', () => {
    const mutations = mutationState();
    vi.mocked(useOutboundMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useOutboundMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/outbound/new" element={<OutboundCreatePage />} />
      </Routes>,
      ['/outbound/new'],
    );

    fireEvent.change(screen.getByLabelText('Source reference'), { target: { value: 'SO-002' } });
    fireEvent.change(screen.getByLabelText('Customer reference'), {
      target: { value: 'CUST-1' },
    });
    fireEvent.change(screen.getByLabelText('Ship-to reference'), { target: { value: 'STORE-1' } });
    fireEvent.change(screen.getByLabelText('Owner id'), { target: { value: 'owner-1' } });
    fireEvent.change(screen.getByLabelText('Warehouse id'), {
      target: { value: 'warehouse-1' },
    });
    fireEvent.change(screen.getByLabelText('SKU id'), { target: { value: 'sku-1' } });
    fireEvent.change(screen.getByLabelText('UOM id'), { target: { value: 'uom-1' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'case:2' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), {
      target: { value: 'outbound-import-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Import order$/i }));

    expect(mutations.importOrder.mutate).toHaveBeenCalledWith(
      {
        sourceSystem: 'OMS',
        sourceReference: 'SO-002',
        customerSourceSystem: 'OMS',
        customerExternalReference: 'CUST-1',
        shipToReference: 'STORE-1',
        ownerId: 'owner-1',
        warehouseId: 'warehouse-1',
        reasonCode: 'RC-V1-DISCREPANCY',
        reasonNote: undefined,
        evidenceRefs: ['case:2'],
        idempotencyKey: 'outbound-import-1',
        lines: [
          {
            lineNumber: 1,
            skuId: 'sku-1',
            uomId: 'uom-1',
            orderedQuantity: 12,
            externalLineReference: '1',
          },
        ],
      },
      expect.any(Object),
    );
  });

  it('submits governed hold action from the action detail route', () => {
    const mutations = mutationState();
    vi.mocked(useOutboundMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useOutboundMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/outbound/:id/:action" element={<OutboundDetailPage />} />
      </Routes>,
      ['/outbound/outbound-1/hold'],
    );

    expect(useOutboundOrder).toHaveBeenCalledWith('outbound-1');
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'case:1' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), { target: { value: 'hold-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Hold$/i }));

    expect(mutations.holdOrder.mutate).toHaveBeenCalledWith(
      {
        id: 'outbound-1',
        payload: {
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['case:1'],
          idempotencyKey: 'hold-1',
        },
      },
      expect.any(Object),
    );
  });

  it('submits allocation action from the outbound action route', () => {
    const mutations = mutationState();
    vi.mocked(useOutboundMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useOutboundMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/outbound/:id/:action" element={<OutboundDetailPage />} />
      </Routes>,
      ['/outbound/outbound-1/allocate'],
    );

    expect(useOutboundAllocations).toHaveBeenCalledWith('outbound-1');
    expect(screen.getByText('AL-001')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'shortage:1' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), {
      target: { value: 'allocate-1' },
    });
    fireEvent.change(screen.getByLabelText('Allocation policy'), {
      target: { value: 'PartialBackorder' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Allocate$/i }));

    expect(mutations.allocateOrder.mutate).toHaveBeenCalledWith(
      {
        id: 'outbound-1',
        payload: {
          policy: 'PartialBackorder',
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['shortage:1'],
          idempotencyKey: 'allocate-1',
        },
      },
      expect.any(Object),
    );
  });

  it('submits release action from the outbound action route', () => {
    const mutations = mutationState();
    vi.mocked(useOutboundMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useOutboundMutations>,
    );

    renderWithRouter(
      <Routes>
        <Route path="/outbound/:id/:action" element={<OutboundDetailPage />} />
      </Routes>,
      ['/outbound/outbound-1/release'],
    );

    expect(useOutboundPickReleases).toHaveBeenCalledWith('outbound-1');
    expect(screen.getByText('REL-001')).toBeTruthy();
    expect(screen.getByText('PT-001')).toBeTruthy();
    expect(screen.getByText('Seq 1')).toBeTruthy();
    expect(screen.getByText('Task status Released')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Evidence refs'), { target: { value: 'cutoff:1' } });
    fireEvent.change(screen.getByLabelText('Idempotency key'), {
      target: { value: 'release-1' },
    });
    fireEvent.change(screen.getByLabelText('Release mode'), { target: { value: 'Batch' } });
    fireEvent.change(screen.getByLabelText('Batch size'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /^Release$/i }));

    expect(mutations.releaseOrder.mutate).toHaveBeenCalledWith(
      {
        id: 'outbound-1',
        payload: {
          releaseMode: 'Batch',
          batchSize: 25,
          reasonCode: 'RC-V1-DISCREPANCY',
          reasonNote: undefined,
          evidenceRefs: ['cutoff:1'],
          idempotencyKey: 'release-1',
        },
      },
      expect.any(Object),
    );
  });

  it('disables release action when an active pick release already exists', () => {
    const mutations = mutationState();
    vi.mocked(useOutboundMutations).mockReturnValue(
      mutations as unknown as ReturnType<typeof useOutboundMutations>,
    );
    vi.mocked(useOutboundPickReleases).mockReturnValue({
      data: {
        items: [
          {
            id: 'release-active',
            releaseNumber: 'REL-ACTIVE',
            outboundOrderId: 'outbound-1',
            allocationId: 'allocation-1',
            warehouseId: 'warehouse-1',
            warehouseCode: 'WH-1',
            ownerId: 'owner-1',
            ownerCode: 'OWN',
            releaseMode: 'Discrete',
            batchSize: 50,
            status: 'Released',
            blockReason: null,
            totalTaskCount: 1,
            totalReleasedQuantity: 8,
            outboxMessageId: 'outbox-release-active',
            reasonCode: null,
            reasonCodeId: null,
            reasonNote: null,
            evidenceRefs: [],
            isDuplicate: false,
            tasks: [],
            createdAt: '2026-06-24T00:00:00.000Z',
            updatedAt: '2026-06-24T00:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useOutboundPickReleases>);

    renderWithRouter(
      <Routes>
        <Route path="/outbound/:id/:action" element={<OutboundDetailPage />} />
      </Routes>,
      ['/outbound/outbound-1/release'],
    );

    fireEvent.change(screen.getByLabelText('Idempotency key'), {
      target: { value: 'release-again' },
    });
    const button = screen.getByRole('button', { name: /^Release$/i });
    expect(button).toHaveProperty('disabled', true);
    fireEvent.click(button);
    expect(mutations.releaseOrder.mutate).not.toHaveBeenCalled();
  });

  it('shows permission denied state without action controls when detail read is forbidden', () => {
    vi.mocked(useOutboundOrder).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No outbound read' }),
    } as unknown as ReturnType<typeof useOutboundOrder>);

    renderWithRouter(
      <Routes>
        <Route path="/outbound/:id" element={<OutboundDetailPage />} />
      </Routes>,
      ['/outbound/outbound-1'],
    );

    expect(screen.getByRole('heading', { name: 'Permission denied' })).toBeTruthy();
    expect(screen.queryByText('Governed actions')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Hold$/i })).toBeNull();
  });
});
