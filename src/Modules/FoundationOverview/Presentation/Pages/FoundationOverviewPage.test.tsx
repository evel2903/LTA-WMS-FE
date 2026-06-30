// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type {
  LocationTree,
  Site,
  Warehouse,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { WarehouseProfileChecklist } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';

const masterRepo = vi.hoisted(() => ({ current: null as unknown as IMasterDataRepository }));
const profileRepo = vi.hoisted(() => ({ current: null as unknown as IWarehouseProfileRepository }));

vi.mock('@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance', () => ({
  get masterDataRepository() {
    return masterRepo.current;
  },
}));

vi.mock(
  '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance',
  () => ({
    get warehouseProfileRepository() {
      return profileRepo.current;
    },
  }),
);

import { FoundationOverviewPage } from '@modules/FoundationOverview/Presentation/Pages/FoundationOverviewPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 };
}

const audit = {
  sourceSystem: 'SEED',
  referenceId: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

const site: Site = {
  id: 'site-1',
  siteCode: 'SITE',
  siteName: 'Main',
  status: 'Active',
  ...audit,
};

const warehouseReady: Warehouse = {
  id: 'wh-1',
  siteId: 'site-1',
  warehouseCode: 'WH-A',
  warehouseName: 'Main DC',
  warehouseTypeCode: 'DC',
  status: 'Active',
  timezone: 'Asia/Bangkok',
  ...audit,
};

const warehouseMissing: Warehouse = {
  ...warehouseReady,
  id: 'wh-2',
  warehouseCode: 'WH-B',
  warehouseName: 'Overflow DC',
};

const zone: Zone = {
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
};

const location: LocationTree = {
  id: 'loc-1',
  warehouseId: 'wh-1',
  zoneId: 'zone-1',
  parentLocationId: null,
  locationCode: 'L-A',
  locationName: 'Slot',
  locationType: 'PICK',
  locationProfileId: 'lp-1',
  locationStatus: 'Active',
  aisleCode: null,
  rackCode: null,
  levelCode: null,
  binCode: null,
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
  children: [],
  ...audit,
};

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
      code: 'DEFAULT_SYSTEM_SEED',
      title: 'Default system seed',
      status: 'PASS',
      message: 'Default seed is ready.',
      evidence: ['seed'],
      deferredToStory: null,
    },
  ],
};

class FakeMasterDataRepository implements Partial<IMasterDataRepository> {
  listSites = vi.fn(() => Promise.resolve(page([site])));
  listWarehouses = vi.fn(() => Promise.resolve(page([warehouseReady, warehouseMissing])));
  listZones = vi.fn(() => Promise.resolve(page([zone])));
  getLocationTree = vi.fn((filter: { warehouseId?: string }) =>
    Promise.resolve(filter.warehouseId === 'wh-1' ? [location] : []),
  );
}

class FakeWarehouseProfileRepository implements Partial<IWarehouseProfileRepository> {
  listProfiles = vi.fn(() => Promise.resolve(page([profile])));
  getChecklist = vi.fn(() => Promise.resolve(checklist));
}

let currentProfileRepository: FakeWarehouseProfileRepository;

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FoundationOverviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  masterRepo.current = new FakeMasterDataRepository() as unknown as IMasterDataRepository;
  currentProfileRepository = new FakeWarehouseProfileRepository();
  profileRepo.current = currentProfileRepository as unknown as IWarehouseProfileRepository;
});

afterEach(() => cleanup());

describe('FoundationOverviewPage (C17)', () => {
  it('renders readiness from fixtures with one ready warehouse and one missing setup (AC1/AC2/AC5)', async () => {
    renderPage();

    expect(await screen.findByText('Mức sẵn sàng dữ liệu chủ')).toBeTruthy();
    expect(screen.getByText('WH-A')).toBeTruthy();
    expect(screen.getByText('WH-B')).toBeTruthy();
    expect(screen.getByText('WP-DC')).toBeTruthy();
    expect(screen.getByText('Default system seed')).toBeTruthy();
    expect(screen.getByText(/No ACTIVE warehouse profile/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Hồ sơ kho/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Hàng đợi ngoại lệ/i })).toBeTruthy();
    expect(currentProfileRepository.getChecklist.mock.calls).toContainEqual(['profile-1']);
  });

  it('shows permission denied when a source read 403s (AC4)', async () => {
    const fake = new FakeMasterDataRepository();
    fake.listSites = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    masterRepo.current = fake as unknown as IMasterDataRepository;
    profileRepo.current =
      new FakeWarehouseProfileRepository() as unknown as IWarehouseProfileRepository;

    renderPage();

    expect((await screen.findAllByText(/không có quyền/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
