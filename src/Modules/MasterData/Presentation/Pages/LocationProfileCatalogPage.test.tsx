// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
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

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 };
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
    return Promise.resolve(
      page(
        this.items.filter((item) => {
          if (status && item.status !== status) return false;
          if (profileCode && !item.profileCode.toLowerCase().includes(profileCode)) return false;
          if (locationType && !item.locationType.toLowerCase().includes(locationType)) return false;
          return true;
        }),
      ),
    );
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
    fireEvent.change(screen.getByLabelText('Capacity policy'), {
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
    await waitFor(() => expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});
