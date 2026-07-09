// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WarehouseMasterPage } from '@modules/MasterData/Presentation/Pages/WarehouseMasterPage';

const mutationSpies = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

function warehouseNode(overrides: { id: string; warehouseCode: string; warehouseName: string; status?: string }) {
  return {
    id: overrides.id,
    type: 'warehouse' as const,
    label: overrides.warehouseCode,
    status: overrides.status ?? 'Active',
    entity: {
      id: overrides.id,
      siteId: 'site-1',
      warehouseCode: overrides.warehouseCode,
      warehouseName: overrides.warehouseName,
      warehouseTypeCode: 'DC',
      status: overrides.status ?? 'Active',
      timezone: 'Asia/Bangkok',
      sourceSystem: null,
      referenceId: null,
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    },
    children: [],
  };
}

function siteNode(overrides: { id: string; siteCode: string; siteName: string; children?: unknown[] }) {
  return {
    id: overrides.id,
    type: 'site' as const,
    label: overrides.siteCode,
    status: 'Active',
    entity: {
      id: overrides.id,
      siteCode: overrides.siteCode,
      siteName: overrides.siteName,
      status: 'Active',
      sourceSystem: null,
      referenceId: null,
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    },
    children: overrides.children ?? [],
  };
}

const treeData = vi.hoisted(() => ({
  nodes: [] as unknown[],
  isLoading: false,
  error: null as Error | null,
}));
treeData.nodes = [
  siteNode({
    id: 'site-1',
    siteCode: 'SITE-HCM',
    siteName: 'Trung tâm HCM',
    children: [warehouseNode({ id: 'wh-1', warehouseCode: 'WH-HCM-01', warehouseName: 'Kho HCM 01' })],
  }),
  siteNode({
    id: 'site-2',
    siteCode: 'SITE-HN',
    siteName: 'Trung tâm Hà Nội',
    children: [warehouseNode({ id: 'wh-2', warehouseCode: 'WH-HN-01', warehouseName: 'Kho Hà Nội 01', status: 'Inactive' })],
  }),
];

vi.mock('@modules/MasterData/Application/Queries/UseSiteLocationTree', () => ({
  useSiteLocationTree: () => ({ data: treeData.nodes, isLoading: treeData.isLoading, error: treeData.error }),
}));

vi.mock('@modules/MasterData/Application/Queries/UseWarehouseTypes', () => ({
  useActiveWarehouseTypes: () => ({
    data: {
      items: [
        { warehouseTypeCode: 'DC', warehouseTypeName: 'Distribution Center' },
        { warehouseTypeCode: 'WT-01', warehouseTypeName: 'Kho thường' },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: () => ({
    options: [{ value: 'RC-MD-UPDATE', label: 'RC-MD-UPDATE - Cập nhật master data' }],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@modules/MasterData/Application/Commands/UseMasterDataMutations', () => ({
  useMasterDataMutations: () => ({
    createWarehouse: { isPending: false, mutate: mutationSpies.create },
    updateWarehouse: { isPending: false, mutate: mutationSpies.update },
  }),
}));

afterEach(() => {
  cleanup();
  mutationSpies.create.mockClear();
  mutationSpies.update.mockClear();
});

describe('WarehouseMasterPage', () => {
  it('renders the warehouse list, filters by search/status, and creates a warehouse', async () => {
    render(<WarehouseMasterPage />);

    expect(screen.getByRole('heading', { name: 'Kho' })).toBeTruthy();
    expect(screen.getAllByText('WH-HCM-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('WH-HN-01').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /Sơ đồ kho/ })).toBeNull();

    fireEvent.change(screen.getByLabelText('Tìm'), { target: { value: 'HCM' } });
    await waitFor(() => expect(screen.queryByText('WH-HN-01')).toBeNull());
    expect(screen.getAllByText('WH-HCM-01').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Tìm'), { target: { value: '' } });

    fireEvent.click(screen.getByLabelText('Trạng thái'));
    fireEvent.click(screen.getByRole('option', { name: 'Không hoạt động' }));
    await waitFor(() => expect(screen.queryByText('WH-HCM-01')).toBeNull());
    expect(screen.getAllByText('WH-HN-01').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText('Trạng thái'));
    fireEvent.click(screen.getByRole('option', { name: 'Tất cả' }));
    await waitFor(() => expect(screen.getAllByText('WH-HCM-01').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Tạo kho' }));
    const createDialog = screen.getByRole('dialog', { name: 'Tạo kho' });
    fireEvent.change(within(createDialog).getByLabelText('Mã kho'), { target: { value: 'WH-DN-01' } });
    fireEvent.change(within(createDialog).getByLabelText('Tên kho'), { target: { value: 'Kho Đà Nẵng 01' } });
    fireEvent.click(within(createDialog).getByLabelText('Loại kho'));
    fireEvent.click(screen.getByRole('option', { name: 'WT-01 - Kho thường' }));
    fireEvent.click(within(createDialog).getByLabelText('Trạng thái'));
    fireEvent.click(screen.getByRole('option', { name: 'Không hoạt động' }));
    fireEvent.click(within(createDialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(createDialog).getByRole('button', { name: 'Tạo kho' }));

    await waitFor(() => expect(mutationSpies.create).toHaveBeenCalled());
    const [createPayload] = mutationSpies.create.mock.calls[0] as [
      { siteId: string; warehouseCode: string; warehouseName: string; warehouseTypeCode: string; status: string },
    ];
    expect(createPayload.siteId).toBe('site-1');
    expect(createPayload.warehouseCode).toBe('WH-DN-01');
    expect(createPayload.warehouseTypeCode).toBe('WT-01');
    expect(createPayload.status).toBe('Inactive');
  });

  it('opens the edit dialog for an existing warehouse and submits the update', async () => {
    render(<WarehouseMasterPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);
    const editDialog = screen.getByRole('dialog', { name: 'Cập nhật kho' });
    expect(within(editDialog).getByLabelText<HTMLInputElement>('Mã kho').value).toBe('WH-HCM-01');
    expect(within(editDialog).getByText('DC - Distribution Center')).toBeTruthy();

    fireEvent.change(within(editDialog).getByLabelText('Tên kho'), { target: { value: 'HCM cập nhật' } });
    fireEvent.click(within(editDialog).getByLabelText('Trạng thái'));
    fireEvent.click(screen.getByRole('option', { name: 'Không hoạt động' }));
    fireEvent.click(within(editDialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Cập nhật kho' }));

    await waitFor(() => expect(mutationSpies.update).toHaveBeenCalled());
    const [updatePayload] = mutationSpies.update.mock.calls[0] as [
      { id: string; input: { warehouseName: string; status: string } },
    ];
    expect(updatePayload.id).toBe('wh-1');
    expect(updatePayload.input.warehouseName).toBe('HCM cập nhật');
    expect(updatePayload.input.status).toBe('Inactive');
  });
});
