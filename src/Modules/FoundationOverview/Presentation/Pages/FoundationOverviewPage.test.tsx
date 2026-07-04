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
import type {
  ProfileChecklistItemStatus,
  WarehouseProfileChecklist,
} from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';

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

const duplicateProfile: WarehouseProfile = {
  ...profile,
  id: 'profile-2',
  profileCode: 'WP-DC-ALT',
  profileName: 'Alternate DC',
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
    {
      code: 'DEFAULT_PROFILE_FALLBACK',
      title: 'Default profile (type fallback)',
      status: 'PASS',
      message: 'An active fallback profile exists for warehouse type WT-05.',
      evidence: ['fallback'],
      deferredToStory: null,
    },
    {
      code: 'UNKNOWN_BACKEND_ITEM',
      title: 'Unexpected backend title',
      status: 'UNKNOWN' as ProfileChecklistItemStatus,
      message: 'Unexpected backend checklist detail.',
      evidence: ['unknown'],
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
  listProfiles = vi.fn(() => Promise.resolve(page([profile, duplicateProfile])));
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
    expect(screen.getByRole('heading', { name: 'Tổng quan nền tảng' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Tổng quan nền tảng danh sách' })).toBeTruthy();
    expect(screen.getAllByText('Thiếu cấu hình').length).toBeGreaterThan(0);
    expect(screen.queryByText('Missing')).toBeNull();
    expect(screen.getByText('WH-A')).toBeTruthy();
    expect(screen.getByText('WH-B')).toBeTruthy();
    expect(screen.getByText('WP-DC')).toBeTruthy();
    expect(screen.getByText('Checklist B7 đạt. Có 2 hồ sơ kho ACTIVE cùng khớp phạm vi.')).toBeTruthy();
    expect(screen.getByText('Seed mặc định hệ thống')).toBeTruthy();
    expect(screen.getByText('Seed mặc định đã sẵn sàng.')).toBeTruthy();
    expect(screen.getAllByText('Đạt').length).toBeGreaterThan(0);
    expect(screen.getByText('Hồ sơ mặc định theo loại kho')).toBeTruthy();
    expect(screen.getByText('Có hồ sơ fallback ACTIVE cho loại kho WT-05.')).toBeTruthy();
    expect(screen.getByText('Mục kiểm tra chưa định danh')).toBeTruthy();
    expect(screen.getByText('Không rõ')).toBeTruthy();
    expect(
      screen.getByText(
        'Thông báo kiểm tra chưa được chuẩn hóa tiếng Việt; cần kiểm tra chi tiết kỹ thuật của mục này.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Default system seed')).toBeNull();
    expect(screen.queryByText('Pass')).toBeNull();
    expect(screen.queryByText('An active fallback profile exists for warehouse type WT-05.')).toBeNull();
    expect(screen.queryByText('Unexpected backend title')).toBeNull();
    expect(screen.queryByText('Unexpected backend checklist detail.')).toBeNull();
    expect(screen.queryByText('UNKNOWN')).toBeNull();
    expect(screen.queryByText(/active profile/i)).toBeNull();
    expect(screen.queryByText(/scope/i)).toBeNull();
    expect(screen.getByText(/Chưa có hồ sơ kho ACTIVE/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tổng quan' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cấu trúc vật lý' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Sản phẩm và đóng gói' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Quy tắc và hồ sơ' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Quản trị và kiểm soát' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Danh mục site/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Kho và sơ đồ kho/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /SKU và quan hệ/i })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Cây site và vị trí/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Site catalog/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /SKU và relations/i })).toBeNull();
    expect(screen.getByRole('link', { name: /Hồ sơ kho/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Hàng đợi ngoại lệ/i })).toBeTruthy();
    expect(currentProfileRepository.getChecklist.mock.calls).toContainEqual(['profile-1']);
  });

  it('renders no-data scope as missing setup governance banner', async () => {
    const fake = new FakeMasterDataRepository();
    fake.listWarehouses = vi.fn(() => Promise.resolve(page([])));
    fake.listZones = vi.fn(() => Promise.resolve(page([])));
    fake.getLocationTree = vi.fn(() => Promise.resolve([]));
    masterRepo.current = fake as unknown as IMasterDataRepository;
    currentProfileRepository = new FakeWarehouseProfileRepository();
    currentProfileRepository.listProfiles = vi.fn(() => Promise.resolve(page([])));
    profileRepo.current = currentProfileRepository as unknown as IWarehouseProfileRepository;

    renderPage();

    expect(await screen.findByText('Thiếu phạm vi kho')).toBeTruthy();
    expect(
      screen.getByText(/Chưa có kho hoặc phạm vi chủ hàng hiển thị trong phạm vi hiện tại/i),
    ).toBeTruthy();
    expect(screen.queryByText(/scope/i)).toBeNull();
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
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
