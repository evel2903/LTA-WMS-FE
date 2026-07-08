// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventorySerialLookupItem } from '@modules/InventoryLookup/Domain/Entities/InventorySerialLookupItem';

const lookupRepo = vi.hoisted(() => ({ current: { list: vi.fn(), correct: vi.fn() } }));
vi.mock(
  '@modules/InventoryLookup/Infrastructure/Repositories/InventorySerialLookupRepositoryInstance',
  () => ({
    get inventorySerialLookupRepository() {
      return lookupRepo.current;
    },
  }),
);

// Reason-code dropdown (IDC-09 serial correction sheet): mock the options hook.
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: () => ({
    options: [{ value: 'RC-V1-ADJUSTMENT', label: 'RC-V1-ADJUSTMENT — Điều chỉnh' }],
    isLoading: false,
    isError: false,
  }),
}));

const catalogRepo = vi.hoisted(() => ({ current: { listSkus: vi.fn() } }));
vi.mock('@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance', () => ({
  get catalogRepository() {
    return catalogRepo.current;
  },
}));

const masterDataRepo = vi.hoisted(() => ({ current: { listWarehouses: vi.fn() } }));
vi.mock('@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance', () => ({
  get masterDataRepository() {
    return masterDataRepo.current;
  },
}));

import { InventoryLookupPage } from '@modules/InventoryLookup/Presentation/Pages/InventoryLookupPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

function makeItem(overrides: Partial<InventorySerialLookupItem> = {}): InventorySerialLookupItem {
  return {
    dimensionId: 'dimension-1',
    skuId: 'sku-1',
    skuCode: 'SKU-A',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WH-01',
    locationId: 'location-1',
    locationCode: 'A-01',
    serialNumber: 'SN-0001',
    lotNumber: null,
    expiryDate: null,
    qtyOnHand: 5,
    qtyAvailable: 5,
    inventoryStatusCode: 'AVAILABLE',
    ...overrides,
  };
}

function setSkuOptions() {
  catalogRepo.current.listSkus = vi.fn(() =>
    Promise.resolve(
      page([
        {
          id: 'sku-1',
          skuCode: 'SKU-A',
          skuName: 'Cuộn cáp mạng',
          itemStatus: 'Active',
        },
      ]),
    ),
  );
}

