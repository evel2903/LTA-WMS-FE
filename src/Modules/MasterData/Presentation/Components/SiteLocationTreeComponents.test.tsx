import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { EntityTree } from '@modules/MasterData/Presentation/Components/EntityTree';
import { SiteLocationDetailPanel } from '@modules/MasterData/Presentation/Components/SiteLocationDetailPanel';
import { masterDataStatusVariant } from '@modules/MasterData/Presentation/Components/MasterDataStatusVariant';
import { SiteForm } from '@modules/MasterData/Presentation/Forms/SiteForm';
import { LocationForm } from '@modules/MasterData/Presentation/Forms/LocationForm';
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
    expect(html).toContain('chính sách sức chứa');
    expect(html).toContain('chính sách trộn');
    expect(html).toContain('chính sách vận hành');
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
        <SiteLocationTreePageView
          state="loading"
          nodes={[]}
          selectedNode={null}
          locationProfiles={[]}
          canCreate
          canEdit
          onSelect={() => undefined}
        />,
      ),
    ).toContain('Đang tải cây site và vị trí');
    expect(
      renderToStaticMarkup(
        <SiteLocationTreePageView
          state="empty"
          nodes={[]}
          selectedNode={null}
          locationProfiles={[]}
          canCreate
          canEdit
          onSelect={() => undefined}
        />,
      ),
    ).toContain('Tạo site');
    expect(
      renderToStaticMarkup(
        <SiteLocationTreePageView
          state="error"
          errorMessage="Backend unavailable"
          nodes={[]}
          selectedNode={null}
          locationProfiles={[]}
          canCreate={false}
          canEdit={false}
          onSelect={() => undefined}
        />,
      ),
    ).toContain('Backend unavailable');
    expect(
      renderToStaticMarkup(
        <SiteLocationTreePageView
          state="denied"
          nodes={[]}
          selectedNode={null}
          locationProfiles={[]}
          canCreate={false}
          canEdit={false}
          onSelect={() => undefined}
        />,
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
