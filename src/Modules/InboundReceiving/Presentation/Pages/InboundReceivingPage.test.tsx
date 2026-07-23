// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

function setupLookupMocks({
  canCreate = false,
  permissionLoading = false,
  permissionFetching = false,
  permissionError = false,
} = {}) {
  h.useActiveOwners.mockReturnValue({
    data: { items: [{ id: 'owner-1', ownerCode: 'OWN-1', ownerName: 'Chủ hàng 1' }] },
    isLoading: false,
    isError: false,
  });
  h.useActiveWarehouses.mockReturnValue({
    data: {
      items: [{ id: 'warehouse-1', warehouseCode: 'WH-1', warehouseName: 'Kho trung tâm' }],
    },
    isLoading: false,
    isError: false,
  });
  h.useUserEffectivePermissions.mockReturnValue({
    data: {
      permissions: canCreate ? [{ action: 'Create', objectType: 'Receipt' }] : [],
    },
    isLoading: permissionLoading,
    isFetching: permissionFetching,
    isError: permissionError,
  });
}

function setupReceiptQuery() {
  h.useReceipts.mockReturnValue({
    data: { items: [receipt], page: 1, pageSize: 50, totalItems: 51, totalPages: 2 },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe('InboundReceivingPage', () => {
  it('renders one responsive catalog and paginates the server-backed list with page-size metadata', async () => {
    const pageTwoReceipt = { ...receipt, id: 'receipt-2', receiptNumber: 'RCPT-002' };
    let pageTwoReady = false;
    let pageSizeReady = false;
    h.useReceipts.mockImplementation(
      ({ page = 1, pageSize = 50 }: { page?: number; pageSize?: number }) => {
        const pageOneData = {
          items: [receipt],
          page: 1,
          pageSize: 50,
          totalItems: 51,
          totalPages: 2,
        };
        const data =
          pageSize === 100 && pageSizeReady
            ? { ...pageOneData, pageSize: 100, totalPages: 1 }
            : page === 2 && pageTwoReady
              ? { ...pageOneData, items: [pageTwoReceipt], page: 2 }
              : pageOneData;

        return {
          data,
          isLoading: false,
          isFetching: (page === 2 && !pageTwoReady) || (pageSize === 100 && !pageSizeReady),
          error: null,
          refetch: vi.fn(),
        };
      },
    );
    setupLookupMocks();
    const user = userEvent.setup();

    const view = renderPage();
    const { container } = view;

    expect((await screen.findAllByText('SUP-1 - Nhà cung cấp 1')).length).toBeGreaterThan(0);
    expect(container.querySelector('[data-catalog-mobile-list]')).toBeTruthy();
    expect(screen.getByText('Trang 1 / 2 · 51 phiếu')).toBeTruthy();
    expect(screen.queryByLabelText('Tìm kiếm Chủ hàng')).toBeNull();
    expect(screen.getByLabelText('Số dòng/trang').className).toContain('h-10');
    expect(screen.getByText('MANUAL:001').closest('[data-slot="table-cell"]')?.className).toContain(
      'whitespace-normal',
    );
    expect(
      screen
        .getAllByText('SUP-1 - Nhà cung cấp 1')
        .find((node) => node.closest('[data-slot="table-cell"]'))
        ?.closest('[data-slot="table-cell"]')?.className,
    ).toContain('whitespace-normal');

    await user.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(h.useReceipts).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 50,
      search: undefined,
      ownerId: undefined,
      warehouseId: undefined,
      sortBy: 'CreatedAt',
      sortDirection: 'DESC',
    });
    expect(screen.queryByText('RCPT-001')).toBeNull();
    expect(screen.getByText('Đang tải phiếu nhập kho...')).toBeTruthy();

    pageTwoReady = true;
    view.rerender(
      <MemoryRouter>
        <InboundReceivingPage />
      </MemoryRouter>,
    );
    expect((await screen.findAllByText('RCPT-002')).length).toBeGreaterThan(0);
    expect(screen.getByText('Trang 2 / 2 · 51 phiếu')).toBeTruthy();

    await user.selectOptions(screen.getByLabelText('Số dòng/trang'), '100');
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, pageSize: 100 }),
    );
    expect(screen.queryByText('RCPT-002')).toBeNull();
    expect(screen.getByText('Đang tải phiếu nhập kho...')).toBeTruthy();

    pageSizeReady = true;
    view.rerender(
      <MemoryRouter>
        <InboundReceivingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Trang 1 / 1 · 51 phiếu')).toBeTruthy();
  });

  it('accepts the valid page returned by the server when the requested page is clamped', async () => {
    let datasetShrunk = false;
    h.useReceipts.mockImplementation(({ page = 1 }: { page?: number }) => {
      if (page > 1) datasetShrunk = true;
      return {
        data: datasetShrunk
          ? { items: [receipt], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 }
          : { items: [receipt], page: 1, pageSize: 50, totalItems: 51, totalPages: 2 },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      };
    });
    setupLookupMocks();
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Tiếp' }));

    await waitFor(() =>
      expect(h.useReceipts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    );
    expect(screen.getByText('Trang 1 / 1 · 1 phiếu')).toBeTruthy();
  });

  it('uses the unknown supplier fallback for whitespace-only supplier fields', () => {
    h.useReceipts.mockReturnValue({
      data: {
        items: [{ ...receipt, supplierCode: '   ', supplierName: '\t' }],
        page: 1,
        pageSize: 50,
        totalItems: 1,
        totalPages: 1,
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
    setupLookupMocks();

    renderPage();

    expect(screen.getAllByText('Không xác định').length).toBeGreaterThan(0);
  });

  it('uses controlled owner/warehouse comboboxes and maps sortable columns to the API contract', async () => {
    setupReceiptQuery();
    setupLookupMocks();
    const user = userEvent.setup();

    renderPage();
    const receiptHeader = screen.getByRole('columnheader', { name: 'Số phiếu' });
    const createdHeader = screen.getByRole('columnheader', { name: 'Tạo lúc' });
    expect(receiptHeader.getAttribute('aria-sort')).toBe('none');
    expect(createdHeader.getAttribute('aria-sort')).toBe('descending');
    expect(screen.getByRole('button', { name: 'Số phiếu' }).className).toContain('min-h-10');

    await user.click(screen.getByRole('combobox', { name: 'Chủ hàng' }));
    expect(screen.getByLabelText('Tìm kiếm Chủ hàng')).toBeTruthy();
    await user.click(screen.getByRole('option', { name: 'OWN-1 - Chủ hàng 1' }));
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, ownerId: 'owner-1' }),
    );

    await user.click(screen.getByRole('combobox', { name: 'Kho' }));
    await user.click(screen.getByRole('option', { name: 'WH-1 - Kho trung tâm' }));
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, ownerId: 'owner-1', warehouseId: 'warehouse-1' }),
    );

    await user.click(screen.getByRole('button', { name: 'Số phiếu' }));
    expect(receiptHeader.getAttribute('aria-sort')).toBe('ascending');
    expect(createdHeader.getAttribute('aria-sort')).toBe('none');
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: 'ReceiptNumber', sortDirection: 'ASC' }),
    );
    await user.click(screen.getByRole('button', { name: 'Số phiếu' }));
    expect(receiptHeader.getAttribute('aria-sort')).toBe('descending');
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: 'ReceiptNumber', sortDirection: 'DESC' }),
    );
    await user.click(screen.getByRole('button', { name: 'Tạo lúc' }));
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: 'CreatedAt', sortDirection: 'ASC' }),
    );
    await user.click(screen.getByRole('button', { name: 'Tạo lúc' }));
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: 'CreatedAt', sortDirection: 'DESC' }),
    );

    const mobileSort = screen.getByLabelText<HTMLSelectElement>('Sắp xếp phiếu nhập kho');
    expect(Array.from(mobileSort.options).map((option) => option.value)).toEqual([
      'createdAt:desc',
      'createdAt:asc',
      'receiptNumber:asc',
      'receiptNumber:desc',
    ]);
    await user.selectOptions(mobileSort, 'receiptNumber:asc');
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        sortBy: 'ReceiptNumber',
        sortDirection: 'ASC',
      }),
    );
  });

  it('resets search, filters and sort from a later server page', async () => {
    h.useReceipts.mockImplementation(
      ({ page = 1, pageSize = 50 }: { page?: number; pageSize?: number }) => ({
        data: { items: [receipt], page, pageSize, totalItems: 51, totalPages: 2 },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
      }),
    );
    setupLookupMocks();
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Tiếp' }));
    expect(h.useReceipts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));

    await user.type(
      screen.getByLabelText('Tìm số phiếu hoặc tham chiếu nghiệp vụ'),
      'MANUAL:001',
    );
    await waitFor(() =>
      expect(h.useReceipts).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'MANUAL:001' }),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Tiếp' }));
    await user.click(screen.getByRole('combobox', { name: 'Chủ hàng' }));
    await user.click(screen.getByRole('option', { name: 'OWN-1 - Chủ hàng 1' }));
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, ownerId: 'owner-1' }),
    );

    await user.click(screen.getByRole('button', { name: 'Tiếp' }));
    await user.click(screen.getByRole('button', { name: 'Số phiếu' }));
    expect(h.useReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        sortBy: 'ReceiptNumber',
        sortDirection: 'ASC',
      }),
    );
  });

  it('keeps create permission fail-closed while permission data is loading', () => {
    setupReceiptQuery();
    setupLookupMocks({ canCreate: true, permissionLoading: true });

    renderPage();

    expect(screen.queryByRole('link', { name: 'Tạo phiếu thủ công' })).toBeNull();
  });

  it.each([
    ['đang refetch', { permissionFetching: true }],
    ['bị lỗi', { permissionError: true }],
  ])('keeps cached create permission fail-closed when permission query %s', (_label, state) => {
    setupReceiptQuery();
    setupLookupMocks({ canCreate: true, ...state });

    renderPage();

    expect(screen.queryByRole('link', { name: 'Tạo phiếu thủ công' })).toBeNull();
  });

  it('shows create action only with Create/Receipt and a read-only state otherwise', () => {
    setupReceiptQuery();
    setupLookupMocks({ canCreate: true });
    const { unmount } = renderPage();
    expect(screen.getByRole('link', { name: 'Tạo phiếu thủ công' })).toBeTruthy();

    unmount();
    setupLookupMocks();
    renderPage();
    expect(screen.queryByRole('link', { name: 'Tạo phiếu thủ công' })).toBeNull();
    expect(screen.getAllByText('Chế độ chỉ đọc').length).toBeGreaterThan(0);
  });

  it('shows the permission-denied state', () => {
    h.useReceipts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new ApiError({ status: 403, code: 'FORBIDDEN', message: 'Forbidden' }),
      refetch: vi.fn(),
    });
    setupLookupMocks();

    renderPage();

    expect(screen.getByText('Không có quyền')).toBeTruthy();
    expect(
      screen.getByText('Bạn không có quyền xem phiếu nhập kho trong phạm vi này.'),
    ).toBeTruthy();
    expect(screen.queryByText('Forbidden')).toBeNull();
  });

  it('shows the empty state returned by the server', () => {
    h.useReceipts.mockReturnValue({
      data: { items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 1 },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
    setupLookupMocks();

    renderPage();

    expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
    expect(
      screen.getByText('Chưa có phiếu nhập kho trong phạm vi hiện tại.'),
    ).toBeTruthy();
    expect(
      screen.queryByText('Tạo phiếu thủ công hoặc bắt đầu tiếp nhận từ một kế hoạch nhập kho.'),
    ).toBeNull();
  });

  it('shows the API error state', () => {
    h.useReceipts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('Receipt API unavailable'),
      refetch: vi.fn(),
    });
    setupLookupMocks();

    renderPage();

    expect(screen.getByText('Không thể tải phiếu nhập kho')).toBeTruthy();
    expect(screen.getByText('Không thể tải danh sách phiếu nhập kho.')).toBeTruthy();
    expect(screen.queryByText('Receipt API unavailable')).toBeNull();
  });
});
