// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocationMasterPage } from '@modules/MasterData/Presentation/Pages/LocationMasterPage';

const mutationSpies = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

const AUDIT_FIELDS = {
  sourceSystem: null,
  referenceId: null,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

function locationNode(overrides: {
  id: string;
  locationCode: string;
  locationName: string;
  warehouseId: string;
  zoneId: string;
  locationType?: string;
  locationStatus?: string;
  aisleCode?: string | null;
  rackCode?: string | null;
  levelCode?: string | null;
  binCode?: string | null;
}) {
  return {
    id: overrides.id,
    type: 'location' as const,
    label: overrides.locationCode,
    status: overrides.locationStatus ?? 'Active',
    entity: {
      id: overrides.id,
      warehouseId: overrides.warehouseId,
      zoneId: overrides.zoneId,
      parentLocationId: null,
      locationCode: overrides.locationCode,
      locationName: overrides.locationName,
      locationType: overrides.locationType ?? 'Bin',
      locationProfileId: 'profile-1',
      locationStatus: overrides.locationStatus ?? 'Active',
      aisleCode: 'aisleCode' in overrides ? overrides.aisleCode : 'A01',
      rackCode: 'rackCode' in overrides ? overrides.rackCode : 'R01',
      levelCode: 'levelCode' in overrides ? overrides.levelCode : 'L01',
      binCode: 'binCode' in overrides ? overrides.binCode : 'B01',
      capacityQty: null,
      capacityVolume: null,
      capacityWeight: null,
      palletSlot: null,
      temperatureClass: null,
      dgCompatibilityGroup: null,
      bondedFlag: false,
      ownerRestriction: null,
      mixSkuPolicy: null,
      mixLotPolicy: null,
      mixOwnerPolicy: null,
      pickSequence: null,
      putawaySequence: null,
      ...AUDIT_FIELDS,
    },
    children: [] as unknown[],
  };
}

function zoneNode(overrides: { id: string; zoneCode: string; zoneName: string; warehouseId: string; children: ReturnType<typeof locationNode>[] }) {
  return {
    id: overrides.id,
    type: 'zone' as const,
    label: overrides.zoneCode,
    status: 'Active' as const,
    entity: {
      id: overrides.id,
      warehouseId: overrides.warehouseId,
      zoneCode: overrides.zoneCode,
      zoneName: overrides.zoneName,
      zoneType: 'Storage',
      status: 'Active' as const,
      sequence: null,
      temperatureClass: null,
      complianceFlags: {},
      ...AUDIT_FIELDS,
    },
    children: overrides.children,
  };
}

function warehouseNode(overrides: { id: string; warehouseCode: string; warehouseName: string; siteId: string; children: ReturnType<typeof zoneNode>[] }) {
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
      ...AUDIT_FIELDS,
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
      ...AUDIT_FIELDS,
    },
    children: overrides.children,
  };
}

const profile = {
  id: 'profile-1',
  profileCode: 'PRF-BIN',
  profileName: 'Bin profile',
  locationType: 'Bin',
  version: 1,
  status: 'Active' as const,
  capacityPolicy: {},
  eligibilityPolicy: {},
  mixPolicy: {},
  compliancePolicy: {},
  operationPolicy: {},
  ...AUDIT_FIELDS,
};

const treeData = vi.hoisted(() => ({
  nodes: [] as unknown[],
  isLoading: false,
  error: null as Error | null,
}));

const profilesData = vi.hoisted(() => ({
  items: [] as unknown[],
  isLoading: false,
  error: null as Error | null,
}));

const defaultTreeNodes = [
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
          zoneNode({
            id: 'zone-1',
            zoneCode: 'Z-A',
            zoneName: 'Zone A',
            warehouseId: 'wh-1',
            children: [
              locationNode({ id: 'loc-1', locationCode: 'A-01-02-03-04', locationName: 'Vị trí 1', warehouseId: 'wh-1', zoneId: 'zone-1' }),
              locationNode({
                id: 'loc-2',
                locationCode: 'A-05-06-07-08',
                locationName: 'Vị trí 2',
                warehouseId: 'wh-1',
                zoneId: 'zone-1',
                locationStatus: 'Blocked',
                locationType: 'Pallet',
              }),
            ],
          }),
        ],
      }),
      warehouseNode({
        id: 'wh-2',
        warehouseCode: 'WH-02',
        warehouseName: 'Kho 2',
        siteId: 'site-1',
        children: [
          zoneNode({
            id: 'zone-2',
            zoneCode: 'Z-B',
            zoneName: 'Zone B',
            warehouseId: 'wh-2',
            children: [
              locationNode({ id: 'loc-3', locationCode: 'B-09-10-11-12', locationName: 'Vị trí 3', warehouseId: 'wh-2', zoneId: 'zone-2' }),
            ],
          }),
        ],
      }),
    ],
  }),
];

