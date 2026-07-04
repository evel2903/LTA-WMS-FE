// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  CreateLocationProfileInput,
  UpdateLocationProfileInput,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { MasterDataListFilter } from '@modules/MasterData/Domain/Types/MasterDataQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IMasterDataRepository }));
vi.mock('@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance', () => ({
  get masterDataRepository() {
    return repo.current;
  },
}));
const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [{ value: 'RC-MD-UPDATE', label: 'RC-MD-UPDATE - Cập nhật hồ sơ vị trí' }],
    isLoading: false,
    isError: false,
  })),
}));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

import { LocationProfileCatalogPage } from '@modules/MasterData/Presentation/Pages/LocationProfileCatalogPage';
import { LocationProfileDetailPage } from '@modules/MasterData/Presentation/Pages/LocationProfileDetailPage';

function page<T>(items: T[], pageNumber = 1, pageSize = 100): PaginatedResponse<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (pageNumber - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: pageNumber,
    pageSize,
    totalItems,
    totalPages,
  };
}

function makeProfile(overrides: Partial<LocationProfile> = {}): LocationProfile {
  return {
    id: 'profile-1',
    profileCode: 'BIN-STD',
    profileName: 'Standard Bin',
    locationType: 'Bin',
    version: 1,
    status: 'Active',
    capacityPolicy: {},
    eligibilityPolicy: {},
    mixPolicy: {},
    compliancePolicy: {},
    operationPolicy: {},
    sourceSystem: null,
    referenceId: null,
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

class FakeRepository implements Partial<IMasterDataRepository> {
  items: LocationProfile[];
  constructor(initial: LocationProfile[] = []) {
    this.items = initial;
  }

  listLocationProfiles = vi.fn((filter?: MasterDataListFilter) => {
    const status = filter?.status;
    const profileCode = filter?.profileCode?.toLowerCase();
    const locationType = filter?.locationType?.toLowerCase();
    const filtered = this.items.filter((item) => {
      if (status && item.status !== status) return false;
      if (profileCode && !item.profileCode.toLowerCase().includes(profileCode)) return false;
      if (locationType && !item.locationType.toLowerCase().includes(locationType)) return false;
      return true;
    });

    return Promise.resolve(page(filtered, filter?.page ?? 1, filter?.pageSize ?? 100));
  });

  getLocationProfile = vi.fn((id: string) =>
    Promise.resolve(this.items.find((item) => item.id === id) ?? this.items[0]),
  );

  createLocationProfile = vi.fn((input: CreateLocationProfileInput) => {
    const profile = makeProfile({
      id: `profile-${this.items.length + 1}`,
      profileCode: input.profileCode,
      profileName: input.profileName,
      locationType: input.locationType,
      status: input.status,
      capacityPolicy: input.capacityPolicy ?? {},
      eligibilityPolicy: input.eligibilityPolicy ?? {},
      mixPolicy: input.mixPolicy ?? {},
      compliancePolicy: input.compliancePolicy ?? {},
      operationPolicy: input.operationPolicy ?? {},
    });
    this.items = [profile, ...this.items];
    return Promise.resolve(profile);
  });

  updateLocationProfile = vi.fn((id: string, input: UpdateLocationProfileInput) => {
    const index = this.items.findIndex((item) => item.id === id);
    this.items[index] = {
      ...this.items[index],
      profileName: input.profileName ?? this.items[index].profileName,
      locationType: input.locationType ?? this.items[index].locationType,
      status: input.status ?? this.items[index].status,
      capacityPolicy: input.capacityPolicy ?? this.items[index].capacityPolicy,
      eligibilityPolicy: input.eligibilityPolicy ?? this.items[index].eligibilityPolicy,
      mixPolicy: input.mixPolicy ?? this.items[index].mixPolicy,
      compliancePolicy: input.compliancePolicy ?? this.items[index].compliancePolicy,
      operationPolicy: input.operationPolicy ?? this.items[index].operationPolicy,
      version: (input.version ?? this.items[index].version) + 1,
      updatedAt: '2026-06-21T01:00:00.000Z',
    };
    return Promise.resolve(this.items[index]);
  });
}

function renderPage(initialEntries: string[] = [ROUTES.FOUNDATION.LOCATION_PROFILES]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.LOCATION_PROFILES} element={<LocationProfileCatalogPage />} />
          <Route
            path={ROUTES.FOUNDATION.LOCATION_PROFILE_NEW}
            element={<LocationProfileDetailPage mode="create" />}
          />
          <Route
            path={ROUTES.FOUNDATION.LOCATION_PROFILE_DETAIL()}
            element={<LocationProfileDetailPage mode="detail" />}
          />
          <Route
            path={ROUTES.FOUNDATION.LOCATION_PROFILE_EDIT()}
            element={<LocationProfileDetailPage mode="edit" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  reasonCodeOptions.useReasonCodeOptions.mockClear();
});

describe('LocationProfileCatalogPage (A10)', () => {
  it('creates, edits, inactivates, and re-reads a location profile', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IMasterDataRepository;
    renderPage();

    await actor.click(await screen.findByRole('link', { name: 'Tạo hồ sơ' }));
    await actor.type(await screen.findByLabelText('Mã hồ sơ'), 'BIN-STD');
    await actor.type(screen.getByLabelText('Tên hồ sơ'), 'Standard Bin');
    await actor.type(screen.getByLabelText('Loại vị trí'), 'Bin');
    fireEvent.change(screen.getByLabelText('Chính sách sức chứa'), {
      target: { value: '{ "maxQty": 100 }' },
    });
    await actor.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

    await waitFor(() =>
      expect(fake.createLocationProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          profileCode: 'BIN-STD',
          profileName: 'Standard Bin',
          capacityPolicy: { maxQty: 100 },
        }),
      ),
    );
    await screen.findByRole('heading', { name: 'BIN-STD' });
    expect(screen.getByText('Phiên bản')).toBeTruthy();
    expect(screen.getAllByText('Chính sách sức chứa').length).toBeGreaterThan(0);
    expect(screen.queryByText('Capacity')).toBeNull();
    expect(screen.queryByLabelText('Capacity policy')).toBeNull();

    await actor.click(screen.getByRole('link', { name: 'Chỉnh sửa hồ sơ' }));
    const updateButton = await screen.findByRole('button', { name: 'Cập nhật hồ sơ' });
    const editForm = updateButton.closest('form') as HTMLFormElement;
    await actor.clear(within(editForm).getByLabelText('Tên hồ sơ'));
    await actor.type(within(editForm).getByLabelText('Tên hồ sơ'), 'Standard Bin Updated');
    await actor.click(updateButton);

    await waitFor(() =>
      expect(fake.updateLocationProfile).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({ profileName: 'Standard Bin Updated' }),
      ),
    );
    expect(await screen.findByDisplayValue('Standard Bin Updated')).toBeTruthy();

    await actor.click(screen.getByRole('link', { name: 'Chỉnh sửa hồ sơ' }));
    const refreshedUpdateButton = await screen.findByRole('button', { name: 'Cập nhật hồ sơ' });
    const refreshedForm = refreshedUpdateButton.closest('form') as HTMLFormElement;
    await actor.click(within(refreshedForm).getByRole('button', { name: 'Ngưng kích hoạt hồ sơ' }));

    await waitFor(() =>
      expect(fake.updateLocationProfile).toHaveBeenLastCalledWith(
        'profile-1',
        expect.objectContaining({ status: 'Inactive' }),
      ),
    );
    await waitFor(() => expect(screen.getAllByText('Không hoạt động').length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  it('renders the catalog with Vietnamese filters, status, and pagination copy', async () => {
    const fake = new FakeRepository([makeProfile()]);
    repo.current = fake as unknown as IMasterDataRepository;
    renderPage();

    expect((await screen.findAllByText('BIN-STD')).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('VD: BIN-STD')).toBeTruthy();
    expect(screen.getByPlaceholderText('VD: Ô chứa')).toBeTruthy();
    expect(screen.queryByPlaceholderText('e.g. BIN-STD')).toBeNull();
    expect(screen.queryByPlaceholderText('e.g. Bin')).toBeNull();
    expect(screen.getByText('Trang 1 / 1')).toBeTruthy();
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0);
    expect(screen.queryByText('Active')).toBeNull();
    expect(
      screen
        .getAllByRole('button', { name: /BIN-STD/ })
        .some((button) => button.className.includes('bg-card')),
    ).toBe(true);
  });

  it('shows first-run empty guidance with a create action before any location profile exists', async () => {
    const fake = new FakeRepository([]);
    repo.current = fake as unknown as IMasterDataRepository;
    renderPage();

    expect(await screen.findByText('Chưa có hồ sơ vị trí')).toBeTruthy();
    expect(screen.getByText('Tạo hồ sơ vị trí đầu tiên trước khi gán hồ sơ cho vị trí vật lý.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Tạo hồ sơ vị trí' }).getAttribute('href')).toBe(
      ROUTES.FOUNDATION.LOCATION_PROFILE_NEW,
    );
  });

  it('returns to a valid page instead of showing first-run empty when the current page exceeds total pages', async () => {
    const actor = userEvent.setup();
    const pageOneItems = Array.from({ length: 50 }, (_, index) =>
      makeProfile({
        id: `profile-${index}`,
        profileCode: `BIN-${String(index).padStart(3, '0')}`,
      }),
    );
    const remaining = makeProfile({ id: 'profile-remaining', profileCode: 'BIN-REMAINING' });
    let sawOutOfRangePage = false;
    const listLocationProfiles = vi.fn((filter?: MasterDataListFilter) => {
      if (filter?.page === 2) {
        sawOutOfRangePage = true;
        return Promise.resolve({
          items: [],
          page: 2,
          pageSize: MASTER_DATA_DEFAULT_PAGE_SIZE,
          totalItems: 1,
          totalPages: 1,
        });
      }

      return Promise.resolve(
        sawOutOfRangePage
          ? page([remaining], 1, MASTER_DATA_DEFAULT_PAGE_SIZE)
          : {
              items: pageOneItems,
              page: 1,
              pageSize: MASTER_DATA_DEFAULT_PAGE_SIZE,
              totalItems: 51,
              totalPages: 2,
            },
      );
    });
    repo.current = { listLocationProfiles } as unknown as IMasterDataRepository;
    renderPage();

    expect((await screen.findAllByText('BIN-000')).length).toBeGreaterThan(0);
    await actor.click(screen.getByRole('button', { name: 'Tiếp' }));

    await waitFor(() =>
      expect(listLocationProfiles.mock.calls.some(([filter]) => filter?.page === 2)).toBe(true),
    );
    await waitFor(() => expect(screen.getAllByText('BIN-REMAINING').length).toBeGreaterThan(0));
    expect(screen.queryByText('Chưa có hồ sơ vị trí')).toBeNull();
  });
});
