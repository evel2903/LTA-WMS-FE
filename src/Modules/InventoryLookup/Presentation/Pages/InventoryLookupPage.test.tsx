// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventorySerialLookupItem } from '@modules/InventoryLookup/Domain/Entities/InventorySerialLookupItem';

const lookupRepo = vi.hoisted(() => ({ current: { list: vi.fn() } }));
vi.mock(
  '@modules/InventoryLookup/Infrastructure/Repositories/InventorySerialLookupRepositoryInstance',
  () => ({
    get inventorySerialLookupRepository() {
      return lookupRepo.current;
    },
  }),
);

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
});
