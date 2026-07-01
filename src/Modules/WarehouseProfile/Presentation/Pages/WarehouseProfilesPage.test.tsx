// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import type { RulePreview } from '@modules/WarehouseProfile/Domain/Entities/RulePreview';
import type { PaginatedResponse } from '@shared/Types/Api';

// The page consumes the module-level repository singleton through the Application
// hooks. Mock that single instance so the page renders against an in-memory fake
// (no httpClient). This is the only seam the Presentation layer reaches through.
const repo = vi.hoisted(() => ({ current: null as unknown as IWarehouseProfileRepository }));
vi.mock(
  '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance',
  () => ({
    get warehouseProfileRepository() {
      return repo.current;
    },
  }),
);
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@shared/Components/Ui/Toast', () => ({
  toast: { error: toastError },
}));
const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [
      { value: 'POLICY', label: 'POLICY - Kích hoạt chính sách' },
      { value: 'RETIRE', label: 'RETIRE - Ngưng áp dụng' },
    ],
    isLoading: false,
    isError: false,
  })),
}));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

import { WarehouseProfilesPage } from '@modules/WarehouseProfile/Presentation/Pages/WarehouseProfilesPage';
import { WarehouseProfileDetailPage } from '@modules/WarehouseProfile/Presentation/Pages/WarehouseProfileDetailPage';
import { useWarehouseProfileStore } from '@modules/WarehouseProfile/Application/Stores/WarehouseProfileStore';

const now = '2026-06-18T00:00:00.000Z';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 };
}

function makeProfile(overrides: Partial<WarehouseProfile> = {}): WarehouseProfile {
  return {
    id: 'profile-1',
    profileCode: 'WP-01',
    profileName: 'Default',
    warehouseTypeCode: 'DC',
    version: 1,
    status: 'DRAFT',
    scopeKey: 'DC',
    effectiveFrom: '2026-06-01',
    effectiveTo: null,
    warehouseId: null,
    zoneId: null,
    locationType: null,
    ownerId: null,
    skuId: null,
    itemClass: null,
    orderType: null,
    customerId: null,
    supplierId: null,
    capabilityFlags: {},
    strategyPolicy: {},
    thresholdPolicy: {},
    approvalPolicy: {},
    labelDevicePolicy: {},
    integrationPolicy: {},
    auditPolicy: {},
    sourceSystem: null,
    referenceId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

const emptyPreview: RulePreview = {
  winner: null,
  allowed: true,
  approvalRequired: false,
  controlMode: { mode: null, isHardBlock: false, approvalRequired: false, warning: null, suggestion: null },
  skippedRules: [],
  conflicts: [],
  reasonReadiness: null,
  actorContext: { actorUserId: null, action: null, objectType: null, objectId: null, reasonCode: null },
};

/** A fake repository whose stored profiles mutate, so list+detail re-fetches observe change. */
class FakeRepository implements Partial<IWarehouseProfileRepository> {
  profiles: WarehouseProfile[];
  constructor(initial: WarehouseProfile[]) {
    this.profiles = initial;
  }
  listProfiles = vi.fn((): Promise<PaginatedResponse<WarehouseProfile>> =>
    Promise.resolve(page(this.profiles)),
  );
  getProfile = vi.fn((id: string): Promise<WarehouseProfile> => {
    const found = this.profiles.find((p) => p.id === id);
    return found ? Promise.resolve(found) : Promise.reject(new Error('not found'));
  });
  activateProfile = vi.fn((id: string): Promise<WarehouseProfile> => {
    const idx = this.profiles.findIndex((p) => p.id === id);
    const activated: WarehouseProfile = { ...this.profiles[idx], status: 'ACTIVE' };
    this.profiles[idx] = activated;
    return Promise.resolve(activated);
  });
  deactivateProfile = vi.fn((id: string): Promise<WarehouseProfile> => {
    const idx = this.profiles.findIndex((p) => p.id === id);
    const retired: WarehouseProfile = { ...this.profiles[idx], status: 'RETIRED' };
    this.profiles[idx] = retired;
    return Promise.resolve(retired);
  });
  updateProfile = vi.fn((id: string) => Promise.resolve(this.profiles.find((p) => p.id === id)!));
  listAssignments = vi.fn(() => Promise.resolve(page([])));
  createAssignment = vi.fn();
  listProfileRules = vi.fn(() => Promise.resolve(page([])));
  listRuleDefinitions = vi.fn(() => Promise.resolve(page([])));
  addProfileRule = vi.fn();
  removeProfileRule = vi.fn(() => Promise.resolve());
  preview = vi.fn(() => Promise.resolve(emptyPreview));
}

function renderPage(initialPath = ROUTES.FOUNDATION.WAREHOUSE_PROFILES) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.WAREHOUSE_PROFILES} element={<WarehouseProfilesPage />} />
          <Route
            path={ROUTES.FOUNDATION.WAREHOUSE_PROFILE_NEW}
            element={<WarehouseProfileDetailPage mode="create" />}
          />
          <Route
            path={ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL()}
            element={<WarehouseProfileDetailPage mode="detail" />}
          />
          <Route
            path={ROUTES.FOUNDATION.WAREHOUSE_PROFILE_EDIT()}
            element={<WarehouseProfileDetailPage mode="edit" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // Reset module-local Zustand store between tests (selection must not leak).
  useWarehouseProfileStore.setState({
    selectedProfileId: null,
    statusFilter: 'ALL',
    warehouseTypeCodeFilter: '',
    page: 1,
  });
  toastError.mockClear();
  reasonCodeOptions.useReasonCodeOptions.mockClear();
});

