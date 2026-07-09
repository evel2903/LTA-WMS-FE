// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';

const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [{ value: 'RC-MD-CREATE', label: 'RC-MD-CREATE - Thay đổi master data' }],
    isLoading: false,
    isError: false,
  })),
}));
const physicalCatalogMocks = vi.hoisted(() => ({
  useSiteLocationTree: vi.fn(),
  useLocationProfiles: vi.fn(),
  useActiveWarehouseTypes: vi.fn(),
  useMasterDataMutations: vi.fn(),
}));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));
vi.mock('@modules/MasterData/Application/Queries/UseSiteLocationTree', () => ({
  useSiteLocationTree: physicalCatalogMocks.useSiteLocationTree,
}));
vi.mock('@modules/MasterData/Application/Queries/UseLocationProfiles', () => ({
  useLocationProfiles: physicalCatalogMocks.useLocationProfiles,
}));
vi.mock('@modules/MasterData/Application/Queries/UseWarehouseTypes', () => ({
  useActiveWarehouseTypes: physicalCatalogMocks.useActiveWarehouseTypes,
}));
vi.mock('@modules/MasterData/Application/Commands/UseMasterDataMutations', () => ({
  useMasterDataMutations: physicalCatalogMocks.useMasterDataMutations,
}));

import { EntityTree } from '@modules/MasterData/Presentation/Components/EntityTree';
import { SiteLocationDetailPanel } from '@modules/MasterData/Presentation/Components/SiteLocationDetailPanel';
import { WarehouseMapPanel } from '@modules/MasterData/Presentation/Components/WarehouseMapPanel';
import { masterDataStatusVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';
import { masterDataRoutes } from '@modules/MasterData/Presentation/Routes/MasterDataRoutes';
import { SiteForm } from '@modules/MasterData/Presentation/Forms/SiteForm';
import { WarehouseForm } from '@modules/MasterData/Presentation/Forms/WarehouseForm';
import { LocationForm } from '@modules/MasterData/Presentation/Forms/LocationForm';
import { buildWarehouseTypeOptions } from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';
import { PhysicalStructureCatalogPage } from '@modules/MasterData/Presentation/Pages/PhysicalStructureCatalogPage';
import { WarehouseMasterPage } from '@modules/MasterData/Presentation/Pages/WarehouseMasterPage';
import { SiteLocationTreePageView } from '@modules/MasterData/Presentation/Pages/SiteLocationTreePageView';
import type {
  LocationProfile,
  SiteLocationTree,
} from '@modules/MasterData/Domain/Types/MasterDataTree';

const profile: LocationProfile = {
  id: 'profile-1',
  profileCode: 'BIN-STD',
  profileName: 'Standard Bin',
  locationType: 'Bin',
  version: 1,
  status: 'Active',
  capacityPolicy: { maxQty: 100 },
  eligibilityPolicy: { pickable: true },
  mixPolicy: { sku: 'SingleSku' },
  compliancePolicy: { bondedAllowed: false },
  operationPolicy: { pickSequenceRequired: true },
  sourceSystem: null,
  referenceId: null,
  createdAt: '2026-06-18T00:00:00.000Z',
  updatedAt: '2026-06-18T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

const emptyPhysicalAddress = {
  aisleCode: null,
  rackCode: null,
  levelCode: null,
  binCode: null,
} as const;

const tree: SiteLocationTree[] = [
  {
    id: 'site-1',
    type: 'site',
    label: 'SITE-01 - Main Site',
    status: 'Active',
    entity: {
      id: 'site-1',
      siteCode: 'SITE-01',
      siteName: 'Main Site',
      status: 'Active',
      sourceSystem: null,
      referenceId: null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      createdBy: null,
      updatedBy: null,
    },
    children: [
      {
        id: 'wh-1',
        type: 'warehouse',
        label: 'WH-01 - Tier 1 Warehouse',
        status: 'Active',
        entity: {
          id: 'wh-1',
          siteId: 'site-1',
          warehouseCode: 'WH-01',
          warehouseName: 'Tier 1 Warehouse',
          warehouseTypeCode: 'WT-01',
          status: 'Active',
          timezone: 'Asia/Bangkok',
          sourceSystem: null,
          referenceId: null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          createdBy: null,
          updatedBy: null,
        },
        children: [
          {
            id: 'zone-1',
            type: 'zone',
            label: 'ZONE-A - Ambient Zone',
            status: 'Active',
            entity: {
              id: 'zone-1',
              warehouseId: 'wh-1',
              zoneCode: 'ZONE-A',
              zoneName: 'Ambient Zone',
              zoneType: 'Ambient',
              status: 'Active',
              sequence: 1,
              temperatureClass: 'Ambient',
              complianceFlags: {},
              sourceSystem: null,
              referenceId: null,
              createdAt: profile.createdAt,
              updatedAt: profile.updatedAt,
              createdBy: null,
              updatedBy: null,
            },
            children: [
              {
                id: 'loc-1',
                type: 'location',
                label: 'A-01-01 - Aisle 01 Rack 01',
                status: 'Active',
                entity: {
                  id: 'loc-1',
                  warehouseId: 'wh-1',
                  zoneId: 'zone-1',
                  parentLocationId: null,
                  locationCode: 'A-01-01',
                  locationName: 'Aisle 01 Rack 01',
                  locationType: 'Bin',
                  locationProfileId: 'profile-1',
                  locationStatus: 'Active',
                  aisleCode: '01',
                  rackCode: '01',
                  levelCode: '01',
                  binCode: '01',
                  capacityQty: 100,
                  capacityVolume: null,
                  capacityWeight: null,
                  palletSlot: null,
                  temperatureClass: 'Ambient',
                  dgCompatibilityGroup: null,
                  bondedFlag: false,
                  ownerRestriction: null,
                  mixSkuPolicy: 'SingleSku',
                  mixLotPolicy: null,
                  mixOwnerPolicy: null,
                  pickSequence: 10,
                  putawaySequence: 20,
                  sourceSystem: null,
                  referenceId: null,
                  createdAt: profile.createdAt,
                  updatedAt: profile.updatedAt,
                  createdBy: null,
                  updatedBy: null,
                },
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

function idleMutation() {
  return {
    isPending: false,
    mutate: vi.fn(),
  };
}

function mockMasterDataMutations() {
  return {
    createSite: idleMutation(),
    updateSite: idleMutation(),
    createWarehouse: idleMutation(),
    updateWarehouse: idleMutation(),
    createWarehouseType: idleMutation(),
    updateWarehouseType: idleMutation(),
    createZone: idleMutation(),
    updateZone: idleMutation(),
    createLocation: idleMutation(),
    updateLocation: idleMutation(),
  };
}

beforeEach(() => {
  physicalCatalogMocks.useSiteLocationTree.mockReturnValue({
    data: tree,
    isLoading: false,
    error: null,
  });
  physicalCatalogMocks.useLocationProfiles.mockReturnValue({
    data: { items: [profile] },
  });
  physicalCatalogMocks.useActiveWarehouseTypes.mockReturnValue({
    data: { items: [] },
  });
  physicalCatalogMocks.useMasterDataMutations.mockReturnValue(mockMasterDataMutations());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Site & Location Tree components', () => {
  it('renders hierarchical tree nodes and active status badges', () => {
    const html = renderToStaticMarkup(
      <EntityTree nodes={tree} selectedNodeId="loc-1" onSelect={() => undefined} />,
    );

    expect(html).toContain('SITE-01 - Main Site');
    expect(html).toContain('WH-01 - Tier 1 Warehouse');
    expect(html).toContain('ZONE-A - Ambient Zone');
    expect(html).toContain('A-01-01 - Aisle 01 Rack 01');
    expect(html).toContain('aria-selected="true"');
  });

  it('renders the warehouse map as a physical structure view without inventory data copy', () => {
    const html = renderToStaticMarkup(
      <WarehouseMapPanel
        nodes={tree}
        selectedNode={tree[0]?.children[0] ?? null}
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain('Sơ đồ kho tổng');
    expect(html).toContain('Bấm khu để xem chi tiết dãy');
    expect(html).toContain('Dãy 01');
    expect(html).toContain('Mỗi ô = 1 vị trí vật lý');
    expect(html).not.toContain('Chú giải bản đồ nhiệt tồn kho');
    expect(html).not.toContain('Tồn kho cao');
    expect(html).not.toContain('Chưa có lớp dữ liệu tồn kho theo vị trí');
    expect(html).not.toContain('bản đồ nhiệt');
    expect(html).toContain('ZONE-A - Ambient Zone');
    expect(html).toContain('A-01-01 - Aisle 01 Rack 01');
    expect(html).toContain('Khu ZONE-A · Ambient Zone');
  });

  it('prefers explicit physical address fields over legacy LocationCode parsing', () => {
    const baseSite = tree[0];
    const baseWarehouse = baseSite?.children[0];
    const baseZone = baseWarehouse?.children[0];
    const baseLocation = baseZone?.children[0];
    if (!baseSite || !baseWarehouse || !baseZone || !baseLocation) {
      throw new Error('Missing base location tree fixture');
    }
    if (baseLocation.type !== 'location') throw new Error('Expected location fixture');

    const explicitLocation: SiteLocationTree = {
      ...baseLocation,
      id: 'loc-explicit',
      label: 'LEGACY-999 - Explicit Slot',
      entity: {
        ...baseLocation.entity,
        id: 'loc-explicit',
        locationCode: 'LEGACY-999',
        locationName: 'Explicit Slot',
        aisleCode: 'A-EXP',
        rackCode: 'R-EXP',
        levelCode: 'L-EXP',
        binCode: 'B-EXP',
      },
    };
    const explicitTree: SiteLocationTree[] = [
      {
        ...baseSite,
        children: [
          {
            ...baseWarehouse,
            children: [
              {
                ...baseZone,
                children: [explicitLocation],
              },
            ],
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <WarehouseMapPanel nodes={explicitTree} selectedNode={explicitLocation} onSelect={() => undefined} />,
    );

    expect(html).toContain('Dãy A-EXP · Tầng L-EXP');
    expect(html).toContain('Dãy A-EXP · Kệ R-EXP · Tầng L-EXP · Ô B-EXP');
    expect(html).not.toContain('Dãy 999');
  });

  it('falls back to legacy LocationCode parts for missing physical bin code', () => {
    const baseSite = tree[0];
    const baseWarehouse = baseSite?.children[0];
    const baseZone = baseWarehouse?.children[0];
    const baseLocation = baseZone?.children[0];
    if (!baseSite || !baseWarehouse || !baseZone || !baseLocation) {
      throw new Error('Missing base location tree fixture');
    }
    if (baseLocation.type !== 'location') throw new Error('Expected location fixture');

    const legacyLocation: SiteLocationTree = {
      ...baseLocation,
      id: 'loc-legacy-bin',
      label: 'A-02-03 - Legacy Slot',
      entity: {
        ...baseLocation.entity,
        id: 'loc-legacy-bin',
        locationCode: 'A-02-03',
        locationName: 'Legacy Slot',
        ...emptyPhysicalAddress,
        pickSequence: null,
        putawaySequence: null,
      },
    };
    const legacyTree: SiteLocationTree[] = [
      {
        ...baseSite,
        children: [
          {
            ...baseWarehouse,
            children: [
              {
                ...baseZone,
                children: [legacyLocation],
              },
            ],
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <WarehouseMapPanel nodes={legacyTree} selectedNode={legacyLocation} onSelect={() => undefined} />,
    );

    expect(html).toContain('Ô 03');
    expect(html).not.toContain('Ô 00');
  });

  it('calls onSelect with the selected zone and location from the map', () => {
    const onSelect = vi.fn();
    render(<WarehouseMapPanel nodes={tree} selectedNode={tree[0]?.children[0] ?? null} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /ZONE-A - Ambient Zone/i }));
    expect(onSelect).toHaveBeenLastCalledWith(tree[0]?.children[0]?.children[0]);

    fireEvent.click(screen.getByRole('button', { name: /A-01-01 - Aisle 01 Rack 01/i }));
    expect(onSelect).toHaveBeenLastCalledWith(tree[0]?.children[0]?.children[0]?.children[0]);
  });

  it('calls onSelect when the compact warehouse selector changes', () => {
    const baseSite = tree[0];
    const baseWarehouse = baseSite?.children[0];
    if (!baseSite || !baseWarehouse) throw new Error('Missing base location tree fixture');
    if (baseWarehouse.type !== 'warehouse') throw new Error('Expected warehouse fixture');

    const emptyWarehouse: SiteLocationTree = {
      ...baseWarehouse,
      id: 'wh-empty',
      label: 'WH-EMPTY - Empty Warehouse',
      entity: {
        ...baseWarehouse.entity,
        id: 'wh-empty',
        warehouseCode: 'WH-EMPTY',
        warehouseName: 'Empty Warehouse',
      },
      children: [],
    };
    const mixedTree: SiteLocationTree[] = [
      {
        ...baseSite,
        children: [emptyWarehouse, baseWarehouse],
      },
    ];
    const onSelect = vi.fn();
    render(<WarehouseMapPanel nodes={mixedTree} selectedNode={emptyWarehouse} onSelect={onSelect} />);

    fireEvent.change(screen.getByLabelText('Kho'), { target: { value: baseWarehouse.id } });

    expect(onSelect).toHaveBeenLastCalledWith(baseWarehouse);
  });

  it('renders separate location status buckets without using inventory hold wording', () => {
    const locationStatuses = ['Active', 'Inactive', 'Blocked', 'Maintenance'] as const;
    const statusLocations: SiteLocationTree[] = locationStatuses.map(
      (status, index): SiteLocationTree => ({
        id: `status-loc-${status}`,
        type: 'location',
        label: `STATUS-${index + 1} - ${status}`,
        status,
        entity: {
          id: `status-loc-${status}`,
          warehouseId: 'wh-1',
          zoneId: 'zone-1',
          parentLocationId: null,
          locationCode: `STATUS-${index + 1}`,
          locationName: `${status} location`,
          locationType: 'Bin',
          locationProfileId: 'profile-1',
          locationStatus: status,
          ...emptyPhysicalAddress,
          capacityQty: 10,
          capacityVolume: null,
          capacityWeight: null,
          palletSlot: null,
          temperatureClass: 'Ambient',
          dgCompatibilityGroup: null,
          bondedFlag: false,
          ownerRestriction: null,
          mixSkuPolicy: 'SingleSku',
          mixLotPolicy: null,
          mixOwnerPolicy: null,
          pickSequence: index + 1,
          putawaySequence: index + 1,
          sourceSystem: null,
          referenceId: null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          createdBy: null,
          updatedBy: null,
        },
        children: [],
      }),
    );
    const baseSite = tree[0];
    const baseWarehouse = baseSite?.children[0];
    const baseZone = baseWarehouse?.children[0];
    if (!baseSite || !baseWarehouse || !baseZone) throw new Error('Missing base location tree fixture');

    const statusTree: SiteLocationTree[] = [
      {
        ...baseSite,
        children: [
          {
            ...baseWarehouse,
            children: [
              {
                ...baseZone,
                children: statusLocations,
              },
            ],
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <WarehouseMapPanel nodes={statusTree} selectedNode={tree[0]?.children[0] ?? null} onSelect={() => undefined} />,
    );

    expect(html).toContain('Hoạt động');
    expect(html).toContain('Không hoạt động');
    expect(html).toContain('Bị khóa');
    expect(html).toContain('Bảo trì');
    expect(html).not.toContain('Giữ/chặn');
  });

  it('keeps an explicitly selected empty site scoped instead of showing another site map', () => {
    const multiSiteTree: SiteLocationTree[] = [
      ...tree,
      {
        id: 'site-2',
        type: 'site',
        label: 'SITE-02 - Second Site',
        status: 'Active',
        entity: {
          id: 'site-2',
          siteCode: 'SITE-02',
          siteName: 'Second Site',
          status: 'Active',
          sourceSystem: null,
          referenceId: null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          createdBy: null,
          updatedBy: null,
        },
        children: [
          {
            id: 'wh-2',
            type: 'warehouse',
            label: 'WH-02 - Cold Warehouse',
            status: 'Active',
            entity: {
              id: 'wh-2',
              siteId: 'site-2',
              warehouseCode: 'WH-02',
              warehouseName: 'Cold Warehouse',
              warehouseTypeCode: 'WT-05',
              status: 'Active',
              timezone: 'Asia/Bangkok',
              sourceSystem: null,
              referenceId: null,
              createdAt: profile.createdAt,
              updatedAt: profile.updatedAt,
              createdBy: null,
              updatedBy: null,
            },
            children: [],
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <WarehouseMapPanel
        nodes={multiSiteTree}
        selectedNode={multiSiteTree[1] ?? null}
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain('WH-02 - Cold Warehouse');
    expect(html).toContain('Kho này chưa có khu vực');
    expect(html).not.toContain('Khu ZONE-A · Ambient Zone');
    expect(html).not.toContain('Khu này chưa có vị trí con để xem chi tiết');
  });

  it('respects an explicitly selected empty warehouse from the flat warehouse selector', () => {
    const emptyWarehouse: SiteLocationTree = {
      id: 'wh-empty',
      type: 'warehouse',
      label: 'WH-EMPTY - Empty Warehouse',
      status: 'Active',
      entity: {
        id: 'wh-empty',
        siteId: 'site-1',
        warehouseCode: 'WH-EMPTY',
        warehouseName: 'Empty Warehouse',
        warehouseTypeCode: 'WT-01',
        status: 'Active',
        timezone: 'Asia/Bangkok',
        sourceSystem: null,
        referenceId: null,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        createdBy: null,
        updatedBy: null,
      },
      children: [],
    };
    const baseSite = tree[0];
    const baseWarehouse = baseSite?.children[0];
    if (!baseSite || !baseWarehouse) throw new Error('Missing base location tree fixture');

    const mixedTree: SiteLocationTree[] = [
      {
        ...baseSite,
        children: [emptyWarehouse, baseWarehouse],
      },
    ];

    const html = renderToStaticMarkup(
      <WarehouseMapPanel nodes={mixedTree} selectedNode={emptyWarehouse} onSelect={() => undefined} />,
    );

    expect(html).toContain('WH-EMPTY - Empty Warehouse');
    expect(html).toContain('Kho này chưa có khu vực');
    expect(html).not.toContain('Khu ZONE-A · Ambient Zone');
  });

  it('prefers a warehouse with physical structure when the selected site starts with an empty warehouse', () => {
    const baseSite = tree[0];
    const baseWarehouse = baseSite?.children[0];
    if (!baseSite || !baseWarehouse) throw new Error('Missing base location tree fixture');
    if (baseWarehouse.type !== 'warehouse') throw new Error('Expected warehouse fixture');

    const emptyWarehouse: SiteLocationTree = {
      ...baseWarehouse,
      id: 'wh-empty',
      label: 'WH-EMPTY - Empty Warehouse',
      entity: {
        ...baseWarehouse.entity,
        id: 'wh-empty',
        warehouseCode: 'WH-EMPTY',
        warehouseName: 'Empty Warehouse',
      },
      children: [],
    };
    const structuredWarehouse: SiteLocationTree = {
      ...baseWarehouse,
      id: 'wh-structured',
      label: 'WH-STRUCT - Structured Warehouse',
      entity: {
        ...baseWarehouse.entity,
        id: 'wh-structured',
        warehouseCode: 'WH-STRUCT',
        warehouseName: 'Structured Warehouse',
      },
    };
    const siteWithEmptyFirst: SiteLocationTree[] = [
      {
        ...baseSite,
        children: [emptyWarehouse, structuredWarehouse],
      },
    ];

    const html = renderToStaticMarkup(
      <WarehouseMapPanel nodes={siteWithEmptyFirst} selectedNode={baseSite} onSelect={() => undefined} />,
    );

    expect(html).toContain('WH-STRUCT - Structured Warehouse');
    expect(html).toContain('WH-EMPTY - Empty Warehouse');
    expect(html).toContain('Khu ZONE-A · Ambient Zone');
    expect(html).not.toContain('Kho này chưa có khu vực');
  });

  it('allows returning to the warehouse detail when only one warehouse exists', () => {
    const baseWarehouse = tree[0]?.children[0];
    const baseZone = baseWarehouse?.children[0];
    if (!baseWarehouse || !baseZone) throw new Error('Missing base warehouse fixture');
    const onSelect = vi.fn();
    render(<WarehouseMapPanel nodes={tree} selectedNode={baseZone} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chọn kho' }));

    expect(onSelect).toHaveBeenLastCalledWith(baseWarehouse);
  });

  it('keeps the selected location visible when it is outside the first preview page', () => {
    const locations = Array.from({ length: 13 }, (_, index): SiteLocationTree => {
      const sequence = String(index + 1).padStart(2, '0');

      return {
        id: `loc-${sequence}`,
        type: 'location',
        label: `A-01-${sequence} - Rack ${sequence}`,
        status: 'Active',
        entity: {
          id: `loc-${sequence}`,
          warehouseId: 'wh-1',
          zoneId: 'zone-1',
          parentLocationId: null,
          locationCode: `A-01-${sequence}`,
          locationName: `Rack ${sequence}`,
          locationType: 'Bin',
          locationProfileId: 'profile-1',
          locationStatus: 'Active',
          ...emptyPhysicalAddress,
          capacityQty: 100,
          capacityVolume: null,
          capacityWeight: null,
          palletSlot: null,
          temperatureClass: 'Ambient',
          dgCompatibilityGroup: null,
          bondedFlag: false,
          ownerRestriction: null,
          mixSkuPolicy: 'SingleSku',
          mixLotPolicy: null,
          mixOwnerPolicy: null,
          pickSequence: index + 1,
          putawaySequence: index + 1,
          sourceSystem: null,
          referenceId: null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          createdBy: null,
          updatedBy: null,
        },
        children: [],
      };
    });
    const selectedLocation = locations[12] ?? null;
    const baseSite = tree[0];
    const baseWarehouse = baseSite?.children[0];
    const baseZone = baseWarehouse?.children[0];
    if (!baseSite || !baseWarehouse || !baseZone) throw new Error('Missing base location tree fixture');

    const denseTree: SiteLocationTree[] = [
      {
        ...baseSite,
        children: [
          {
            ...baseWarehouse,
            children: [
              {
                ...baseZone,
                children: locations,
              },
            ],
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <WarehouseMapPanel nodes={denseTree} selectedNode={selectedLocation} onSelect={() => undefined} />,
    );

    expect(html).toContain('12/13 hiển thị');
    expect(html).toContain('A-01-13 - Rack 13');
    expect(html).not.toContain('Giữ/chặn');
  });

  it('renders location detail with profile constraints and read-only state', () => {
    const html = renderToStaticMarkup(
      <SiteLocationDetailPanel
        selectedNode={tree[0]?.children[0]?.children[0]?.children[0] ?? null}
        locationProfiles={[profile]}
        canEdit={false}
      />,
    );

    expect(html).toContain('A-01-01');
    expect(html).toContain('Chỉ đọc');
    expect(html).toContain('BIN-STD');
    expect(html).toContain('Mã hệ thống');
    expect(html).toContain('Mã vị trí');
    expect(html).toContain('Tên vị trí');
    expect(html).toContain('Loại vị trí');
    expect(html).toContain('Hồ sơ vị trí');
    expect(html).toContain('Vị trí');
    expect(html).toContain('chính sách sức chứa');
    expect(html).toContain('chính sách trộn');
    expect(html).toContain('chính sách vận hành');
    expect(html).not.toContain('>Code<');
    expect(html).not.toContain('>Name<');
    expect(html).not.toContain('>Type<');
    expect(html).not.toContain('>Profile<');
    expect(html).not.toContain('Kệ/Shelf');
    expect(html).not.toContain('Ô/bin');
  });

  it('renders physical address inputs in the location form', () => {
    const locationNode = tree[0]?.children[0]?.children[0]?.children[0] ?? null;
    if (!locationNode || locationNode.type !== 'location') throw new Error('Missing base location fixture');

    render(
      <MemoryRouter>
        <LocationForm
          initialValue={{
            ...locationNode.entity,
            aisleCode: 'A01',
            rackCode: 'R01',
            levelCode: 'L01',
            binCode: 'B01',
          }}
          locationProfiles={[profile]}
          submitLabel="Lưu"
          onSubmit={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Thông tin cơ bản')).not.toBeNull();
    expect(screen.getByText('Địa chỉ vật lý')).not.toBeNull();
    expect(screen.getByLabelText('Dãy')).toHaveProperty('value', 'A01');
    expect(screen.getByLabelText('Kệ')).toHaveProperty('value', 'R01');
    expect(screen.getByLabelText('Tầng')).toHaveProperty('value', 'L01');
    expect(screen.getByLabelText('Ô')).toHaveProperty('value', 'B01');
  });

  it('maps each status to a distinct badge variant', () => {
    expect(masterDataStatusVariant('Active')).toBe('success');
    expect(masterDataStatusVariant('Inactive')).toBe('secondary');
    expect(masterDataStatusVariant('Blocked')).toBe('warning');
    expect(masterDataStatusVariant('Maintenance')).toBe('warning');
  });

  it('renders the create form inside the empty state so the first Site can be created', () => {
    const html = renderToStaticMarkup(
      <SiteLocationTreePageView
        mode="master"
        state="empty"
        nodes={[]}
        selectedNode={null}
        locationProfiles={[]}
        canCreate
        canEdit
        formPanel={<div>EMPTY_STATE_FORM_PANEL</div>}
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain('EMPTY_STATE_FORM_PANEL');
  });

  it('does not render the legacy tree panel in the ready page view', () => {
    render(
      <MemoryRouter>
        <SiteLocationTreePageView
          state="ready"
          nodes={tree}
          selectedNode={tree[0]?.children[0] ?? null}
          locationProfiles={[profile]}
          canCreate
          canEdit
          formPanel={<div>READY_FORM_PANEL</div>}
          onSelect={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Cây kho và vị trí')).toBeNull();
    expect(screen.queryByRole('tree', { name: /Cây kho và vị trí/i })).toBeNull();
    expect(screen.getByText('Sơ đồ kho tổng')).not.toBeNull();
    expect(screen.getByText('WH-01 - Tier 1 Warehouse')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Cấu hình vật lý' })).toBeNull();
    expect(screen.queryByText('READY_FORM_PANEL')).toBeNull();
  });

  it('registers a dedicated warehouse map detail route', () => {
    expect(ROUTES.FOUNDATION.LOCATION_MAP()).toBe('/foundation/locations/:warehouseId/map');
    expect(ROUTES.FOUNDATION.LOCATION_MAP('wh 1')).toBe('/foundation/locations/wh%201/map');
    expect(ROUTES.FOUNDATION.WAREHOUSE_TYPES).toBe('/foundation/warehouse-types');
    expect(masterDataRoutes.map((route) => route.path)).toContain(
      ROUTES.FOUNDATION.LOCATION_MAP(),
    );
    expect(masterDataRoutes.map((route) => route.path)).toContain(ROUTES.FOUNDATION.SITES);
    expect(masterDataRoutes.map((route) => route.path)).toContain(ROUTES.FOUNDATION.ZONES);
    expect(masterDataRoutes.map((route) => route.path)).toContain(ROUTES.FOUNDATION.PHYSICAL_LOCATIONS);
    expect(masterDataRoutes.map((route) => route.path)).toContain(ROUTES.FOUNDATION.WAREHOUSE_TYPES);
  });

  it('builds warehouse type dropdown options while preserving a legacy current value', () => {
    const options = buildWarehouseTypeOptions(
      [{ warehouseTypeCode: 'WT-01', warehouseTypeName: 'Kho thường' }],
      'DC',
    );

    expect(options[0]).toEqual({
      value: 'DC',
      label: 'DC (giá trị hiện tại)',
      unavailable: true,
    });
    expect(options[1]).toEqual({
      value: 'WT-01',
      label: 'WT-01 - Kho thường',
      unavailable: false,
    });
  });

  it('does not invent a warehouse type option when the catalog is empty', () => {
    expect(buildWarehouseTypeOptions([], null)).toEqual([]);
  });

  it('renders warehouse type select from catalog and keeps legacy current value visible', () => {
    const warehouseNode = tree[0]?.children[0];
    if (!warehouseNode || warehouseNode.type !== 'warehouse') throw new Error('Missing warehouse fixture');

    render(
      <WarehouseForm
        initialValue={{
          ...warehouseNode.entity,
          warehouseTypeCode: 'DC',
        }}
        warehouseTypes={[
          {
            id: 'wt-1',
            warehouseTypeCode: 'WT-01',
            warehouseTypeName: 'Kho thường',
            description: null,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
            createdBy: null,
            updatedBy: null,
          },
        ]}
        submitLabel="Cập nhật kho"
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByText('DC (giá trị hiện tại)')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Loại kho'));
    expect(screen.getByRole('option', { name: 'WT-01 - Kho thường' })).toBeTruthy();
  });

  it('blocks warehouse create submit when warehouse type catalog has no active option', () => {
    render(
      <WarehouseForm
        siteId="site-1"
        warehouseTypes={[]}
        submitLabel="Tạo kho"
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByText('Chưa có loại kho đang hoạt động')).toBeTruthy();
    expect(screen.getByText('Tải hoặc tạo loại kho đang hoạt động trước khi lưu kho.')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Tạo kho' }).disabled).toBe(true);
  });

  it('renders the warehouse master list with site filter and map action', () => {
    render(
      <MemoryRouter>
        <SiteLocationTreePageView
          mode="master"
          state="ready"
          nodes={tree}
          selectedNode={null}
          locationProfiles={[profile]}
          canCreate
          canEdit
          createSitePanel={<div>CREATE_SITE_FORM</div>}
          createWarehousePanel={<div>CREATE_WAREHOUSE_FORM</div>}
          onSelect={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Danh sách kho' })).not.toBeNull();
    expect(screen.getByLabelText('Lọc site')).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Mã kho' })).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Hành động' })).not.toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Action' })).toBeNull();
    expect(screen.getAllByText('WH-01')).not.toHaveLength(0);
    expect(screen.getAllByText('Tier 1 Warehouse')).not.toHaveLength(0);

    const mapLink = screen.getAllByRole('link', { name: 'Sơ đồ kho WH-01' })[0];
    if (!mapLink) throw new Error('Missing warehouse map action');
    expect(mapLink.getAttribute('href')).toBe('/foundation/locations/wh-1/map');
    expect(screen.queryByText(/tồn kho/i)).toBeNull();
  });

  it('keeps legacy physical address values visible when editing from the physical location table without persisting fallback on no-op submit', async () => {
    const mutations = mockMasterDataMutations();
    const legacyTree = JSON.parse(JSON.stringify(tree)) as SiteLocationTree[];
    const legacyLocation = legacyTree[0]?.children[0]?.children[0]?.children[0];
    if (legacyLocation?.type !== 'location') {
      throw new Error('Expected location fixture');
    }
    legacyLocation.label = 'A-01-02-03-04 - Legacy location';
    legacyLocation.entity = {
      ...legacyLocation.entity,
      locationCode: 'A-01-02-03-04',
      locationName: 'Legacy location',
      aisleCode: null,
      rackCode: null,
      levelCode: null,
      binCode: null,
      pickSequence: null,
      putawaySequence: null,
    };
    physicalCatalogMocks.useSiteLocationTree.mockReturnValue({
      data: legacyTree,
      isLoading: false,
      error: null,
    });
    physicalCatalogMocks.useMasterDataMutations.mockReturnValue(mutations);

    render(
      <MemoryRouter>
        <PhysicalStructureCatalogPage mode="locations" />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('cell', { name: '01' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: '02' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: '03' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('cell', { name: '04' }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Cập nhật vị trí vật lý' });
    expect(within(dialog).getByLabelText('Dãy')).toHaveProperty('value', '01');
    expect(within(dialog).getByLabelText('Kệ')).toHaveProperty('value', '02');
    expect(within(dialog).getByLabelText('Tầng')).toHaveProperty('value', '03');
    expect(within(dialog).getByLabelText('Ô')).toHaveProperty('value', '04');

    fireEvent.click(within(dialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: 'RC-MD-CREATE - Thay đổi master data' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cập nhật vị trí' }));

    await waitFor(() => expect(mutations.updateLocation.mutate).toHaveBeenCalledTimes(1));
    const submitted = mutations.updateLocation.mutate.mock.calls[0]?.[0] as {
      id: string;
      input: {
        aisleCode?: string | null;
        rackCode?: string | null;
        levelCode?: string | null;
        binCode?: string | null;
        reasonCode?: string | null;
      };
    };
    expect(submitted.id).toBe('loc-1');
    expect(submitted.input.aisleCode).toBeUndefined();
    expect(submitted.input.rackCode).toBeUndefined();
    expect(submitted.input.levelCode).toBeUndefined();
    expect(submitted.input.binCode).toBeUndefined();
    expect(submitted.input.reasonCode).toBe('RC-MD-CREATE');
  });

  it('preserves unchanged explicit physical address values on no-op edit submit', async () => {
    const mutations = mockMasterDataMutations();
    const explicitTree = JSON.parse(JSON.stringify(tree)) as SiteLocationTree[];
    const explicitLocation = explicitTree[0]?.children[0]?.children[0]?.children[0];
    if (explicitLocation?.type !== 'location') {
      throw new Error('Expected location fixture');
    }
    explicitLocation.entity = {
      ...explicitLocation.entity,
      aisleCode: ' A01 ',
      rackCode: ' R01 ',
      levelCode: ' L01 ',
      binCode: ' B01 ',
    };
    physicalCatalogMocks.useSiteLocationTree.mockReturnValue({
      data: explicitTree,
      isLoading: false,
      error: null,
    });
    physicalCatalogMocks.useMasterDataMutations.mockReturnValue(mutations);

    render(
      <MemoryRouter>
        <PhysicalStructureCatalogPage mode="locations" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Cập nhật vị trí vật lý' });
    expect(within(dialog).getByLabelText('Dãy')).toHaveProperty('value', 'A01');
    expect(within(dialog).getByLabelText('Kệ')).toHaveProperty('value', 'R01');
    expect(within(dialog).getByLabelText('Tầng')).toHaveProperty('value', 'L01');
    expect(within(dialog).getByLabelText('Ô')).toHaveProperty('value', 'B01');

    fireEvent.click(within(dialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: 'RC-MD-CREATE - Thay đổi master data' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cập nhật vị trí' }));

    await waitFor(() => expect(mutations.updateLocation.mutate).toHaveBeenCalledTimes(1));
    const submitted = mutations.updateLocation.mutate.mock.calls[0]?.[0] as {
      input: {
        aisleCode?: string | null;
        rackCode?: string | null;
        levelCode?: string | null;
        binCode?: string | null;
      };
    };
    expect(submitted.input.aisleCode).toBe(' A01 ');
    expect(submitted.input.rackCode).toBe(' R01 ');
    expect(submitted.input.levelCode).toBe(' L01 ');
    expect(submitted.input.binCode).toBe(' B01 ');
  });

  it('uses legacy physical address fallback in the detail panel', () => {
    const legacyTree = JSON.parse(JSON.stringify(tree)) as SiteLocationTree[];
    const legacyLocation = legacyTree[0]?.children[0]?.children[0]?.children[0];
    if (legacyLocation?.type !== 'location') {
      throw new Error('Expected location fixture');
    }
    legacyLocation.entity = {
      ...legacyLocation.entity,
      locationCode: 'A-11-22-33-44',
      aisleCode: null,
      rackCode: null,
      levelCode: null,
      binCode: null,
      pickSequence: null,
      putawaySequence: null,
    };

    render(<SiteLocationDetailPanel selectedNode={legacyLocation} locationProfiles={[profile]} canEdit />);

    expect(screen.getByText('Dãy')).not.toBeNull();
    expect(screen.getByText('Kệ')).not.toBeNull();
    expect(screen.getByText('Tầng')).not.toBeNull();
    expect(screen.getByText('Ô')).not.toBeNull();
    expect(screen.getAllByText('11').length).toBeGreaterThan(0);
    expect(screen.getAllByText('22').length).toBeGreaterThan(0);
    expect(screen.getAllByText('33').length).toBeGreaterThan(0);
    expect(screen.getAllByText('44').length).toBeGreaterThan(0);
  });

  it('uses putaway sequence fallback when pick sequence is zero', () => {
    const legacyTree = JSON.parse(JSON.stringify(tree)) as SiteLocationTree[];
    const legacyLocation = legacyTree[0]?.children[0]?.children[0]?.children[0];
    if (legacyLocation?.type !== 'location') {
      throw new Error('Expected location fixture');
    }
    legacyLocation.entity = {
      ...legacyLocation.entity,
      locationCode: 'LEGACY',
      aisleCode: null,
      rackCode: null,
      levelCode: null,
      binCode: null,
      pickSequence: 0,
      putawaySequence: 7,
    };

    render(<SiteLocationDetailPanel selectedNode={legacyLocation} locationProfiles={[profile]} canEdit />);

    expect(screen.getAllByText('07').length).toBeGreaterThanOrEqual(2);
  });

  it('surfaces missing active location profile setup before creating physical locations', () => {
    physicalCatalogMocks.useLocationProfiles.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <PhysicalStructureCatalogPage mode="locations" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Thiếu hồ sơ vị trí đang hoạt động')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Quản lý hồ sơ vị trí' }).getAttribute('href')).toBe(
      '/foundation/location-profiles',
    );
    expect(screen.queryByRole('button', { name: 'Tạo vị trí vật lý' })).toBeNull();
  });

  it('surfaces active location profile query errors before creating physical locations', () => {
    physicalCatalogMocks.useLocationProfiles.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('profile query failed'),
    });

    render(
      <MemoryRouter>
        <PhysicalStructureCatalogPage mode="locations" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Không thể tải hồ sơ vị trí')).not.toBeNull();
    expect(screen.getByText('Không thể tải danh sách hồ sơ vị trí đang hoạt động.')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Mở danh mục hồ sơ vị trí' }).getAttribute('href')).toBe(
      '/foundation/location-profiles',
    );
    expect(screen.queryByRole('button', { name: 'Tạo vị trí vật lý' })).toBeNull();
  });

  it('uses selected parent scope when explaining empty warehouse setup', () => {
    const scopedTree = [
      ...tree,
      {
        id: 'site-2',
        type: 'site' as const,
        label: 'SITE-02 - Empty Site',
        status: 'Active' as const,
        entity: {
          id: 'site-2',
          siteCode: 'SITE-02',
          siteName: 'Empty Site',
          status: 'Active' as const,
          sourceSystem: null,
          referenceId: null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
          createdBy: null,
          updatedBy: null,
        },
        children: [],
      },
    ];
    physicalCatalogMocks.useSiteLocationTree.mockReturnValue({
      data: scopedTree,
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <WarehouseMasterPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText('Site'));
    fireEvent.click(screen.getByRole('option', { name: /SITE-02/ }));

    expect(screen.getByText('Tạo kho đầu tiên cho site đang chọn.')).not.toBeNull();
  });

  it('localizes physical structure location headers and avoids English action/profile labels', () => {
    render(
      <MemoryRouter>
        <PhysicalStructureCatalogPage mode="locations" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('columnheader', { name: 'Kệ' })).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Ô' })).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Hồ sơ vị trí' })).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Hành động' })).not.toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Kệ/Shelf' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Ô/bin' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Profile' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Action' })).toBeNull();
  });

  it('keeps master filter controls constrained so the site select cannot overlap search', () => {
    render(
      <MemoryRouter>
        <SiteLocationTreePageView
          mode="master"
          state="ready"
          nodes={tree}
          selectedNode={null}
          locationProfiles={[profile]}
          canCreate
          canEdit
          createSitePanel={<div>CREATE_SITE_FORM</div>}
          createWarehousePanel={<div>CREATE_WAREHOUSE_FORM</div>}
          onSelect={() => undefined}
        />
      </MemoryRouter>,
    );

    const siteSelect = screen.getByLabelText('Lọc site');
    const searchInput = screen.getByPlaceholderText('Mã hoặc tên kho');

    expect(siteSelect.className).toContain('min-w-0');
    expect(siteSelect.className).toContain('w-full');
    expect(siteSelect.closest('label')?.className).toContain('min-w-0');
    expect(searchInput.className).toContain('min-w-0');
    expect(searchInput.closest('label')?.className).toContain('min-w-0');
  });

  it('opens create site and warehouse modals from the master list', () => {
    render(
      <MemoryRouter>
        <SiteLocationTreePageView
          mode="master"
          state="ready"
          nodes={tree}
          selectedNode={null}
          locationProfiles={[profile]}
          canCreate
          canEdit
          createSitePanel={<div>CREATE_SITE_FORM</div>}
          createWarehousePanel={<div>CREATE_WAREHOUSE_FORM</div>}
          onSelect={() => undefined}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tạo site' }));
    expect(screen.getByRole('dialog', { name: 'Tạo site' })).not.toBeNull();
    expect(screen.getByText('CREATE_SITE_FORM')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tạo kho' }));
    expect(screen.getByRole('dialog', { name: 'Tạo kho' })).not.toBeNull();
    expect(screen.getByText('CREATE_WAREHOUSE_FORM')).not.toBeNull();
  });

  it('renders the detail map with a back action to the warehouse master list', () => {
    render(
      <MemoryRouter>
        <SiteLocationTreePageView
          mode="detail"
          state="ready"
          nodes={tree}
          selectedNode={tree[0]?.children[0] ?? null}
          locationProfiles={[profile]}
          canCreate
          canEdit
          formPanel={<div>DETAIL_FORM_PANEL</div>}
          onSelect={() => undefined}
        />
      </MemoryRouter>,
    );

    const backLink = screen.getByRole('link', { name: 'Quay lại danh sách kho' });
    expect(backLink.getAttribute('href')).toBe('/foundation/locations');
    expect(screen.getByLabelText('Sơ đồ cấu trúc kho chi tiết')).not.toBeNull();
    expect(screen.getByText('Sơ đồ kho tổng')).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Cấu hình vật lý' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Mã vị trí' })).toBeNull();
    expect(screen.queryByText('DETAIL_FORM_PANEL')).toBeNull();
    expect(screen.queryByText(/tồn kho/i)).toBeNull();
  });

  it('keeps the warehouse map read-only even when a location is selected', () => {
    render(
      <MemoryRouter>
        <SiteLocationTreePageView
          mode="detail"
          state="ready"
          nodes={tree}
          selectedNode={tree[0]?.children[0]?.children[0]?.children[0] ?? null}
          locationProfiles={[profile]}
          canCreate
          canEdit
          formPanel={<div>DETAIL_FORM_PANEL</div>}
          onSelect={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('DETAIL_FORM_PANEL')).toBeNull();
  });

  it('disables the submit button while a mutation is pending', () => {
    const idle = renderToStaticMarkup(
      <SiteForm submitLabel="Tạo site" onSubmit={() => undefined} />,
    );
    const pending = renderToStaticMarkup(
      <SiteForm submitLabel="Tạo site" pending onSubmit={() => undefined} />,
    );

    expect(idle).not.toContain('disabled=""');
    expect(pending).toContain('disabled=""');
  });

  it('renders loading, empty, API error, and permission denied states', () => {
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <SiteLocationTreePageView
            state="loading"
            nodes={[]}
            selectedNode={null}
            locationProfiles={[]}
            canCreate
            canEdit
            onSelect={() => undefined}
          />
        </MemoryRouter>,
      ),
    ).toContain('Đang tải sơ đồ site và vị trí');
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <SiteLocationTreePageView
            state="empty"
            nodes={[]}
            selectedNode={null}
            locationProfiles={[]}
            canCreate
            canEdit
            onSelect={() => undefined}
          />
        </MemoryRouter>,
      ),
    ).toContain('Chưa có cấu trúc kho');
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <SiteLocationTreePageView
            state="empty"
            nodes={[]}
            selectedNode={null}
            locationProfiles={[]}
            canCreate
            canEdit
            onSelect={() => undefined}
          />
        </MemoryRouter>,
      ),
    ).toContain('Về danh sách kho');
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <SiteLocationTreePageView
            state="error"
            errorMessage="Backend unavailable"
            nodes={[]}
            selectedNode={null}
            locationProfiles={[]}
            canCreate={false}
            canEdit={false}
            onSelect={() => undefined}
          />
        </MemoryRouter>,
      ),
    ).toContain('Backend unavailable');
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <SiteLocationTreePageView
            state="denied"
            nodes={[]}
            selectedNode={null}
            locationProfiles={[]}
            canCreate={false}
            canEdit={false}
            onSelect={() => undefined}
          />
        </MemoryRouter>,
      ),
    ).toContain('Không có quyền');
  });

  it('flags an assigned profile that is not in the active list instead of a generic empty message', () => {
    const locationNode = tree[0]?.children[0]?.children[0]?.children[0] ?? null;

    const html = renderToStaticMarkup(
      <SiteLocationDetailPanel selectedNode={locationNode} locationProfiles={[]} canEdit />,
    );

    // The location references 'profile-1' but no active profile matches it.
    expect(html).toContain('không nằm trong danh sách hoạt động');
    expect(html).not.toContain('Không tìm thấy hồ sơ vị trí phù hợp');
  });

  it('keeps the manage-profile link visible when no active profile exists', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <LocationForm
          warehouseId="wh-1"
          zoneId="zone-1"
          locationProfiles={[]}
          submitLabel="Thêm vị trí"
          onSubmit={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('/foundation/location-profiles');
    expect(html).toContain('Quản lý hồ sơ');
  });
});