// Wraps a single location fixture in the same site/warehouse/zone shape as
// defaultTreeNodes, for tests that need to control the location's physical
// address fields (legacy fallback vs. explicit values) independently.
function singleLocationTree(location: ReturnType<typeof locationNode>) {
  return [
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
            zoneNode({ id: 'zone-1', zoneCode: 'Z-A', zoneName: 'Zone A', warehouseId: 'wh-1', children: [location] }),
          ],
        }),
      ],
    }),
  ];
}

treeData.nodes = defaultTreeNodes;
profilesData.items = [profile];

vi.mock('@modules/MasterData/Application/Queries/UseSiteLocationTree', () => ({
  useSiteLocationTree: () => ({ data: treeData.nodes, isLoading: treeData.isLoading, error: treeData.error }),
}));

vi.mock('@modules/MasterData/Application/Queries/UseLocationProfiles', () => ({
  useLocationProfiles: () => ({
    data: { items: profilesData.items },
    isLoading: profilesData.isLoading,
    error: profilesData.error,
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
    createLocation: { isPending: false, mutate: mutationSpies.create },
    updateLocation: { isPending: false, mutate: mutationSpies.update },
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <LocationMasterPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  mutationSpies.create.mockClear();
  mutationSpies.update.mockClear();
  treeData.nodes = defaultTreeNodes;
  profilesData.items = [profile];
  profilesData.isLoading = false;
  profilesData.error = null;
});

describe('LocationMasterPage', () => {
  it('renders the location list with Loại and Trạng thái columns, and filters by search/status', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Vị trí vật lý' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Loại' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Trạng thái' })).toBeTruthy();
    expect(screen.getAllByText('A-01-02-03-04').length).toBeGreaterThan(0);
    expect(screen.getAllByText('A-05-06-07-08').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pallet').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Tìm'), { target: { value: 'Vị trí 2' } });
    await waitFor(() => expect(screen.queryByText('A-01-02-03-04')).toBeNull());
    expect(screen.getAllByText('A-05-06-07-08').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Tìm'), { target: { value: '' } });

    fireEvent.click(screen.getByLabelText('Trạng thái'));
    fireEvent.click(screen.getByRole('option', { name: 'Bị khóa' }));
    await waitFor(() => expect(screen.queryByText('A-01-02-03-04')).toBeNull());
    expect(screen.getAllByText('A-05-06-07-08').length).toBeGreaterThan(0);
  });

  it('cascades Site -> Kho -> Zone filters and resets lower levels on parent change', async () => {
    renderPage();

    fireEvent.click(screen.getByLabelText('Kho'));
    fireEvent.click(screen.getByRole('option', { name: 'WH-01 - Kho 1' }));
    await waitFor(() => expect(screen.queryByText('B-09-10-11-12')).toBeNull());

    fireEvent.click(screen.getByLabelText('Zone'));
    fireEvent.click(screen.getByRole('option', { name: 'WH-01 · Z-A' }));
    await waitFor(() => expect(screen.getAllByText('A-01-02-03-04').length).toBeGreaterThan(0));

    // Changing Site resets Kho/Zone back to "Tất cả" — self-heals rather than
    // pointing at a warehouse/zone no longer valid for the new site.
    fireEvent.click(screen.getByLabelText('Site'));
    fireEvent.click(screen.getByRole('option', { name: 'Tất cả site' }));
    await waitFor(() => expect(screen.getAllByText('B-09-10-11-12').length).toBeGreaterThan(0));
    expect(screen.getByLabelText('Kho').textContent).toContain('Tất cả kho');
    expect(screen.getByLabelText('Zone').textContent).toContain('Tất cả zone');
  });

  it('creates a location scoped to the selected zone', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Tạo vị trí vật lý' }));
    const createDialog = screen.getByRole('dialog', { name: 'Tạo vị trí vật lý' });
    fireEvent.change(within(createDialog).getByLabelText('Mã vị trí'), { target: { value: 'A-99' } });
    fireEvent.change(within(createDialog).getByLabelText('Tên vị trí'), { target: { value: 'Vị trí mới' } });
    fireEvent.click(within(createDialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(createDialog).getByRole('button', { name: 'Tạo vị trí' }));

    await waitFor(() => expect(mutationSpies.create).toHaveBeenCalled());
    const [createPayload] = mutationSpies.create.mock.calls[0] as [{ locationCode: string; zoneId: string }];
    expect(createPayload.locationCode).toBe('A-99');
    expect(createPayload.zoneId).toBe('zone-1');
  });

  it('keeps legacy physical address values visible when editing and does not persist the fallback on a no-op submit', async () => {
    treeData.nodes = singleLocationTree(
      locationNode({
        id: 'loc-1',
        locationCode: 'A-01-02-03-04',
        locationName: 'Legacy location',
        warehouseId: 'wh-1',
        zoneId: 'zone-1',
        aisleCode: null,
        rackCode: null,
        levelCode: null,
        binCode: null,
      }),
    );
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Cập nhật vị trí vật lý' });
    expect(within(dialog).getByLabelText('Dãy')).toHaveProperty('value', '01');
    expect(within(dialog).getByLabelText('Kệ')).toHaveProperty('value', '02');
    expect(within(dialog).getByLabelText('Tầng')).toHaveProperty('value', '03');
    expect(within(dialog).getByLabelText('Ô')).toHaveProperty('value', '04');

    fireEvent.click(within(dialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cập nhật vị trí' }));

    await waitFor(() => expect(mutationSpies.update).toHaveBeenCalledTimes(1));
    const [updatePayload] = mutationSpies.update.mock.calls[0] as [{
      id: string;
      input: { aisleCode?: string | null; rackCode?: string | null; levelCode?: string | null; binCode?: string | null };
    }];
    expect(updatePayload.id).toBe('loc-1');
    expect(updatePayload.input.aisleCode).toBeUndefined();
    expect(updatePayload.input.rackCode).toBeUndefined();
    expect(updatePayload.input.levelCode).toBeUndefined();
    expect(updatePayload.input.binCode).toBeUndefined();
  });

  it('preserves unchanged explicit physical address values on no-op edit submit', async () => {
    treeData.nodes = singleLocationTree(
      locationNode({
        id: 'loc-1',
        locationCode: 'A-01-02-03-04',
        locationName: 'Vị trí 1',
        warehouseId: 'wh-1',
        zoneId: 'zone-1',
        aisleCode: ' A01 ',
        rackCode: ' R01 ',
        levelCode: ' L01 ',
        binCode: ' B01 ',
      }),
    );
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Cập nhật vị trí vật lý' });
    expect(within(dialog).getByLabelText('Dãy')).toHaveProperty('value', 'A01');
    expect(within(dialog).getByLabelText('Kệ')).toHaveProperty('value', 'R01');
    expect(within(dialog).getByLabelText('Tầng')).toHaveProperty('value', 'L01');
    expect(within(dialog).getByLabelText('Ô')).toHaveProperty('value', 'B01');

    fireEvent.click(within(dialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cập nhật vị trí' }));

    await waitFor(() => expect(mutationSpies.update).toHaveBeenCalledTimes(1));
    const [updatePayload] = mutationSpies.update.mock.calls[0] as [{
      input: { aisleCode?: string | null; rackCode?: string | null; levelCode?: string | null; binCode?: string | null };
    }];
    expect(updatePayload.input.aisleCode).toBe(' A01 ');
    expect(updatePayload.input.rackCode).toBe(' R01 ');
    expect(updatePayload.input.levelCode).toBe(' L01 ');
    expect(updatePayload.input.binCode).toBe(' B01 ');
  });

  it('surfaces a warning banner and hides create when no active location profile exists', () => {
    profilesData.items = [];
    renderPage();

    expect(screen.getByText('Thiếu hồ sơ vị trí đang hoạt động')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tạo vị trí vật lý' })).toBeNull();
  });

  it('surfaces a destructive banner when the location profile query fails', () => {
    profilesData.error = new Error('profile query failed');
    renderPage();

    expect(screen.getByText('Không thể tải hồ sơ vị trí')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tạo vị trí vật lý' })).toBeNull();
  });

  it('localizes headers and avoids English action/profile labels', () => {
    renderPage();

    expect(screen.getByRole('columnheader', { name: 'Kệ' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Ô' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Hồ sơ vị trí' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Hành động' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Profile' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Action' })).toBeNull();
  });
});
