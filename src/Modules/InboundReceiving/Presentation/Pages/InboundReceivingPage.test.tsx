// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { ApiError } from '@shared/Services/Http/ApiError';

const h = vi.hoisted(() => ({
  useReceipts: vi.fn(),
  useActiveOwners: vi.fn(),
  useActiveWarehouses: vi.fn(),
  useUserEffectivePermissions: vi.fn(),
}));

vi.mock('@modules/InboundReceiving/Application/Queries/UseInboundReceivingState', () => ({
  useReceipts: h.useReceipts,
}));
vi.mock('@modules/MasterData/Application/Queries/CatalogQueries', () => ({
  useActiveOwners: h.useActiveOwners,
}));
vi.mock('@modules/MasterData/Application/Queries/UseSiteLocationTree', () => ({
  useActiveWarehouses: h.useActiveWarehouses,
}));
vi.mock('@modules/AccessControl/Application/Queries/UseAccessControlQueries', () => ({
  useUserEffectivePermissions: h.useUserEffectivePermissions,
}));

import { InboundReceivingPage } from '@modules/InboundReceiving/Presentation/Pages/InboundReceivingPage';

const receipt = {
  id: 'receipt-1',
  inboundPlanId: null,
  receiptNumber: 'RCPT-001',
  businessReference: 'MANUAL:001',
  ownerId: 'owner-1',
  ownerCode: 'OWN-1',
  warehouseId: 'warehouse-1',
  warehouseCode: 'WH-1',
  warehouseProfileId: null,
  supplierId: 'supplier-1',
  supplierCode: 'SUP-1',
  supplierName: 'Nhà cung cấp 1',
  status: 'Open',
  coreFlowInstanceId: null,
  createdAt: '2026-07-20T08:00:00.000Z',
  updatedAt: '2026-07-20T08:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <InboundReceivingPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setupLookupMocks() {
  h.useActiveOwners.mockReturnValue({ data: { items: [] }, isLoading: false, isError: false });
  h.useActiveWarehouses.mockReturnValue({ data: { items: [] }, isLoading: false, isError: false });
  h.useUserEffectivePermissions.mockReturnValue({ data: { permissions: [] }, isLoading: false });
}

describe('InboundReceivingPage', () => {
  it('renders supplier and paginates the server-backed list', async () => {
    h.useReceipts.mockReturnValue({
      data: { items: [receipt], page: 1, pageSize: 50, totalItems: 51, totalPages: 2 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    setupLookupMocks();
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByText('SUP-1 - Nhà cung cấp 1')).toBeTruthy();
    expect(screen.getByText('Trang 1 / 2 · 51 phiếu')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Trang sau' }));

    expect(h.useReceipts).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 50,
      search: undefined,
      ownerId: undefined,
      warehouseId: undefined,
      sortBy: 'CreatedAt',
      sortDirection: 'DESC',
    });
  });

  it('shows the permission-denied state', () => {
    h.useReceipts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError({ status: 403, code: 'FORBIDDEN', message: 'Forbidden' }),
      refetch: vi.fn(),
    });
    setupLookupMocks();

    renderPage();

    expect(screen.getByText('Từ chối quyền truy cập')).toBeTruthy();
  });
});
