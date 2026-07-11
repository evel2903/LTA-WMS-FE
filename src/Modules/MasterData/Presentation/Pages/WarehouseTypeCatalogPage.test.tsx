// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WarehouseTypeCatalogPage } from '@modules/MasterData/Presentation/Pages/WarehouseTypeCatalogPage';

const mutationSpies = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));
const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [{ value: 'RC-MD-UPDATE', label: 'RC-MD-UPDATE - Cập nhật master data' }],
    isLoading: false,
    isError: false,
  })),
}));

const AUDIT = {
  sourceSystem: null,
  referenceId: null,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

vi.mock('@modules/MasterData/Application/Queries/UseWarehouseTypes', () => ({
  useWarehouseTypes: () => ({
    data: {
      items: [
        { id: 'wt-1', warehouseTypeCode: 'WT-01', warehouseTypeName: 'Kho thường', description: 'Kho khô tiêu chuẩn', status: 'Active', ...AUDIT },
        { id: 'wt-2', warehouseTypeCode: 'WT-02', warehouseTypeName: 'Kho lạnh', description: 'Kho lạnh âm sâu', status: 'Inactive', ...AUDIT },
      ],
      page: 1,
      pageSize: 50,
      totalItems: 2,
      totalPages: 1,
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@modules/MasterData/Application/Commands/UseMasterDataMutations', () => ({
  useMasterDataMutations: () => ({
    createWarehouseType: { isPending: false, mutate: mutationSpies.create },
    updateWarehouseType: { isPending: false, mutate: mutationSpies.update },
  }),
}));

afterEach(() => {
  cleanup();
  mutationSpies.create.mockClear();
  mutationSpies.update.mockClear();
  reasonCodeOptions.useReasonCodeOptions.mockClear();
});

describe('WarehouseTypeCatalogPage', () => {
  it('renders the catalog with DSR columns, StatusBadge, and toolbar (Tìm + Trạng thái)', () => {
    render(<WarehouseTypeCatalogPage />);

    expect(screen.getByRole('heading', { name: 'Danh mục loại kho' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: /Mã loại kho/ })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: /Tên loại kho/ })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: /Trạng thái/ })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Hành động' })).toBeTruthy();
    expect(screen.getAllByText('WT-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kho lạnh').length).toBeGreaterThan(0);
    // StatusBadge labels (not the old plain Badge)
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Không hoạt động').length).toBeGreaterThan(0);
    // Toolbar row 1: Tìm + Trạng thái filter
    expect(screen.getByLabelText('Tìm')).toBeTruthy();
    expect(screen.getByLabelText('Trạng thái')).toBeTruthy();
  });

  it('sorts client-side within the current page when a column header is clicked', async () => {
    render(<WarehouseTypeCatalogPage />);

    // Default (server) order: WT-01 before WT-02.
    const before = document.body.textContent ?? '';
    expect(before.indexOf('WT-01')).toBeLessThan(before.indexOf('WT-02'));

    // Sort by "Tên loại kho" ascending: "Kho lạnh" (WT-02) sorts before "Kho thường" (WT-01).
    fireEvent.click(screen.getByRole('button', { name: /Tên loại kho/ }));
    await waitFor(() => {
      const after = document.body.textContent ?? '';
      expect(after.indexOf('WT-02')).toBeLessThan(after.indexOf('WT-01'));
    });
  });

  it('opens create/edit forms and submits an update without the immutable code', async () => {
    render(<WarehouseTypeCatalogPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Tạo loại kho' }));
    const createDialog = screen.getByRole('dialog', { name: 'Tạo loại kho' });
    expect(within(createDialog).getByLabelText('Mã loại kho')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);
    const editDialog = screen.getByRole('dialog', { name: 'Cập nhật loại kho' });
    const codeInput = within(editDialog).getByLabelText<HTMLInputElement>('Mã loại kho');
    expect(codeInput.value).toBe('WT-01');
    expect(codeInput.readOnly).toBe(true);

    fireEvent.change(within(editDialog).getByLabelText('Tên loại kho'), {
      target: { value: 'Kho thường cập nhật' },
    });
    fireEvent.click(within(editDialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Cập nhật loại kho' }));

    await waitFor(() => expect(mutationSpies.update).toHaveBeenCalled());
    const [payload] = mutationSpies.update.mock.calls[0] as [{ id: string; input: Record<string, unknown> }];
    expect(payload.id).toBe('wt-1');
    expect(Object.prototype.hasOwnProperty.call(payload.input, 'warehouseTypeCode')).toBe(false);
    expect(payload.input.reasonCode).toBe('RC-MD-UPDATE');
  });
});
