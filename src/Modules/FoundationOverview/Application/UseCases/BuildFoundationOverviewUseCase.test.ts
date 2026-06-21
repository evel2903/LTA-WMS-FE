import { describe, expect, it } from 'vitest';

import { BuildFoundationOverviewUseCase } from '@modules/FoundationOverview/Application/UseCases/BuildFoundationOverviewUseCase';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { WarehouseProfileChecklist } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';

const audit = {
  sourceSystem: 'SEED',
  referenceId: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

const tree: SiteLocationTree[] = [
  {
    id: 'site-1',
    type: 'site',
    label: 'SITE - Main',
    status: 'Active',
    entity: { id: 'site-1', siteCode: 'SITE', siteName: 'Main', status: 'Active', ...audit },
    children: [
      {
        id: 'wh-1',
        type: 'warehouse',
        label: 'WH-A - Main DC',
        status: 'Active',
        entity: {
          id: 'wh-1',
          siteId: 'site-1',
          warehouseCode: 'WH-A',
          warehouseName: 'Main DC',
          warehouseTypeCode: 'DC',
          status: 'Active',
          timezone: 'Asia/Bangkok',
          ...audit,
        },
        children: [
          {
            id: 'zone-1',
            type: 'zone',
            label: 'Z-A - Ambient',
            status: 'Active',
            entity: {
              id: 'zone-1',
              warehouseId: 'wh-1',
              zoneCode: 'Z-A',
              zoneName: 'Ambient',
              zoneType: 'AMBIENT',
              status: 'Active',
              sequence: 1,
              temperatureClass: null,
              complianceFlags: {},
              ...audit,
            },
            children: [
              {
                id: 'loc-1',
                type: 'location',
                label: 'L-A - Slot',
                status: 'Active',
                entity: {
                  id: 'loc-1',
                  warehouseId: 'wh-1',
                  zoneId: 'zone-1',
                  parentLocationId: null,
                  locationCode: 'L-A',
                  locationName: 'Slot',
                  locationType: 'PICK',
                  locationProfileId: 'lp-1',
                  locationStatus: 'Active',
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
                  ...audit,
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

const profile: WarehouseProfile = {
  id: 'profile-1',
  profileCode: 'WP-DC',
  profileName: 'Default DC',
  warehouseTypeCode: 'DC',
  version: 1,
  status: 'ACTIVE',
  warehouseId: 'wh-1',
  zoneId: null,
  locationType: null,
  ownerId: null,
  skuId: null,
  itemClass: null,
  orderType: null,
  customerId: null,
  supplierId: null,
  scopeKey: 'DC|wh-1',
  effectiveFrom: '2026-06-01T00:00:00.000Z',
  effectiveTo: null,
  capabilityFlags: {},
  strategyPolicy: {},
  thresholdPolicy: {},
  approvalPolicy: {},
  labelDevicePolicy: {},
  integrationPolicy: {},
  auditPolicy: {},
  ...audit,
};

const checklist: WarehouseProfileChecklist = {
  profileId: 'profile-1',
  warehouseTypeCode: 'DC',
  overallStatus: 'PASS',
  evaluatedAt: '2026-06-21T00:00:00.000Z',
  items: [
    {
      code: 'ACTIVE_PROFILE',
      title: 'Active profile',
      status: 'PASS',
      message: 'Active profile resolved.',
      evidence: ['profile-1'],
      deferredToStory: null,
    },
  ],
};

describe('BuildFoundationOverviewUseCase', () => {
  it('builds ready master-data and profile readiness from fixtures', () => {
    const result = new BuildFoundationOverviewUseCase().execute({
      locationTree: tree,
      activeProfiles: [profile],
      checklists: { [profile.id]: checklist },
    });

    expect(result.overallStatus).toBe('ready');
    expect(result.counts).toMatchObject({ sites: 1, warehouses: 1, zones: 1, locations: 1 });
    expect(result.warehouseProfileRows[0]).toMatchObject({
      warehouseCode: 'WH-A',
      activeProfileCode: 'WP-DC',
      status: 'ready',
    });
  });

  it('treats an empty scope as setup/scope warning instead of a system error', () => {
    const result = new BuildFoundationOverviewUseCase().execute({
      locationTree: [],
      activeProfiles: [],
      checklists: {},
    });

    expect(result.noDataScope).toBe(true);
    expect(result.overallStatus).toBe('missing');
    expect(result.warnings[0]).toMatch(/No warehouse\/owner scope assigned/);
    expect(result.masterDataRows.find((row) => row.key === 'warehouses')?.status).toBe('missing');
  });
});
