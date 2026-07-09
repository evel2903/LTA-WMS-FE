// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ZoneMasterPage } from '@modules/MasterData/Presentation/Pages/ZoneMasterPage';

const mutationSpies = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

function zoneNode(overrides: {
  id: string;
  zoneCode: string;
  zoneName: string;
  warehouseId: string;
  status?: string;
  zoneType?: string;
}) {
  return {
    id: overrides.id,
    type: 'zone' as const,
    label: overrides.zoneCode,
    status: overrides.status ?? 'Active',
    entity: {
      id: overrides.id,
      warehouseId: overrides.warehouseId,
      zoneCode: overrides.zoneCode,
      zoneName: overrides.zoneName,
      zoneType: overrides.zoneType ?? 'Storage',
      status: overrides.status ?? 'Active',
      sequence: null,
      temperatureClass: null,
      complianceFlags: {},
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

function warehouseNode(overrides: {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  siteId: string;
  children: ReturnType<typeof zoneNode>[];
}) {
  return {
    id: overrides.id,
    type: 'warehouse' as const,
    label: overrides.warehouseCode,
    status: 'Active' as const,
    entity: {
      id: overrides.id,
      siteId: overrides.siteId,
      warehouseCode: overrides.warehouseCode,
      warehouseName: overrides.warehouseName,
      warehouseTypeCode: 'AMB',
      status: 'Active' as const,
      timezone: null,
      sourceSystem: null,
      referenceId: null,
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    },
    children: overrides.children,
  };
}

function siteNode(overrides: { id: string; siteCode: string; siteName: string; children: ReturnType<typeof warehouseNode>[] }) {
  return {
    id: overrides.id,
    type: 'site' as const,
    label: overrides.siteCode,
    status: 'Active' as const,
    entity: {
      id: overrides.id,
      siteCode: overrides.siteCode,
      siteName: overrides.siteName,
      status: 'Active' as const,
      sourceSystem: null,
      referenceId: null,
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    },
    children: overrides.children,
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
    children: [
      warehouseNode({
        id: 'wh-1',
        warehouseCode: 'WH-01',
        warehouseName: 'Kho 1',
        siteId: 'site-1',
        children: [
          zoneNode({ id: 'zone-1', zoneCode: 'Z-A', zoneName: 'Zone A', warehouseId: 'wh-1' }),
          zoneNode({ id: 'zone-2', zoneCode: 'Z-B', zoneName: 'Zone B', warehouseId: 'wh-1', status: 'Inactive' }),
        ],
      }),
    ],
  }),
];

vi.mock('@modules/MasterData/Application/Queries/UseSiteLocationTree', () => ({
  useSiteLocationTree: () => ({ data: treeData.nodes, isLoading: treeData.isLoading, error: treeData.error }),
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
    createZone: { isPending: false, mutate: mutationSpies.create },
    updateZone: { isPending: false, mutate: mutationSpies.update },
  }),
}));

afterEach(() => {
  cleanup();
  mutationSpies.create.mockClear();
  mutationSpies.update.mockClear();
});

describe('ZoneMasterPage', () => {
  it('renders the zone list, filters by search/status, and creates a zone', async () => {
    render(<ZoneMasterPage />);

    expect(screen.getByRole('heading', { name: 'Zone' })).toBeTruthy();
    expect(screen.getAllByText('Z-A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Z-B').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Tìm'), { target: { value: 'Zone A' } });
    await waitFor(() => expect(screen.queryByText('Z-B')).toBeNull());
    expect(screen.getAllByText('Z-A').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Tìm'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Tạo zone' }));
    const createDialog = screen.getByRole('dialog', { name: 'Tạo zone' });
    fireEvent.change(within(createDialog).getByLabelText('Mã khu vực'), { target: { value: 'Z-C' } });
    fireEvent.change(within(createDialog).getByLabelText('Tên khu vực'), { target: { value: 'Zone C' } });
    fireEvent.click(within(createDialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(createDialog).getByRole('button', { name: 'Tạo zone' }));

    await waitFor(() => expect(mutationSpies.create).toHaveBeenCalled());
    const [createPayload] = mutationSpies.create.mock.calls[0] as [{ zoneCode: string; warehouseId: string }];
    expect(createPayload.zoneCode).toBe('Z-C');
    expect(createPayload.warehouseId).toBe('wh-1');
  });

  it('opens the edit dialog for an existing zone and submits the update', async () => {
    render(<ZoneMasterPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);
    const editDialog = screen.getByRole('dialog', { name: 'Cập nhật zone' });
    expect(within(editDialog).getByLabelText<HTMLInputElement>('Mã khu vực').value).toBe('Z-A');

    fireEvent.change(within(editDialog).getByLabelText('Tên khu vực'), { target: { value: 'Zone A cập nhật' } });
    fireEvent.click(within(editDialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Cập nhật zone' }));

    await waitFor(() => expect(mutationSpies.update).toHaveBeenCalled());
    const [updatePayload] = mutationSpies.update.mock.calls[0] as [{ id: string; input: { zoneName: string } }];
    expect(updatePayload.id).toBe('zone-1');
    expect(updatePayload.input.zoneName).toBe('Zone A cập nhật');
  });
});
