// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { InventoryItem } from '@modules/Inventory/Domain/Entities/InventoryItem';
import type { InventoryListFilter } from '@modules/Inventory/Domain/Types/InventoryQuery';

const listQuery = vi.hoisted(() => ({
  calls: [] as InventoryListFilter[],
  data: null as PaginatedResponse<InventoryItem> | null,
  error: null as Error | null,
}));

vi.mock('@modules/Inventory/Application/Queries/UseInventoryList', () => ({
  useInventoryList: (filter: InventoryListFilter) => {
    listQuery.calls.push(filter);
    return {
      data: listQuery.data,
      error: listQuery.error,
      isError: Boolean(listQuery.error),
      isLoading: false,
      isFetching: false,
    };
  },
}));

vi.mock('@modules/Inventory/Presentation/Components/InventoryControlPanel', () => ({
  InventoryControlPanel: () => <div>Đổi trạng thái</div>,
}));

import { InventoryPage } from '@modules/Inventory/Presentation/Pages/InventoryPage';
import { useInventoryFilterStore } from '@modules/Inventory/Application/Stores/InventoryFilterStore';

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inventory-1' as InventoryItem['id'],
    sku: 'SKU-001',
    productName: 'Nước ngọt lon 330ml',
    warehouseId: 'warehouse-1',
    locationCode: 'A-01-01',
    quantityOnHand: 120,
    quantityReserved: 35,
    reorderPoint: 20,
    unitOfMeasure: 'EA',
    updatedAt: '2026-06-25T00:00:00.000Z',
    ...overrides,
  };
}

function page(items: InventoryItem[]): PaginatedResponse<InventoryItem> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function renderInventory() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.INVENTORY.ROOT]}>
      <Routes>
        <Route path={ROUTES.INVENTORY.ROOT} element={<InventoryPage />} />
        <Route path={ROUTES.INVENTORY.DETAIL()} element={<div>Chi tiết tồn kho đã mở</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listQuery.calls = [];
  listQuery.data = page([makeItem()]);
  listQuery.error = null;
  useInventoryFilterStore.getState().reset();
});

afterEach(() => {
  cleanup();
  useInventoryFilterStore.getState().reset();
});

describe('InventoryPage prototype search UX', () => {
  it('renders search-first inventory list without list-page mutation actions', () => {
    renderInventory();

    expect(screen.getByRole('heading', { name: 'Tồn kho' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Tìm SKU, lô, LPN hoặc vị trí')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Khả dụng' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chờ kiểm' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Giữ' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Khả dụng = max/)).toBeTruthy();
    expect(screen.getByText(/Chưa có hợp đồng API khi chạy riêng cho lô\/LPN và đang giữ/)).toBeTruthy();

    expect(screen.getByRole('columnheader', { name: 'Sản phẩm / SKU' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Lô / LPN' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Đã phân bổ' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Đang giữ' })).toBeTruthy();
    expect(screen.getByText('Nước ngọt lon 330ml')).toBeTruthy();
    expect(screen.getByText('SKU-001')).toBeTruthy();
    expect(screen.getAllByText('35').length).toBeGreaterThan(0);
    expect(screen.getAllByText('85').length).toBeGreaterThan(0);

    expect(screen.queryByText('Đổi trạng thái')).toBeNull();
    expect(screen.queryByText('Dịch chuyển nội bộ')).toBeNull();
  });

  it('maps safe filter chips to existing StockStatus query values only', async () => {
    const actor = userEvent.setup();
    renderInventory();

    await actor.click(screen.getByRole('button', { name: 'Sắp hết' }));

    await waitFor(() =>
      expect(listQuery.calls.some((filter) => filter.status === 'LOW_STOCK')).toBe(true),
    );
    expect(listQuery.calls.some((filter) => String(filter.status) === 'HOLD')).toBe(false);
  });

  it('debounces search text into the inventory list query', async () => {
    const actor = userEvent.setup();
    renderInventory();

    await actor.type(screen.getByPlaceholderText('Tìm SKU, lô, LPN hoặc vị trí'), 'SKU-001');

    await waitFor(() =>
      expect(listQuery.calls.some((filter) => filter.search === 'SKU-001')).toBe(true),
    );
  });

  it('opens inventory detail route from a table row', async () => {
    const actor = userEvent.setup();
    renderInventory();

    await actor.click(screen.getByText('Nước ngọt lon 330ml'));

    expect(await screen.findByText('Chi tiết tồn kho đã mở')).toBeTruthy();
  });

  it('shows a blocked contract state when the legacy inventory API is unavailable', () => {
    listQuery.data = page([makeItem()]);
    listQuery.error = new ApiError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'GET /inventory trả 404',
    });

    renderInventory();

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Chưa xác nhận được hợp đồng API khi chạy cho tồn kho/)).toBeTruthy();
    expect(screen.queryByText('Nước ngọt lon 330ml')).toBeNull();
    expect(screen.getByText(/GET \/inventory trả 404/)).toBeTruthy();
  });
});