afterEach(() => cleanup());

describe('WarehouseProfilesPage (AC5 states)', () => {
  it('shows the empty state when there are no profiles', async () => {
    repo.current = new FakeRepository([]) as unknown as IWarehouseProfileRepository;
    renderPage();
    expect(await screen.findByText('Chưa có hồ sơ.')).toBeTruthy();
  });

  it('shows a permission-denied state when the list 403s', async () => {
    const fake = new FakeRepository([]);
    fake.listProfiles = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
    );
    repo.current = fake as unknown as IWarehouseProfileRepository;
    renderPage();
    expect(await screen.findByText(/không có quyền/i)).toBeTruthy();
  });
});

describe('WarehouseProfilesPage detail refresh after activate (Finding #1)', () => {
  it('reflects the new ACTIVE status from the mounted detail query, even when the list row is stale', async () => {
    const user = userEvent.setup();
    // The bug was that the selected profile was a local snapshot never refreshed
    // after a mutation. To prove the FIX (a MOUNTED detail query keyed by id), the
    // fake's LIST stays frozen at DRAFT (an even staler source than the old local
    // snapshot) while only getProfile() returns the activated profile. The panel can
    // therefore only show ACTIVE if it reads from the invalidated detail query.
    const draft = makeProfile({ status: 'DRAFT' });
    let live: WarehouseProfile = draft;
    const fake = new FakeRepository([draft]);
    fake.listProfiles = vi.fn(() => Promise.resolve(page([draft]))); // frozen DRAFT row
    fake.getProfile = vi.fn((_id: string) => Promise.resolve(live));
    fake.activateProfile = vi.fn((_id: string) => {
      live = { ...draft, status: 'ACTIVE' };
      return Promise.resolve(live);
    });
    repo.current = fake as unknown as IWarehouseProfileRepository;
    renderPage();

    // Select the only profile row.
    await user.click(await screen.findByText('WP-01'));
    await user.click(await screen.findByRole('link', { name: 'Chỉnh sửa hồ sơ' }));

    // The lifecycle panel shows the detail; Activate is enabled for a DRAFT.
    const activate = await screen.findByRole('button', { name: 'Kích hoạt' });
    expect((activate as HTMLButtonElement).disabled).toBe(false);
    await user.click(activate);

    // After activation the lifecycle buttons must flip WITHOUT re-selecting the row:
    // Activate disabled + Deactivate enabled is reachable ONLY when the mounted detail
    // object reflects status === 'ACTIVE' (i.e. the panel refreshed — Finding #1).
    await waitFor(() => {
      const btn = screen.getByRole<HTMLButtonElement>('button', { name: 'Kích hoạt' });
      expect(btn.disabled).toBe(true);
    });
    const deactivate = screen.getByRole<HTMLButtonElement>('button', { name: 'Ngưng kích hoạt' });
    expect(deactivate.disabled).toBe(false);
  });
});

