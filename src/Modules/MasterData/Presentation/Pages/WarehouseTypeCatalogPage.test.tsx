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

vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

vi.mock('@modules/MasterData/Application/Queries/UseWarehouseTypes', () => ({
  useWarehouseTypes: () => ({
    data: {
      items: [
        {
          id: 'wt-1',
          warehouseTypeCode: 'WT-01',
          warehouseTypeName: 'Kho thường',
          description: 'Kho khô tiêu chuẩn',
          status: 'Active',
          sourceSystem: null,
          referenceId: null,
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T00:00:00.000Z',
          createdBy: null,
          updatedBy: null,
        },
      ],
      page: 1,
      pageSize: 50,
      totalItems: 1,
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
  it('renders warehouse type catalog and opens create/edit forms', async () => {
    render(<WarehouseTypeCatalogPage />);

    expect(screen.getByRole('heading', { name: 'Danh mục loại kho' })).toBeTruthy();
    expect(screen.getAllByText('WT-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kho thường').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kho khô tiêu chuẩn').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Tạo loại kho' }));
    const createDialog = screen.getByRole('dialog', { name: 'Tạo loại kho' });
    expect(createDialog).toBeTruthy();
    expect(within(createDialog).getByLabelText('Mã loại kho')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);
    const editDialog = screen.getByRole('dialog', { name: 'Cập nhật loại kho' });
    expect(editDialog).toBeTruthy();
    const codeInput = within(editDialog).getByLabelText<HTMLInputElement>('Mã loại kho');
    expect(codeInput.value).toBe('WT-01');
    expect(codeInput.readOnly).toBe(true);

    fireEvent.change(within(editDialog).getByLabelText('Tên loại kho'), {
      target: { value: 'Kho thường cập nhật' },
    });
    fireEvent.change(within(editDialog).getByLabelText('Mã lý do'), {
      target: { value: 'RC-MD-UPDATE' },
    });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Cập nhật loại kho' }));

    await waitFor(() => expect(mutationSpies.update).toHaveBeenCalled());
    const [payload] = mutationSpies.update.mock.calls[0] as [
      { id: string; input: Record<string, unknown> },
    ];
    expect(payload.id).toBe('wt-1');
    expect(Object.prototype.hasOwnProperty.call(payload.input, 'warehouseTypeCode')).toBe(false);
    expect(payload.input.reasonCode).toBe('RC-MD-UPDATE');
  });
});