function setWarehouseOptions() {
  masterDataRepo.current.listWarehouses = vi.fn(() =>
    Promise.resolve(
      page([
        {
          id: 'warehouse-1',
          warehouseCode: 'WH-01',
          warehouseName: 'Kho HCM',
          status: 'Active',
        },
      ]),
    ),
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InventoryLookupPage />
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('InventoryLookupPage', () => {
  it('does not call the lookup API until a SKU is chosen', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page([])));
    renderPage();

    expect(await screen.findByText('Chọn SKU để bắt đầu tra cứu')).toBeTruthy();
    expect(lookupRepo.current.list).not.toHaveBeenCalled();
  });

  it('lists serial/lot results once a SKU is selected', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');

    const row = await screen.findByTestId('inventory-lookup-row-dimension-1');
    expect(within(row).getByText('SN-0001')).toBeTruthy();
    expect(within(row).getByText('WH-01')).toBeTruthy();
    expect(within(row).getByText('A-01')).toBeTruthy();
    await waitFor(() =>
      expect(lookupRepo.current.list).toHaveBeenCalledWith(
        expect.objectContaining({ skuId: 'sku-1' }),
      ),
    );
  });

  it('debounces the serial filter and forwards it (with lot filter undefined) to the query', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
    await screen.findByTestId('inventory-lookup-row-dimension-1');

    await actor.type(screen.getByLabelText('Lọc số serial'), 'SN-0001');

    await waitFor(() =>
      expect(lookupRepo.current.list).toHaveBeenCalledWith(
        expect.objectContaining({
          skuId: 'sku-1',
          serialNumber: 'SN-0001',
          lotNumber: undefined,
        }),
      ),
    );
  });

  it('shows an empty state when the selected SKU has no matching serial/lot rows', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page<InventorySerialLookupItem>([])));
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');

    expect(await screen.findByText('Không có kết quả')).toBeTruthy();
    expect(screen.getByText('Không có serial/lô nào khớp bộ lọc hiện tại.')).toBeTruthy();
  });

  it('forwards the warehouse filter to the query', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
    await screen.findByTestId('inventory-lookup-row-dimension-1');

    await screen.findByRole('option', { name: /WH-01/i });
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');

    await waitFor(() =>
      expect(lookupRepo.current.list).toHaveBeenCalledWith(
        expect.objectContaining({ skuId: 'sku-1', warehouseId: 'warehouse-1' }),
      ),
    );
  });

  it('debounces typed warehouse search text and forwards it as WarehouseName (IFB-16)', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
    await screen.findByTestId('inventory-lookup-row-dimension-1');

    await actor.type(screen.getByLabelText('Tìm kiếm Kho'), 'HCM');

    await waitFor(() =>
      expect(masterDataRepo.current.listWarehouses).toHaveBeenCalledWith(
        expect.objectContaining({ warehouseName: 'HCM' }),
      ),
    );
  });

  it('clears the selected warehouse when the search text changes afterwards (review-fix)', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
    await screen.findByTestId('inventory-lookup-row-dimension-1');

    await screen.findByRole('option', { name: /WH-01/i });
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    expect(screen.getByLabelText('Kho')).toHaveProperty('value', 'warehouse-1');

    await actor.type(screen.getByLabelText('Tìm kiếm Kho'), 'H');

    expect(screen.getByLabelText('Kho')).toHaveProperty('value', '');
  });

  it('resets warehouse/serial/lot filters when the SKU selection changes', async () => {
    catalogRepo.current.listSkus = vi.fn(() =>
      Promise.resolve(
        page([
          { id: 'sku-1', skuCode: 'SKU-A', skuName: 'Cuộn cáp mạng', itemStatus: 'Active' },
          { id: 'sku-2', skuCode: 'SKU-B', skuName: 'Ống nhựa', itemStatus: 'Active' },
        ]),
      ),
    );
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
    await screen.findByTestId('inventory-lookup-row-dimension-1');

    await screen.findByRole('option', { name: /WH-01/i });
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    await actor.type(screen.getByLabelText('Lọc số serial'), 'SN-0001');

    await waitFor(() =>
      expect(lookupRepo.current.list).toHaveBeenCalledWith(
        expect.objectContaining({
          skuId: 'sku-1',
          warehouseId: 'warehouse-1',
          serialNumber: 'SN-0001',
        }),
      ),
    );

    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-2');

    await waitFor(() =>
      expect(lookupRepo.current.list).toHaveBeenCalledWith(
        expect.objectContaining({
          skuId: 'sku-2',
          warehouseId: undefined,
          serialNumber: undefined,
          lotNumber: undefined,
        }),
      ),
    );
    expect(screen.getByLabelText('Kho')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Lọc số serial')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Tìm kiếm Kho')).toHaveProperty('value', '');
  });

  it('does not combine the new SKU with the old, not-yet-debounced serial filter (debounce reset)', async () => {
    catalogRepo.current.listSkus = vi.fn(() =>
      Promise.resolve(
        page([
          { id: 'sku-1', skuCode: 'SKU-A', skuName: 'Cuộn cáp mạng', itemStatus: 'Active' },
          { id: 'sku-2', skuCode: 'SKU-B', skuName: 'Ống nhựa', itemStatus: 'Active' },
        ]),
      ),
    );
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
    await actor.type(screen.getByLabelText('Lọc số serial'), 'SN-0001');
    await waitFor(() =>
      expect(lookupRepo.current.list).toHaveBeenCalledWith(
        expect.objectContaining({ skuId: 'sku-1', serialNumber: 'SN-0001' }),
      ),
    );

    lookupRepo.current.list.mockClear();
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-2');

    // Checked without waiting for the debounce timer — every call fired as part of
    // this SKU switch must already carry the reset filter, none should combine the
    // new SKU with the previous SKU's still-debouncing serial text.
    expect(lookupRepo.current.list.mock.calls.length).toBeGreaterThan(0);
    for (const call of lookupRepo.current.list.mock.calls) {
      expect(call[0]).toEqual(expect.objectContaining({ skuId: 'sku-2', serialNumber: undefined }));
    }
  });

  it('shows pagination controls and requests the next page on click', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() =>
      Promise.resolve({ items: [makeItem()], page: 1, pageSize: 20, totalItems: 40, totalPages: 2 }),
    );
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
    await screen.findByTestId('inventory-lookup-row-dimension-1');

    expect(screen.getByText('Trang 1 / 2 — 40 kết quả')).toBeTruthy();
    const prevButton = screen.getByRole('button', { name: 'Trước' });
    expect(prevButton).toHaveProperty('disabled', true);

    await actor.click(screen.getByRole('button', { name: 'Tiếp' }));

    await waitFor(() =>
      expect(lookupRepo.current.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it('shows a forbidden state when the lookup call is rejected with 403', async () => {
    setSkuOptions();
    setWarehouseOptions();
    lookupRepo.current.list = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 403, code: 'FORBIDDEN', message: 'Bạn không có quyền tra cứu tồn kho.' }),
      ),
    );
    const actor = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /SKU-A/i });
    await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');

    expect(await screen.findByText('Từ chối quyền truy cập')).toBeTruthy();
    expect(screen.getByText('Bạn không có quyền tra cứu tồn kho.')).toBeTruthy();
  });

  describe('Sửa serial (IDC-09)', () => {
    async function openSheetForFirstRow(actor: ReturnType<typeof userEvent.setup>) {
      setSkuOptions();
      setWarehouseOptions();
      lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
      lookupRepo.current.correct = vi.fn(() => Promise.resolve());
      renderPage();

      await screen.findByRole('option', { name: /SKU-A/i });
      await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
      await screen.findByTestId('inventory-lookup-row-dimension-1');
      await actor.click(screen.getAllByRole('button', { name: 'Sửa serial' })[0]);
      await screen.findByRole('dialog');
    }

    it('opens the correction sheet, submits a valid correction, and refreshes the lookup on success', async () => {
      lookupRepo.current.correct = vi.fn(() => Promise.resolve());
      const actor = userEvent.setup();
      await openSheetForFirstRow(actor);

      expect(screen.getByLabelText('Serial hiện tại')).toHaveProperty('value', 'SN-0001');
      await actor.type(screen.getByLabelText('Serial mới'), 'SN-CORRECTED-1');
      await screen.findByRole('option', { name: /RC-V1-ADJUSTMENT/i });
      await actor.selectOptions(screen.getByLabelText('Mã lý do'), 'RC-V1-ADJUSTMENT');
      await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://label-corrected-1');

      await actor.click(screen.getByRole('button', { name: 'Gửi yêu cầu sửa serial' }));

      await waitFor(() =>
        expect(lookupRepo.current.correct).toHaveBeenCalledWith(
          expect.objectContaining({
            dimensionId: 'dimension-1',
            newSerialNumber: 'SN-CORRECTED-1',
            reasonCode: 'RC-V1-ADJUSTMENT',
            evidenceRefs: ['photo://label-corrected-1'],
          }),
        ),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      // list() is called once on initial load, again on sheet-close invalidation.
      await waitFor(() => expect(lookupRepo.current.list).toHaveBeenCalledTimes(2));
    });

    it('keeps submit disabled until new serial, reason code, and evidence are all filled', async () => {
      const actor = userEvent.setup();
      await openSheetForFirstRow(actor);

      const submit = screen.getByRole('button', { name: 'Gửi yêu cầu sửa serial' });
      expect(submit).toHaveProperty('disabled', true);

      await actor.type(screen.getByLabelText('Serial mới'), 'SN-CORRECTED-1');
      expect(submit).toHaveProperty('disabled', true);

      await screen.findByRole('option', { name: /RC-V1-ADJUSTMENT/i });
      await actor.selectOptions(screen.getByLabelText('Mã lý do'), 'RC-V1-ADJUSTMENT');
      expect(submit).toHaveProperty('disabled', true);

      await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://label-corrected-1');
      expect(submit).toHaveProperty('disabled', false);
    });

    it('shows an inline error and keeps the sheet open when the correction request fails', async () => {
      const actor = userEvent.setup();
      await openSheetForFirstRow(actor);
      lookupRepo.current.correct = vi.fn(() =>
        Promise.reject(
          new ApiError({ status: 409, code: 'CONFLICT', message: 'Serial mới đã tồn tại trên 1 đơn vị khác.' }),
        ),
      );

      await actor.type(screen.getByLabelText('Serial mới'), 'SN-CORRECTED-1');
      await screen.findByRole('option', { name: /RC-V1-ADJUSTMENT/i });
      await actor.selectOptions(screen.getByLabelText('Mã lý do'), 'RC-V1-ADJUSTMENT');
      await actor.type(screen.getByLabelText('Mã tham chiếu bằng chứng'), 'photo://label-corrected-1');
      await actor.click(screen.getByRole('button', { name: 'Gửi yêu cầu sửa serial' }));

      expect(await screen.findByText('Serial mới đã tồn tại trên 1 đơn vị khác.')).toBeTruthy();
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('closes the sheet on Escape without submitting', async () => {
      const actor = userEvent.setup();
      await openSheetForFirstRow(actor);

      await actor.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(lookupRepo.current.correct).not.toHaveBeenCalled();
    });

    it('restores focus to the "Sửa serial" trigger button after closing (Escape and the X button)', async () => {
      const actor = userEvent.setup();

      setSkuOptions();
      setWarehouseOptions();
      lookupRepo.current.list = vi.fn(() => Promise.resolve(page([makeItem()])));
      renderPage();
      await screen.findByRole('option', { name: /SKU-A/i });
      await actor.selectOptions(screen.getByLabelText('SKU'), 'sku-1');
      await screen.findByTestId('inventory-lookup-row-dimension-1');
      const trigger = screen.getAllByRole('button', { name: 'Sửa serial' })[0];

      await actor.click(trigger);
      await screen.findByRole('dialog');
      await actor.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(document.activeElement).toBe(trigger);

      await actor.click(trigger);
      const dialog = await screen.findByRole('dialog');
      await actor.click(within(dialog).getByRole('button', { name: 'Đóng sửa serial' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(document.activeElement).toBe(trigger);
    });
  });
});