describe('WarehouseProfilesPage conflict routing (AC5)', () => {
  it('shows the 409 conflict in the dedicated conflict panel, not a toast', async () => {
    const user = userEvent.setup();
    const fake = new FakeRepository([makeProfile({ status: 'DRAFT' })]);
    fake.activateProfile = vi.fn(() =>
      Promise.reject(
        new ApiError({
          status: 409,
          code: 'CONFLICT',
          message: 'Overlapping active profile for this scope.',
        }),
      ),
    );
    repo.current = fake as unknown as IWarehouseProfileRepository;
    renderPage();

    await user.click(await screen.findByText('WP-01'));
    await user.click(await screen.findByRole('link', { name: 'Chỉnh sửa hồ sơ' }));
    await user.click(await screen.findByRole('button', { name: 'Kích hoạt' }));

    expect(await screen.findByText('Xung đột')).toBeTruthy();
    expect(screen.getByText('Overlapping active profile for this scope.')).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe('WarehouseProfilesPage rule assignment UI (Finding #2)', () => {
  it('renders the profile-rule panel and attaches a rule via :id/rules', async () => {
    const user = userEvent.setup();
    const fake = new FakeRepository([makeProfile({ status: 'DRAFT' })]);
    fake.listRuleDefinitions = vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'rule-1',
            ruleCode: 'COMP-001',
            ruleName: 'No hazmat in ambient',
            ruleGroupId: 'g-1',
            precedenceTier: 'COMPLIANCE',
            controlMode: 'HARD_BLOCK',
            status: 'ACTIVE',
            warehouseTypeCode: null,
            scopeKey: 'DC',
            conditionJson: {},
            actionJson: {},
            priority: 100,
            effectiveFrom: now,
            effectiveTo: null,
            requiresReason: false,
            requiresEvidence: false,
            allowOverride: false,
            warehouseId: null,
            zoneId: null,
            locationType: null,
            ownerId: null,
            skuId: null,
            itemClass: null,
            orderType: null,
            customerId: null,
            supplierId: null,
            sourceSystem: null,
            referenceId: null,
            createdAt: now,
            updatedAt: now,
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    );
    fake.addProfileRule = vi.fn((id: string, input: { ruleDefinitionId: string }) =>
      Promise.resolve({
        id: 'pr-1',
        warehouseProfileId: id,
        ruleDefinitionId: input.ruleDefinitionId,
        isEnabled: true,
        overridePriority: null,
        sourceSystem: null,
        referenceId: null,
        createdAt: now,
        updatedAt: now,
        createdBy: null,
        updatedBy: null,
      }),
    );
    repo.current = fake as unknown as IWarehouseProfileRepository;
    renderPage();

    await user.click(await screen.findByText('WP-01'));
    await user.click(await screen.findByRole('link', { name: 'Chỉnh sửa hồ sơ' }));

    // The rule panel renders with the attachable definition offered.
    const select = await screen.findByRole('combobox', { name: /gắn quy tắc/i });
    await user.selectOptions(select, 'rule-1');
    await user.click(screen.getByRole('button', { name: 'Thêm quy tắc' }));

    await waitFor(() => {
      expect(fake.addProfileRule).toHaveBeenCalledWith('profile-1', { ruleDefinitionId: 'rule-1' });
    });
  });
});

describe('WarehouseProfilesPage lifecycle error surfacing (Finding #4)', () => {
  it('shows a non-conflict BUSINESS_RULE error in exactly one place (inline, no toast)', async () => {
    const user = userEvent.setup();
    const fake = new FakeRepository([makeProfile({ status: 'DRAFT' })]);
    fake.activateProfile = vi.fn(() =>
      Promise.reject(
        new ApiError({ status: 400, code: 'BUSINESS_RULE', message: 'Invalid transition.' }),
      ),
    );
    repo.current = fake as unknown as IWarehouseProfileRepository;
    renderPage();

    await user.click(await screen.findByText('WP-01'));
    await user.click(await screen.findByRole('link', { name: 'Chỉnh sửa hồ sơ' }));
    await user.click(await screen.findByRole('button', { name: 'Kích hoạt' }));

    // Inline message present...
    expect(await screen.findByText('Invalid transition.')).toBeTruthy();
    // ...and NOT also toasted (single-surface, consistent with conflict handling).
    expect(toastError).not.toHaveBeenCalled();
  });
});
