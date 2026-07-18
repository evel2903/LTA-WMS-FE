// @vitest-environment jsdom
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider, useMutationState } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IInboundPlanRepository } from '@modules/InboundPlan/Application/Interfaces/IInboundPlanRepository';
import { inboundPlanQueryKeys } from '@modules/InboundPlan/Application/Queries/InboundPlanQueryKeys';
import type { InboundLineImportPreview, InboundPlan } from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type {
  CreateInboundPlanInput,
  InboundPlanFilter,
  RecordGateInInput,
  UpdateInboundPlanInput,
} from '@modules/InboundPlan/Domain/Types/InboundPlanQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IInboundPlanRepository }));
vi.mock('@modules/InboundPlan/Infrastructure/Repositories/InboundPlanRepositoryInstance', () => ({
  get inboundPlanRepository() {
    return repo.current;
  },
}));

const partnerRepo = vi.hoisted(() => ({
  current: null as unknown as { list: ReturnType<typeof vi.fn> },
}));
vi.mock('@modules/PartnerMaster/Infrastructure/Repositories/PartnerRepositoryInstance', () => ({
  get partnerRepository() {
    return partnerRepo.current;
  },
}));

const catalogRepo = vi.hoisted(() => ({
  current: null as unknown as {
    listOwners: ReturnType<typeof vi.fn>;
    listUoms: ReturnType<typeof vi.fn>;
    listSkus: ReturnType<typeof vi.fn>;
  },
}));
vi.mock('@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance', () => ({
  get catalogRepository() {
    return catalogRepo.current;
  },
}));

const masterDataRepo = vi.hoisted(() => ({
  current: null as unknown as { listWarehouses: ReturnType<typeof vi.fn> },
}));
vi.mock('@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance', () => ({
  get masterDataRepository() {
    return masterDataRepo.current;
  },
}));

const warehouseProfileRepo = vi.hoisted(() => ({
  current: null as unknown as { listProfiles: ReturnType<typeof vi.fn> },
}));
vi.mock(
  '@modules/WarehouseProfile/Infrastructure/Repositories/WarehouseProfileRepositoryInstance',
  () => ({
    get warehouseProfileRepository() {
      return warehouseProfileRepo.current;
    },
  }),
);

import { INBOUND_PLAN_MUTATION_KEYS } from '@modules/InboundPlan/Application/Commands/UseInboundPlanMutations';
import { InboundPlanDetailPage } from '@modules/InboundPlan/Presentation/Pages/InboundPlanDetailPage';
import { InboundPlanCreatePage } from '@modules/InboundPlan/Presentation/Pages/InboundPlanCreatePage';
import { InboundPlanPage as InboundPlanListPage } from '@modules/InboundPlan/Presentation/Pages/InboundPlanPage';

vi.setConfig({ testTimeout: 15_000 });

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function setLookupRepositories() {
  partnerRepo.current = {
    list: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'supplier-1',
            partnerCode: 'SUP-A',
            partnerName: 'Nhà cung cấp A',
            partnerType: 'Supplier',
            status: 'Active',
            sourceSystem: 'ERP',
            externalReference: 'SUP-A',
            referenceText: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
  };
  catalogRepo.current = {
    listOwners: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'owner-1',
            ownerCode: 'OWN-A',
            ownerName: 'Chủ hàng A',
            status: 'Active',
            billingPolicy: {},
            visibilityScope: {},
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
    listUoms: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'uom-1',
            uomCode: 'EA',
            uomName: 'Lon',
            uomType: 'Each',
            decimalPrecision: 0,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
          {
            id: 'uom-2',
            uomCode: 'CASE',
            uomName: 'Thùng',
            uomType: 'Case',
            decimalPrecision: 0,
            status: 'Active',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
    listSkus: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'sku-1',
            skuCode: 'SKU-A',
            skuName: 'Coca-Cola lon 330ml',
            defaultOwnerId: 'owner-1',
            itemClass: 'BEVERAGE',
            itemStatus: 'Active',
            baseUomId: 'uom-1',
            inventoryUomId: 'uom-1',
            lotControlled: true,
            expiryControlled: true,
            serialControlled: false,
            ownerControlled: true,
            lpnControlled: true,
            temperatureControlled: false,
            dgControlled: false,
            customsControlled: false,
            qcRequired: true,
            bondedFlag: false,
            temperatureClass: null,
            dgClass: null,
            shelfLifeDays: 365,
            minRemainingShelfLifeDays: 30,
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
          {
            id: 'sku-2',
            skuCode: 'SKU-B',
            skuName: 'Coca-Cola thùng 24 lon',
            defaultOwnerId: 'owner-1',
            itemClass: 'BEVERAGE',
            itemStatus: 'Active',
            baseUomId: 'uom-2',
            inventoryUomId: 'uom-2',
            lotControlled: true,
            expiryControlled: true,
            serialControlled: false,
            ownerControlled: true,
            lpnControlled: true,
            temperatureControlled: false,
            dgControlled: false,
            customsControlled: false,
            qcRequired: true,
            bondedFlag: false,
            temperatureClass: null,
            dgClass: null,
            shelfLifeDays: 365,
            minRemainingShelfLifeDays: 30,
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
  };
  masterDataRepo.current = {
    listWarehouses: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'warehouse-1',
            siteId: 'site-1',
            warehouseCode: 'WT-01',
            warehouseName: 'Kho HCM',
            warehouseTypeCode: 'AMBIENT',
            status: 'Active',
            timezone: 'Asia/Ho_Chi_Minh',
            sourceSystem: null,
            referenceId: null,
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
  };
  warehouseProfileRepo.current = {
    listProfiles: vi.fn(() =>
      Promise.resolve(
        page([
          {
            id: 'profile-1',
            profileCode: 'PROFILE-A',
            profileName: 'Hồ sơ kho A',
            warehouseTypeCode: 'AMBIENT',
            version: 1,
            status: 'ACTIVE',
            scopeKey: 'profile-a',
            effectiveFrom: '2026-06-22T08:00:00.000Z',
            effectiveTo: null,
            warehouseId: 'warehouse-1',
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
            createdAt: '2026-06-22T08:00:00.000Z',
            updatedAt: '2026-06-22T08:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ]),
      ),
    ),
  };
}

function makePlan(overrides: Partial<InboundPlan> = {}): InboundPlan {
  return {
    id: 'inbound-plan-1',
    sourceSystem: 'ERP',
    sourceDocumentType: 'ASN',
    sourceDocumentNumber: 'ASN-10001',
    businessReference: 'ERP:ASN:ASN-10001',
    supplierId: 'supplier-1',
    supplierCode: 'SUP-A',
    ownerId: 'owner-1',
    ownerCode: 'OWN-A',
    warehouseId: 'warehouse-1',
    warehouseCode: 'WT-01',
    warehouseProfileId: 'profile-1',
    expectedArrivalAt: '2026-06-22T08:00:00.000Z',
    status: 'Planned',
    gateInStatus: 'NotRecorded',
    gateInAt: null,
    gateReference: null,
    vehicleNumber: null,
    driverName: null,
    evidenceRefs: [],
    coreFlowInstanceId: 'core-flow-1',
    isDuplicate: false,
    lines: [
      {
        id: 'line-1',
        lineNumber: 1,
        skuId: 'sku-1',
        skuCode: 'SKU-A',
        uomId: 'uom-1',
        uomCode: 'EA',
        expectedQuantity: 12,
        externalLineReference: '10',
      },
    ],
    createdAt: '2026-06-22T08:00:00.000Z',
    updatedAt: '2026-06-22T08:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

class FakeInboundPlanRepository implements Partial<IInboundPlanRepository> {
  public items: InboundPlan[];

  constructor(initial: InboundPlan[] = []) {
    this.items = initial;
  }

  list = vi.fn((filter?: InboundPlanFilter) =>
    Promise.resolve(
      page(
        this.items.filter((item) => {
          if (filter?.sourceSystem && item.sourceSystem !== filter.sourceSystem) return false;
          if (
            filter?.sourceDocumentNumber &&
            !item.sourceDocumentNumber.includes(filter.sourceDocumentNumber)
          )
            return false;
          return true;
        }),
      ),
    ),
  );

  getById = vi.fn((id: string) => {
    const item = this.items.find((plan) => plan.id === id);
    return item
      ? Promise.resolve(item)
      : Promise.reject(
          new ApiError({ status: 404, code: 'NOT_FOUND', message: `Inbound plan ${id} not found` }),
        );
  });

  create = vi.fn((input: CreateInboundPlanInput) => {
    const created = makePlan({
      id: `inbound-plan-${this.items.length + 1}`,
      sourceSystem: input.sourceSystem,
      sourceDocumentType: input.sourceDocumentType,
      sourceDocumentNumber: input.sourceDocumentNumber,
      supplierId: input.supplierId,
      ownerId: input.ownerId,
      warehouseId: input.warehouseId,
      warehouseProfileId: input.warehouseProfileId,
      expectedArrivalAt: input.expectedArrivalAt ?? null,
      lines: input.lines.map((line, index) => ({
        id: `line-${index + 1}`,
        lineNumber: line.lineNumber,
        skuId: line.skuId,
        skuCode: line.skuId,
        uomId: line.uomId,
        uomCode: line.uomId,
        expectedQuantity: line.expectedQuantity,
        externalLineReference: line.externalLineReference ?? null,
      })),
    });
    this.items = [created, ...this.items];
    return Promise.resolve(created);
  });

  update = vi.fn((id: string, input: UpdateInboundPlanInput) => {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) {
      return Promise.reject(
        new ApiError({ status: 404, code: 'NOT_FOUND', message: `Inbound plan ${id} not found` }),
      );
    }
    const updated: InboundPlan = {
      ...this.items[index],
      sourceSystem: input.sourceSystem,
      sourceDocumentType: input.sourceDocumentType,
      sourceDocumentNumber: input.sourceDocumentNumber,
      supplierId: input.supplierId,
      ownerId: input.ownerId,
      warehouseId: input.warehouseId,
      warehouseProfileId: input.warehouseProfileId ?? null,
      expectedArrivalAt: input.expectedArrivalAt ?? null,
      lines: input.lines.map((line, lineIndex) => ({
        id: `line-${lineIndex + 1}`,
        lineNumber: line.lineNumber,
        skuId: line.skuId,
        skuCode: line.skuId,
        uomId: line.uomId,
        uomCode: line.uomId,
        expectedQuantity: line.expectedQuantity,
        externalLineReference: line.externalLineReference ?? null,
      })),
    };
    this.items[index] = updated;
    return Promise.resolve(updated);
  });

  confirm = vi.fn((id: string) => {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) {
      return Promise.reject(
        new ApiError({ status: 404, code: 'NOT_FOUND', message: `Inbound plan ${id} not found` }),
      );
    }
    this.items[index] = { ...this.items[index], status: 'Planned' };
    return Promise.resolve(this.items[index]);
  });

  cancel = vi.fn((id: string) => {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) {
      return Promise.reject(
        new ApiError({ status: 404, code: 'NOT_FOUND', message: `Inbound plan ${id} not found` }),
      );
    }
    this.items[index] = { ...this.items[index], status: 'Cancelled' };
    return Promise.resolve(this.items[index]);
  });

  downloadLineImportTemplate = vi.fn((): Promise<Blob> => Promise.resolve(new Blob()));

  previewLineImport = vi.fn(
    (): Promise<InboundLineImportPreview> =>
      Promise.resolve({
        fileName: 'template.xlsx',
        rows: [],
        summary: { total: 0, valid: 0, invalid: 0 },
        headerError: null,
      }),
  );

  commitLineImport = vi.fn((_file: File, header: Omit<CreateInboundPlanInput, 'lines'>) =>
    this.create({ ...header, lines: [] }),
  );

  recordGateIn = vi.fn((id: string, input: RecordGateInInput) => {
    const index = this.items.findIndex((item) => item.id === id);
    this.items[index] = {
      ...this.items[index],
      gateInStatus: 'Recorded',
      gateInAt: input.gateInAt,
      gateReference: input.gateReference,
      vehicleNumber: input.vehicleNumber ?? null,
    };
    return Promise.resolve(this.items[index]);
  });
}

function renderDetailPage(entry = '/inbound/inbound-plan-1', client?: QueryClient) {
  client ??= new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <NavigateProbe />
        <MutationSettledProbe />
        <Routes>
          <Route path="/inbound/new" element={<InboundPlanCreatePage />} />
          <Route path="/inbound/:id" element={<InboundPlanDetailPage />} />
          <Route path="/inbound/:id/edit" element={<InboundPlanDetailPage />} />
          <Route path="/inbound/:id/gate-in" element={<InboundPlanDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mutationSettledCount(): number {
  return Number(screen.getByTestId('mutation-settled-count').textContent);
}

function isButtonDisabled(testId: string): boolean {
  return screen.getByTestId<HTMLButtonElement>(testId).disabled;
}

function renderCreatePage(entry = '/inbound/new') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/inbound/new" element={<InboundPlanCreatePage />} />
          <Route path="/inbound/:id" element={<InboundPlanDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderListPage(entry = '/inbound') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/inbound" element={<InboundPlanListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// IFB-24 review fix: lets a test navigate the SAME mounted router to a different route
// matching the identical Route pattern (e.g. another plan's /:id/edit) without
// unmounting the page component.
function NavigateProbe() {
  const navigate = useNavigate();
  useEffect(() => {
    (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate = navigate;
    // Review fix (P2): lets a test simulate the browser Back button (navigate(-1)) to
    // assert whether a prior programmatic navigate() used `replace: true` or not --
    // a plain push leaves the replaced route reachable via Back, replace does not.
    (window as unknown as { __testGoBack: () => void }).__testGoBack = () => navigate(-1);
  }, [navigate]);
  return null;
}

function LocationProbe() {
  const location = useLocation();
  return (
    <span data-testid="location-probe" hidden>
      {location.pathname}
    </span>
  );
}

const INBOUND_PLAN_LOCK_KEY_NAMES_FOR_TEST = new Set<string>([
  INBOUND_PLAN_MUTATION_KEYS.update[0],
  INBOUND_PLAN_MUTATION_KEYS.confirm[0],
  INBOUND_PLAN_MUTATION_KEYS.cancel[0],
  INBOUND_PLAN_MUTATION_KEYS.recordGateIn[0],
]);

// Re-review fix (P2, round 4): the previous flush signal (waiting for an extra `getById`
// call, triggered by the mutation's hook-level `onSuccess` calling `invalidateInboundPlan()`)
// does NOT reliably happen AFTER the per-call `onSuccess` guard under test -- tracing
// `node_modules/@tanstack/query-core`'s `Mutation.execute()` shows the hook-level onSuccess
// runs and completes BEFORE `#dispatch({type: 'success'})` is even called, and `#dispatch` is
// what triggers the per-call onSuccess (via `observer.onMutationUpdate` -> `#notify`) --
// meaning the query refetch this test used to wait for can fire BEFORE the guard has run,
// not after. `mutationCache.notify({type: 'updated'})` (what `useMutationState` subscribes
// to), by contrast, is the LAST step inside that same `#dispatch` call, strictly AFTER the
// per-call onSuccess/guard has already executed synchronously -- so waiting for a mutation to
// transition away from `pending` via `useMutationState` is a causally sound post-guard signal,
// not a coincidentally-timed one.
function MutationSettledProbe() {
  const settledCount = useMutationState({
    filters: {
      predicate: (mutation) => {
        const keyName = mutation.options.mutationKey?.[0];
        return (
          typeof keyName === 'string' &&
          INBOUND_PLAN_LOCK_KEY_NAMES_FOR_TEST.has(keyName) &&
          mutation.state.status !== 'pending'
        );
      },
    },
  }).length;
  return (
    <span data-testid="mutation-settled-count" hidden>
      {settledCount}
    </span>
  );
}

afterEach(() => cleanup());

describe('InboundPlanPage (list)', () => {
  it('passes source-system and document-number filters to the repository', async () => {
    const fake = new FakeInboundPlanRepository([
      makePlan({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
      makePlan({
        id: 'inbound-plan-2',
        sourceSystem: 'OWNER-PORTAL',
        sourceDocumentNumber: 'ASN-20001',
      }),
    ]);
    repo.current = fake;
    renderListPage();

    // Card (mobile) and table (desktop) both live in the DOM (responsive is CSS-only),
    // so the document number now matches twice — assert with findAllByText.
    await screen.findAllByText('ASN-10001');
    expect(screen.getByRole('link', { name: 'Tạo kế hoạch nhập kho' })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Mở chi tiết' })[0]).toHaveProperty(
      'href',
      expect.stringContaining('/inbound/inbound-plan-1'),
    );
    expect(screen.queryByRole('button', { name: 'Tạo kế hoạch nhập kho' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ghi nhận vào cổng' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Lọc hệ thống nguồn'), { target: { value: 'ERP' } });
    fireEvent.change(screen.getByLabelText('Lọc số chứng từ'), { target: { value: 'ASN-10001' } });

    await waitFor(
      () =>
        expect(fake.list).toHaveBeenCalledWith(
          expect.objectContaining({ sourceSystem: 'ERP', sourceDocumentNumber: 'ASN-10001' }),
        ),
      { timeout: 5_000 },
    );
  }, 15_000);

  it('renders the desktop table with columns and per-row actions alongside the mobile cards, routing "Thao tác tiếp nhận" into the Receiving module', async () => {
    const fake = new FakeInboundPlanRepository([
      makePlan({ sourceDocumentNumber: 'ASN-10001', warehouseCode: 'WT-01' }),
    ]);
    repo.current = fake;
    renderListPage();

    // Desktop table block (rendered in DOM regardless of viewport since responsive is CSS-only).
    const table = await screen.findByTestId('inbound-plan-table');
    expect(within(table).getByText('Số chứng từ')).toBeTruthy();
    expect(within(table).getByText('Trạng thái')).toBeTruthy();
    expect(within(table).getByText('CoreFlow')).toBeTruthy();

    // The plan row carries its own testid and the same column data as the card.
    const row = screen.getByTestId('inbound-plan-row-inbound-plan-1');
    expect(within(row).getByText('WT-01')).toBeTruthy();

    // Per-row actions route to the Plan detail page and into the SEPARATE Receiving
    // module (was `/inbound/:id/receiving` before the ipr-01 module split).
    const detailLink = within(row).getByRole('link', { name: 'Mở chi tiết' });
    expect(detailLink).toHaveProperty('href', expect.stringContaining('/inbound/inbound-plan-1'));
    const receivingLink = within(row).getByRole('link', { name: 'Thao tác tiếp nhận' });
    expect(receivingLink).toHaveProperty(
      'href',
      expect.stringContaining('/inbound-receiving/inbound-plan-1'),
    );

    // Mobile cards remain in the DOM too (responsive switch is Tailwind CSS).
    expect(screen.getAllByText('ASN-10001').length).toBeGreaterThanOrEqual(2);
  });

  it('IFB-24: shows Sửa/Xóa on the list only for Draft plans, hides them once Planned', async () => {
    const fake = new FakeInboundPlanRepository([
      makePlan({ id: 'draft-plan', sourceDocumentNumber: 'ASN-DRAFT', status: 'Draft' }),
      makePlan({ id: 'planned-plan', sourceDocumentNumber: 'ASN-PLANNED', status: 'Planned' }),
    ]);
    repo.current = fake;
    renderListPage();

    await screen.findByTestId('inbound-plan-table');
    const draftRow = screen.getByTestId('inbound-plan-row-draft-plan');
    const plannedRow = screen.getByTestId('inbound-plan-row-planned-plan');

    expect(within(draftRow).getByRole('link', { name: 'Sửa' })).toBeTruthy();
    expect(within(draftRow).getByRole('button', { name: 'Xóa' })).toBeTruthy();
    expect(within(plannedRow).queryByRole('link', { name: 'Sửa' })).toBeNull();
    expect(within(plannedRow).queryByRole('button', { name: 'Xóa' })).toBeNull();
  });

  it('IFB-24: cancels a Draft plan from the list only after the confirm dialog is accepted', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    repo.current = fake;
    renderListPage();

    const row = await screen.findByTestId('inbound-plan-row-inbound-plan-1');
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    fireEvent.click(within(row).getByRole('button', { name: 'Xóa' }));
    expect(fake.cancel).not.toHaveBeenCalled();

    fireEvent.click(within(row).getByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(fake.cancel).toHaveBeenCalledWith('inbound-plan-1'));

    confirmSpy.mockRestore();
  });

});

describe('InboundPlanCreatePage', () => {
  it('creates source document from the create-only page without operational actions', async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository();
    repo.current = fake;
    setLookupRepositories();
    renderCreatePage();

    expect(screen.queryByRole('button', { name: 'Ghi nhận vào cổng' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ghi đè kiểm tra sẵn sàng' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Bắt đầu tiếp nhận' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xác nhận nhận hàng' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Đánh giá QC' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Phát hành sang cất hàng' })).toBeNull();

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'ASN-10001');
    expect(screen.queryByLabelText('ID nhà cung cấp')).toBeNull();
    expect(screen.queryByLabelText('ID chủ hàng')).toBeNull();
    expect(screen.queryByLabelText('ID kho')).toBeNull();
    expect(screen.queryByLabelText('ID hồ sơ kho')).toBeNull();
    await actor.selectOptions(await screen.findByLabelText('Nhà cung cấp'), 'supplier-1');
    await actor.selectOptions(screen.getByLabelText('Chủ hàng'), 'owner-1');
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    await actor.selectOptions(screen.getByLabelText('Hồ sơ kho'), 'profile-1');
    await actor.type(screen.getByLabelText('Thời gian đến dự kiến'), '2026-06-22T08:00');
    expect(screen.queryByLabelText('ID SKU')).toBeNull();
    expect(screen.queryByLabelText('ID đơn vị tính')).toBeNull();
    await actor.selectOptions(await screen.findByLabelText('SKU'), 'sku-1');
    await actor.selectOptions(screen.getByLabelText('Đơn vị tính'), 'uom-1');
    await actor.clear(screen.getByLabelText('Số lượng dự kiến'));
    await actor.type(screen.getByLabelText('Số lượng dự kiến'), '12');
    const createButton = screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' });
    await waitFor(() => expect(createButton).toHaveProperty('disabled', false));
    await actor.click(createButton);

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceSystem: 'ERP',
          sourceDocumentNumber: 'ASN-10001',
          supplierId: 'supplier-1',
          ownerId: 'owner-1',
          warehouseId: 'warehouse-1',
          warehouseProfileId: 'profile-1',
          lines: [expect.objectContaining({ skuId: 'sku-1', expectedQuantity: 12 })],
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );
    const createInput = fake.create.mock.calls[0][0];
    expect(createInput.expectedArrivalAt).toMatch(/^2026-06-22T/);
    expect(fake.recordGateIn).not.toHaveBeenCalled();
  });

  it('shows duplicate/idempotent source trace when backend returns duplicate flag', async () => {
    const actor = userEvent.setup();
    const existing = makePlan({ isDuplicate: true });
    const fake = new FakeInboundPlanRepository([existing]);
    fake.create.mockResolvedValueOnce(existing);
    repo.current = fake;
    setLookupRepositories();
    renderCreatePage();

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'ASN-10001');
    await actor.selectOptions(await screen.findByLabelText('Nhà cung cấp'), 'supplier-1');
    await actor.selectOptions(screen.getByLabelText('Chủ hàng'), 'owner-1');
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    await actor.selectOptions(screen.getByLabelText('Hồ sơ kho'), 'profile-1');
    await actor.selectOptions(await screen.findByLabelText('SKU'), 'sku-1');
    await actor.selectOptions(screen.getByLabelText('Đơn vị tính'), 'uom-1');
    const createButton = screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' });
    await waitFor(() => expect(createButton).toHaveProperty('disabled', false));
    await actor.click(createButton);

    expect(await screen.findByText(/Đã dùng lại kế hoạch nhập kho hiện có/i)).toBeTruthy();
  });

  it('creates source document with multiple lines and external line references', async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository();
    repo.current = fake;
    setLookupRepositories();
    renderCreatePage();

    await actor.type(await screen.findByLabelText('Hệ thống nguồn'), 'ERP');
    await actor.clear(screen.getByLabelText('Loại chứng từ nguồn'));
    await actor.type(screen.getByLabelText('Loại chứng từ nguồn'), 'PO');
    await actor.type(screen.getByLabelText('Số chứng từ nguồn'), 'PO-10001');
    await actor.selectOptions(await screen.findByLabelText('Nhà cung cấp'), 'supplier-1');
    await actor.selectOptions(screen.getByLabelText('Chủ hàng'), 'owner-1');
    await actor.selectOptions(screen.getByLabelText('Kho'), 'warehouse-1');
    await actor.selectOptions(screen.getByLabelText('Hồ sơ kho'), 'profile-1');
    await actor.selectOptions(await screen.findByLabelText('SKU'), 'sku-1');
    await actor.selectOptions(screen.getByLabelText('Đơn vị tính'), 'uom-1');
    await actor.clear(screen.getByLabelText('Số lượng dự kiến'));
    await actor.type(screen.getByLabelText('Số lượng dự kiến'), '12');
    await actor.type(screen.getByLabelText('Tham chiếu dòng ngoài'), '10');

    await actor.click(screen.getByRole('button', { name: 'Thêm dòng' }));
    const skuInputs = screen.getAllByLabelText('SKU');
    const uomInputs = screen.getAllByLabelText('Đơn vị tính');
    const qtyInputs = screen.getAllByLabelText('Số lượng dự kiến');
    const refInputs = screen.getAllByLabelText('Tham chiếu dòng ngoài');
    await actor.selectOptions(skuInputs[1], 'sku-2');
    await actor.selectOptions(uomInputs[1], 'uom-2');
    await actor.clear(qtyInputs[1]);
    await actor.type(qtyInputs[1], '8');
    await actor.type(refInputs[1], '20');
    const createButton = screen.getByRole('button', { name: 'Tạo kế hoạch nhập kho' });
    await waitFor(() => expect(createButton).toHaveProperty('disabled', false));
    await actor.click(createButton);

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceDocumentType: 'PO',
          sourceDocumentNumber: 'PO-10001',
          lines: [
            expect.objectContaining({ lineNumber: 1, skuId: 'sku-1', externalLineReference: '10' }),
            expect.objectContaining({ lineNumber: 2, skuId: 'sku-2', externalLineReference: '20' }),
          ],
        }),
      ),
    );
  });

});

describe('InboundPlanDetailPage', () => {
  it('shows the operator header, document info and expected-arrival/CoreFlow trace', async () => {
    const fake = new FakeInboundPlanRepository([makePlan()]);
    repo.current = fake;
    renderDetailPage();

    await screen.findByText(/Dấu vết CoreFlow: core-flow-1/i);
    expect(screen.getByText(/Dự kiến đến: 2026-06-22T08:00:00.000Z/i)).toBeTruthy();
    expect(screen.getByText(/Dấu vết CoreFlow: core-flow-1/i)).toBeTruthy();
    expect(await screen.findByTestId('inbound-operator-header')).toBeTruthy();
    expect(screen.getByTestId('inbound-document-info')).toBeTruthy();
    // Gate-in-not-yet-recorded plans still show the CTA into Receiving once past Draft.
    expect(screen.getByRole('link', { name: 'Bắt đầu nhận hàng' })).toHaveProperty(
      'href',
      expect.stringContaining('/inbound-receiving/inbound-plan-1'),
    );
  });

  it('ipr-01 AC12a: hides the "Bắt đầu nhận hàng" CTA while the plan is still Draft', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-operator-header');
    expect(screen.queryByRole('link', { name: 'Bắt đầu nhận hàng' })).toBeNull();
  });

  it('ipr-01 AC12a: hides the "Bắt đầu nhận hàng" CTA once the plan is Cancelled', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Cancelled' })]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-operator-header');
    expect(screen.queryByRole('link', { name: 'Bắt đầu nhận hàng' })).toBeNull();
  });

  it('renders the gate-in panel with a visible disabled helper on the /gate-in route', async () => {
    const fake = new FakeInboundPlanRepository([makePlan()]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1/gate-in');

    const gateInPanel = await screen.findByTestId('inbound-gate-in-panel');
    expect(within(gateInPanel).getByRole('button', { name: 'Ghi nhận vào cổng' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByTestId('inbound-gate-in-helper').textContent).toContain(
      'Nhập tham chiếu cổng',
    );
    // Edit/create/receiving panels are simply not part of this page at all now.
    expect(screen.queryByTestId('inbound-edit-panel')).toBeNull();
  });

  it('review fix: navigates back to Plan detail after a successful gate-in, where the "Bắt đầu nhận hàng" CTA then renders', async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Planned' })]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1/gate-in');

    await actor.type(await screen.findByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));

    await waitFor(() =>
      expect(fake.recordGateIn).toHaveBeenCalledWith(
        'inbound-plan-1',
        expect.objectContaining({ gateReference: 'GATE-A-001' }),
      ),
    );
    // Without this fix the operator stayed parked on /gate-in with the CTA unreachable
    // (it only renders in mode === 'detail').
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();
    expect(await screen.findByRole('link', { name: 'Bắt đầu nhận hàng' })).toHaveProperty(
      'href',
      expect.stringContaining('/inbound-receiving/inbound-plan-1'),
    );
  });

  it('re-review fix (P1): Draft -> gate-in -> Confirm shows the fresh Planned status and CTA, not the stale gate-in snapshot', async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1/gate-in');

    await actor.type(await screen.findByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );

    // Still Draft after gate-in (real backend never touches Status here) -- Xác nhận
    // should still be visible.
    await screen.findByTestId('inbound-draft-actions');
    await actor.click(screen.getByTestId('inbound-confirm-trigger'));
    await waitFor(() => expect(fake.confirm).toHaveBeenCalledWith('inbound-plan-1'));

    // Without the P1 fix, `selected` kept permanently preferring the OLD gate-in
    // mutation's Draft snapshot, so the CTA never appeared and Draft actions never hid.
    expect(await screen.findByRole('link', { name: 'Bắt đầu nhận hàng' })).toHaveProperty(
      'href',
      expect.stringContaining('/inbound-receiving/inbound-plan-1'),
    );
    expect(screen.queryByTestId('inbound-draft-actions')).toBeNull();
  });

  it('re-review fix (P2): a slow gate-in response for plan A does not redirect the operator after they already navigated to plan B', async () => {
    const actor = userEvent.setup();
    const planA = makePlan({ id: 'plan-a', status: 'Draft', sourceDocumentNumber: 'ASN-PLAN-A' });
    const planB = makePlan({ id: 'plan-b', status: 'Draft', sourceDocumentNumber: 'ASN-PLAN-B' });
    const fake = new FakeInboundPlanRepository([planA, planB]);
    let resolveGateIn: ((plan: InboundPlan) => void) | undefined;
    fake.recordGateIn = vi.fn(
      () =>
        new Promise<InboundPlan>((resolve) => {
          resolveGateIn = resolve;
        }),
    );
    repo.current = fake;
    renderDetailPage('/inbound/plan-a/gate-in');

    await actor.type(await screen.findByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));
    expect(fake.recordGateIn).toHaveBeenCalledTimes(1);

    // Operator gives up waiting on A's slow response and opens a completely different plan.
    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate(
        '/inbound/plan-b',
      );
    });
    await screen.findByText('ASN-PLAN-B');

    const priorSettledCount = mutationSettledCount();

    // Plan A's gate-in finally resolves, long after the operator moved on.
    act(() => {
      resolveGateIn?.({
        ...planA,
        gateInStatus: 'Recorded',
        gateInAt: '2026-07-17T00:00:00.000Z',
      });
    });
    // Re-review fix (round 4): the round-3 fix (waiting for an extra `getById` call) is
    // itself not causally sound -- tracing `node_modules/@tanstack/query-core`'s
    // `Mutation.execute()` shows the hook-level `onSuccess` (which triggers that refetch,
    // via `invalidateInboundPlan()`) runs and COMPLETES before `#dispatch({type:
    // 'success'})` is even called, and `#dispatch` is what invokes the per-call `onSuccess`
    // (the guard under test) via `observer.onMutationUpdate`. So the refetch this test used
    // to wait for could fire BEFORE the guard has run, not after. `mutationCache.notify()`
    // -- what `useMutationState`/`MutationSettledProbe` subscribes to -- is dispatched as
    // the LAST step inside that same `#dispatch` call, strictly AFTER the per-call
    // onSuccess/guard has already executed. Waiting for this mutation to leave `pending`
    // status is therefore a causally sound post-guard signal.
    await waitFor(() => {
      expect(mutationSettledCount()).toBeGreaterThan(priorSettledCount);
    });

    // Must not have yanked the operator back to plan A.
    expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/plan-b');
    expect(screen.getByText('ASN-PLAN-B')).toBeTruthy();
    expect(screen.queryByText('ASN-PLAN-A')).toBeNull();
  });

  it("re-review fix (P1): a slow gate-in response does not redirect the operator away from the SAME plan's edit form", async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    let resolveGateIn: ((plan: InboundPlan) => void) | undefined;
    fake.recordGateIn = vi.fn(
      () =>
        new Promise<InboundPlan>((resolve) => {
          resolveGateIn = resolve;
        }),
    );
    repo.current = fake;
    setLookupRepositories();
    renderDetailPage('/inbound/inbound-plan-1/gate-in');

    await actor.type(await screen.findByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));
    expect(fake.recordGateIn).toHaveBeenCalledTimes(1);

    // Operator gives up waiting and opens the SAME plan's edit form instead -- the plan
    // id guard alone would let this through since it's still 'inbound-plan-1'.
    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate(
        '/inbound/inbound-plan-1/edit',
      );
    });
    await screen.findByTestId('inbound-edit-panel');

    const priorSettledCount = mutationSettledCount();

    // Gate-in finally resolves, long after the operator moved to /edit.
    act(() => {
      resolveGateIn?.({
        ...fake.items[0],
        gateInStatus: 'Recorded',
        gateInAt: '2026-07-17T00:00:00.000Z',
      });
    });
    // Re-review fix (round 4): same reasoning as the cross-plan test above -- the round-3
    // `getById`-refetch signal is not causally sound (hook-level onSuccess, which triggers
    // that refetch, completes BEFORE `#dispatch` invokes the per-call onSuccess/guard under
    // test). Wait for this mutation to leave 'pending' via `mutationCache.notify()` instead,
    // which `MutationSettledProbe` observes strictly after the guard has already run.
    await waitFor(() => {
      expect(mutationSettledCount()).toBeGreaterThan(priorSettledCount);
    });

    // Must not have replaced the edit form with the detail view.
    expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1/edit');
    expect(screen.getByTestId('inbound-edit-panel')).toBeTruthy();
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();
  });

  it('re-review fix (P2): browser Back after a successful gate-in skips the now-locked /gate-in route entirely', async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    repo.current = fake;
    setLookupRepositories();
    // Re-review fix: start on a CONTENT-DISTINGUISHABLE route (edit, not detail) --
    // detail's content is identical before AND after the gate-in submit (both show no
    // edit/gate-in panel), so a prior version of this test could pass even if Back were
    // a total no-op, since the pathname/content already matched the expectation before
    // pressing Back at all. Landing back on the edit panel specifically proves Back
    // moved through the stack for real and skipped over /gate-in.
    renderDetailPage('/inbound/inbound-plan-1/edit');
    await screen.findByTestId('inbound-edit-panel');

    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate(
        '/inbound/inbound-plan-1/gate-in',
      );
    });
    await screen.findByTestId('inbound-gate-in-panel');

    await actor.type(screen.getByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );
    expect(screen.queryByTestId('inbound-edit-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();

    act(() => {
      (window as unknown as { __testGoBack: () => void }).__testGoBack();
    });

    // With `replace: true` the /gate-in history entry was swapped out, not stacked on
    // top of -- Back lands on the EDIT entry that came before it (content-distinguishable:
    // the edit panel is visible again), never inside the now-locked (disabled) gate-in
    // form. A no-op Back, or a push-based navigate that merely left the location string
    // unchanged, would fail this (the edit panel would stay absent). Under the old
    // push-based navigate, this would instead land on /inbound/inbound-plan-1/gate-in
    // with the locked panel re-appearing.
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1/edit'),
    );
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();
    expect(await screen.findByTestId('inbound-edit-panel')).toBeTruthy();
  });

  it('re-review fix (P2, round 3): a direct visit to /:id/gate-in for a plan that already completed gate-in redirects straight to detail', async () => {
    const fake = new FakeInboundPlanRepository([
      makePlan({ gateInStatus: 'Recorded', gateInAt: '2026-07-17T00:00:00.000Z' }),
    ]);
    repo.current = fake;
    // Simulates a bookmark, stale URL, or leftover browser history landing directly on
    // /gate-in for a plan whose gate-in was already recorded elsewhere -- the post-submit
    // `{ replace: true }` navigate only covers the operator's OWN just-completed request,
    // not an unrelated direct visit like this one.
    renderDetailPage('/inbound/inbound-plan-1/gate-in');

    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();
  });

  it('re-review fix (P1, round 3): Xác nhận/Xóa/Sửa are disabled while gate-in is still pending for the SAME plan, and re-enable once it settles', async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    let resolveGateIn: ((plan: InboundPlan) => void) | undefined;
    fake.recordGateIn = vi.fn(
      () =>
        new Promise<InboundPlan>((resolve) => {
          resolveGateIn = resolve;
        }),
    );
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1/gate-in');

    await actor.type(await screen.findByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));
    expect(fake.recordGateIn).toHaveBeenCalledTimes(1);

    // The header's Xác nhận button was never gated on recordGateIn's OWN isPending --
    // without the cross-action lock, an operator could genuinely submit gate-in then
    // immediately navigate to detail and click Confirm while gate-in is still in flight.
    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate(
        '/inbound/inbound-plan-1',
      );
    });
    await screen.findByTestId('inbound-draft-actions');
    expect(isButtonDisabled('inbound-confirm-trigger')).toBe(true);
    expect(isButtonDisabled('inbound-cancel-trigger')).toBe(true);
    expect(isButtonDisabled('inbound-edit-trigger')).toBe(true);

    act(() => {
      resolveGateIn?.({
        ...fake.items[0],
        gateInStatus: 'Recorded',
        gateInAt: '2026-07-17T00:00:00.000Z',
      });
    });
    await waitFor(() => expect(isButtonDisabled('inbound-confirm-trigger')).toBe(false));
    expect(isButtonDisabled('inbound-cancel-trigger')).toBe(false);
    expect(isButtonDisabled('inbound-edit-trigger')).toBe(false);
  });

  it('re-review fix (P1, round 3): the cross-mutation lock is scoped to the SAME plan -- a different plan stays fully usable while plan A has a pending mutation', async () => {
    const actor = userEvent.setup();
    const planA = makePlan({ id: 'plan-a', status: 'Draft', sourceDocumentNumber: 'ASN-PLAN-A' });
    const planB = makePlan({ id: 'plan-b', status: 'Draft', sourceDocumentNumber: 'ASN-PLAN-B' });
    const fake = new FakeInboundPlanRepository([planA, planB]);
    let resolveGateIn: ((plan: InboundPlan) => void) | undefined;
    fake.recordGateIn = vi.fn(
      () =>
        new Promise<InboundPlan>((resolve) => {
          resolveGateIn = resolve;
        }),
    );
    repo.current = fake;
    renderDetailPage('/inbound/plan-a/gate-in');

    await actor.type(await screen.findByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));
    expect(fake.recordGateIn).toHaveBeenCalledTimes(1);

    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate(
        '/inbound/plan-b',
      );
    });
    await screen.findByTestId('inbound-draft-actions');
    // The single `useInboundPlanMutations()` instance is shared by the whole page and
    // survives the route change (only the id param and `selected` change) -- plan A's
    // still-pending gate-in must not leak into a lock on the UNRELATED plan B just
    // because they share that hook state.
    expect(isButtonDisabled('inbound-confirm-trigger')).toBe(false);
    expect(isButtonDisabled('inbound-cancel-trigger')).toBe(false);
    expect(isButtonDisabled('inbound-edit-trigger')).toBe(false);

    act(() => {
      resolveGateIn?.({ ...planA, gateInStatus: 'Recorded', gateInAt: '2026-07-17T00:00:00.000Z' });
    });
  });

  it('re-review fix (P1, round 5): the cross-mutation lock stays held until the post-mutation refetch actually completes, not just starts', async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    const originalItem = fake.items[0];
    let resolveGateIn: ((plan: InboundPlan) => void) | undefined;
    fake.recordGateIn = vi.fn(
      () =>
        new Promise<InboundPlan>((resolve) => {
          resolveGateIn = resolve;
        }),
    );
    // The 1st `getById` call is the page's own initial mount fetch -- resolves normally.
    // The 2nd call is the refetch `invalidateInboundPlan()` triggers after gate-in
    // succeeds -- held open on purpose so the test can observe whether the lock releases
    // BEFORE or AFTER this refetch actually lands.
    let resolveRefetch: ((plan: InboundPlan) => void) | undefined;
    let getByIdCalls = 0;
    fake.getById = vi.fn((id: string) => {
      getByIdCalls += 1;
      if (getByIdCalls === 1) return Promise.resolve(originalItem);
      if (id !== originalItem.id) return Promise.reject(new Error(`unexpected id ${id}`));
      return new Promise<InboundPlan>((resolve) => {
        resolveRefetch = resolve;
      });
    });
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1/gate-in');

    await actor.type(await screen.findByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));
    expect(fake.recordGateIn).toHaveBeenCalledTimes(1);

    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate(
        '/inbound/inbound-plan-1',
      );
    });
    await screen.findByTestId('inbound-draft-actions');
    expect(isButtonDisabled('inbound-confirm-trigger')).toBe(true);

    // Gate-in's OWN repository call resolves...
    act(() => {
      resolveGateIn?.({ ...originalItem, gateInStatus: 'Recorded', gateInAt: '2026-07-18T00:00:00.000Z' });
    });
    // ...which triggers the post-success refetch (2nd getById call) -- confirm it actually
    // started before asserting anything about the lock's state relative to it.
    await waitFor(() => expect(getByIdCalls).toBeGreaterThanOrEqual(2));

    // Re-review fix (P1, round 5): the refetch is still PENDING at this point (held open
    // above) -- the lock must NOT have released yet. Before this fix, `invalidateInboundPlan()`
    // fired the refetch without returning its Promise, so `onSuccess` resolved immediately
    // and `#dispatch({type:'success'})` (which flips the mutation out of 'pending', clearing
    // `useInboundPlanLockMutationIds`) ran before the refetch landed -- this assertion would
    // have failed (buttons already enabled) against that version.
    expect(isButtonDisabled('inbound-confirm-trigger')).toBe(true);
    expect(isButtonDisabled('inbound-cancel-trigger')).toBe(true);
    expect(isButtonDisabled('inbound-edit-trigger')).toBe(true);

    // Now let the refetch land -- only now should the lock release.
    act(() => {
      resolveRefetch?.({ ...originalItem, gateInStatus: 'Recorded', gateInAt: '2026-07-18T00:00:00.000Z' });
    });
    await waitFor(() => expect(isButtonDisabled('inbound-confirm-trigger')).toBe(false));
    expect(isButtonDisabled('inbound-cancel-trigger')).toBe(false);
    expect(isButtonDisabled('inbound-edit-trigger')).toBe(false);
  });

  it("re-review fix (P1, round 3, adversarial-verify): a pending Xóa from the LIST page locks the SAME plan's edit form on a freshly-navigated detail page", async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    // Re-review fix (P2, round 4): the mutation is rejected, not resolved, to settle the
    // lock -- resolving it would write a `Cancelled` response into the query cache while
    // `fake.items` (the backing store `getById`'s refetch reads from) stays `Draft`, an
    // inconsistency between the mutation's own response and its persisted state that a real
    // backend could never produce. That mismatch let a prior version of this test pass for
    // the wrong reason (the refetch silently reverted the cache back to `Draft`, which is
    // what let the Draft-only edit guard stay satisfied) rather than genuinely proving the
    // lock releases. Rejecting sidesteps the whole business-state-consistency question --
    // it proves the lock releases once the mutation SETTLES, success or failure, without
    // needing to fabricate a terminal status this test isn't actually about.
    let rejectCancel: ((error: unknown) => void) | undefined;
    fake.cancel = vi.fn(
      () =>
        new Promise<InboundPlan>((_resolve, reject) => {
          rejectCancel = reject;
        }),
    );
    repo.current = fake;
    setLookupRepositories();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // List page and detail page rendered under the SAME QueryClientProvider (as they are in
    // the real app) -- `InboundPlanPage` (list) and `InboundPlanDetailPage` each call their
    // OWN `useInboundPlanMutations()`, but both mutation instances register into this ONE
    // shared QueryClient's mutation cache, which is what the global `useIsMutating` lock
    // reads from.
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/inbound']}>
          <LocationProbe />
          <NavigateProbe />
          <Routes>
            <Route path="/inbound" element={<InboundPlanListPage />} />
            <Route path="/inbound/:id" element={<InboundPlanDetailPage />} />
            <Route path="/inbound/:id/edit" element={<InboundPlanDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const row = await screen.findByTestId('inbound-plan-row-inbound-plan-1');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await actor.click(within(row).getByRole('button', { name: 'Xóa' }));
    expect(fake.cancel).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();

    // Operator doesn't wait for the list-page cancel to settle -- immediately navigates to
    // the SAME plan's edit route, mounting a BRAND NEW InboundPlanDetailPage instance with
    // its OWN fresh `useInboundPlanMutations()` (component-local `.isPending` alone would
    // read false here, since this instance never called cancelInboundPlan itself).
    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate(
        '/inbound/inbound-plan-1/edit',
      );
    });
    await screen.findByTestId('inbound-edit-panel');

    // Must reflect the list page's still-in-flight cancel: Save button disabled -- not a
    // fully-enabled prefilled form that would let a second, genuinely concurrent mutation
    // fire against the same plan.
    const saveButton = () => screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      rejectCancel?.(new Error('network error'));
    });
    await waitFor(() => expect((saveButton() as HTMLButtonElement).disabled).toBe(false));
  });

  it("re-review fix (P1, round 4, adversarial-verify): a pending mutation started on the DETAIL page locks the SAME plan's Xóa on a freshly-navigated list page", async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    let resolveGateIn: ((plan: InboundPlan) => void) | undefined;
    fake.recordGateIn = vi.fn(
      () =>
        new Promise<InboundPlan>((resolve) => {
          resolveGateIn = resolve;
        }),
    );
    repo.current = fake;
    setLookupRepositories();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Same shared-QueryClientProvider setup as the LIST-locks-DETAIL test above, but
    // exercising the OPPOSITE direction of the same race: the round-3 fix only wired the
    // global lock into `InboundPlanDetailPage` -- `InboundPlanPage` (list) kept checking
    // only its OWN `cancelInboundPlan.isPending`, so a mutation still in flight from the
    // Detail page was invisible to the list page's Xóa gating (adversarial-verify finding,
    // round 4).
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/inbound/inbound-plan-1/gate-in']}>
          <LocationProbe />
          <NavigateProbe />
          <Routes>
            <Route path="/inbound" element={<InboundPlanListPage />} />
            <Route path="/inbound/:id/gate-in" element={<InboundPlanDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await actor.type(await screen.findByLabelText('Tham chiếu cổng'), 'GATE-A-001');
    await actor.click(screen.getByRole('button', { name: 'Ghi nhận vào cổng' }));
    expect(fake.recordGateIn).toHaveBeenCalledTimes(1);

    // Operator doesn't wait for gate-in to settle -- navigates straight to the list,
    // mounting a BRAND NEW InboundPlanPage instance with its OWN fresh
    // `useInboundPlanMutations()` (which never called recordGateIn itself).
    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate('/inbound');
    });
    const row = await screen.findByTestId('inbound-plan-row-inbound-plan-1');
    const xoaButton = () => within(row).getByRole('button', { name: 'Xóa' });
    expect((xoaButton() as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      resolveGateIn?.({
        ...fake.items[0],
        gateInStatus: 'Recorded',
        gateInAt: '2026-07-17T00:00:00.000Z',
      });
    });
    await waitFor(() => expect((xoaButton() as HTMLButtonElement).disabled).toBe(false));
  });

  it('review fix: resolves route mode via useMatch, tolerating a trailing slash on /edit and /gate-in', async () => {
    const fakeEdit = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    repo.current = fakeEdit;
    setLookupRepositories();
    renderDetailPage('/inbound/inbound-plan-1/edit/');
    expect(await screen.findByTestId('inbound-edit-panel')).toBeTruthy();
    cleanup();

    const fakeGateIn = new FakeInboundPlanRepository([makePlan({ status: 'Planned' })]);
    repo.current = fakeGateIn;
    renderDetailPage('/inbound/inbound-plan-1/gate-in/');
    expect(await screen.findByTestId('inbound-gate-in-panel')).toBeTruthy();
  });

  it('review fix: does not mistake a plan whose id literally equals "edit" or "gate-in" on the plain detail route for the edit/gate-in route', async () => {
    const fakeEditId = new FakeInboundPlanRepository([
      makePlan({ id: 'edit', status: 'Draft', sourceDocumentNumber: 'ASN-EDIT-ID' }),
    ]);
    repo.current = fakeEditId;
    renderDetailPage('/inbound/edit');
    await screen.findByTestId('inbound-operator-header');
    expect(screen.queryByTestId('inbound-edit-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();
    cleanup();

    const fakeGateInId = new FakeInboundPlanRepository([
      makePlan({ id: 'gate-in', status: 'Planned', sourceDocumentNumber: 'ASN-GATE-IN-ID' }),
    ]);
    repo.current = fakeGateInId;
    renderDetailPage('/inbound/gate-in');
    await screen.findByTestId('inbound-operator-header');
    expect(screen.queryByTestId('inbound-gate-in-panel')).toBeNull();
    expect(screen.queryByTestId('inbound-edit-panel')).toBeNull();
    // Confirms genuine 'detail' mode (not a false 'edit'/'gate-in' match): the CTA,
    // which only renders in mode === 'detail', is present for this Planned plan.
    expect(screen.getByRole('link', { name: 'Bắt đầu nhận hàng' })).toHaveProperty(
      'href',
      expect.stringContaining('/inbound-receiving/gate-in'),
    );
  });

  it('shows the lifecycle badge and expand/collapse toggle regardless of document status', async () => {
    const actor = userEvent.setup();
    const fake = new FakeInboundPlanRepository([
      makePlan({
        status: 'Closed',
        gateInStatus: 'Recorded',
        gateInAt: '2026-06-22T09:00:00.000Z',
      }),
    ]);
    repo.current = fake;
    renderDetailPage();

    const header = await screen.findByTestId('inbound-operator-header');
    // Lifecycle badge keeps the `Chứng từ:` prefix; never a bare `Đã đóng`.
    expect(within(header).getByText('Chứng từ: Đã đóng')).toBeTruthy();
    expect(within(header).queryByText('Đã đóng')).toBeNull();

    const toggle = within(header).getByTestId('inbound-operator-header-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await actor.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(within(header).getByTestId('inbound-operator-header-details')).toBeTruthy();
  });

  it('shows permission denied read-only state when the plan read is forbidden', async () => {
    const fake = new FakeInboundPlanRepository();
    fake.getById = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No inbound read' })),
    );
    repo.current = fake;
    renderDetailPage();

    expect(await screen.findByText(/Không có quyền đọc kế hoạch nhập kho/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tạo kế hoạch nhập kho' })).toBeNull();
  });

  it('IFB-24: shows Sửa/Xóa/Xác nhận on the detail header only while Draft, and Xác nhận confirms the plan', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-draft-actions');
    fireEvent.click(screen.getByTestId('inbound-confirm-trigger'));
    await waitFor(() => expect(fake.confirm).toHaveBeenCalledWith('inbound-plan-1'));
  });

  it('IFB-24: hides the detail header Draft actions once the plan is no longer Draft', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Planned' })]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-operator-header');
    expect(screen.queryByTestId('inbound-draft-actions')).toBeNull();
  });

  it('IFB-24: cancels a Draft plan from the detail header after confirming and returns to the list', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-draft-actions');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByTestId('inbound-cancel-trigger'));

    await waitFor(() => expect(fake.cancel).toHaveBeenCalledWith('inbound-plan-1'));
    await waitFor(() => expect(screen.getByTestId('location-probe').textContent).toBe('/inbound'));
    confirmSpy.mockRestore();
  });

  it('IFB-24: opens the edit form pre-filled from the plan and saves via the update mutation', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft' })]);
    repo.current = fake;
    setLookupRepositories();
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-draft-actions');
    fireEvent.click(screen.getByTestId('inbound-edit-trigger'));

    const panel = await screen.findByTestId('inbound-edit-panel');
    expect(within(panel).getByLabelText('Số chứng từ nguồn')).toHaveProperty('value', 'ASN-10001');

    fireEvent.click(within(panel).getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() =>
      expect(fake.update).toHaveBeenCalledWith(
        'inbound-plan-1',
        expect.objectContaining({ sourceDocumentNumber: 'ASN-10001', supplierId: 'supplier-1' }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );
  });

  it('IFB-24: redirects away from the edit route once the plan is no longer Draft', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Planned' })]);
    repo.current = fake;
    renderDetailPage('/inbound/inbound-plan-1/edit');

    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/inbound/inbound-plan-1'),
    );
    expect(screen.queryByTestId('inbound-edit-panel')).toBeNull();
  });

  it("IFB-24: shows the newly-routed plan's own data when navigating directly between two /edit routes, not the previous plan's stale values", async () => {
    const planA = makePlan({ id: 'plan-a', sourceDocumentNumber: 'ASN-PLAN-A', status: 'Draft' });
    const planB = makePlan({ id: 'plan-b', sourceDocumentNumber: 'ASN-PLAN-B', status: 'Draft' });
    const fake = new FakeInboundPlanRepository([planA, planB]);
    repo.current = fake;
    setLookupRepositories();
    // Pre-seed planB's detail query cache so navigating to it resolves INSTANTLY
    // (no loading gap that would itself unmount/remount the panel and mask the bug --
    // the real-world case this guards is a warm cache, e.g. planB was already open
    // earlier in the session).
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(inboundPlanQueryKeys.detail('plan-b'), planB);
    renderDetailPage('/inbound/plan-a/edit', client);

    const panelA = await screen.findByTestId('inbound-edit-panel');
    expect(within(panelA).getByLabelText('Số chứng từ nguồn')).toHaveProperty('value', 'ASN-PLAN-A');

    act(() => {
      (window as unknown as { __testNavigate: (to: string) => void }).__testNavigate('/inbound/plan-b/edit');
    });

    await waitFor(() =>
      expect(
        within(screen.getByTestId('inbound-edit-panel')).getByLabelText('Số chứng từ nguồn'),
      ).toHaveProperty('value', 'ASN-PLAN-B'),
    );
  });

  it("IFB-24: preserves an existing Draft line's LineNumber instead of renumbering it by position on save (re-review fix)", async () => {
    const fake = new FakeInboundPlanRepository([
      makePlan({
        status: 'Draft',
        lines: [
          {
            id: 'line-1',
            lineNumber: 3,
            skuId: 'sku-1',
            skuCode: 'SKU-A',
            uomId: 'uom-1',
            uomCode: 'EA',
            expectedQuantity: 12,
            externalLineReference: '10',
          },
        ],
      }),
    ]);
    repo.current = fake;
    setLookupRepositories();
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-draft-actions');
    fireEvent.click(screen.getByTestId('inbound-edit-trigger'));
    const panel = await screen.findByTestId('inbound-edit-panel');

    fireEvent.click(within(panel).getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() =>
      expect(fake.update).toHaveBeenCalledWith(
        'inbound-plan-1',
        expect.objectContaining({ lines: [expect.objectContaining({ lineNumber: 3 })] }),
      ),
    );
  });

  it('IFB-24: disables submit when a Draft has no lines instead of sending an empty lines array (re-review fix)', async () => {
    const fake = new FakeInboundPlanRepository([makePlan({ status: 'Draft', lines: [] })]);
    repo.current = fake;
    setLookupRepositories();
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-draft-actions');
    fireEvent.click(screen.getByTestId('inbound-edit-trigger'));
    const panel = await screen.findByTestId('inbound-edit-panel');

    expect(within(panel).getByRole('button', { name: 'Lưu thay đổi' })).toHaveProperty('disabled', true);
    expect(fake.update).not.toHaveBeenCalled();
  });

  it("IFB-24: disables submit when a line's Số dòng is cleared to a duplicate value (re-review fix)", async () => {
    const fake = new FakeInboundPlanRepository([
      makePlan({
        status: 'Draft',
        lines: [
          {
            id: 'line-1',
            lineNumber: 1,
            skuId: 'sku-1',
            skuCode: 'SKU-A',
            uomId: 'uom-1',
            uomCode: 'EA',
            expectedQuantity: 12,
            externalLineReference: '10',
          },
          {
            id: 'line-2',
            lineNumber: 2,
            skuId: 'sku-1',
            skuCode: 'SKU-A',
            uomId: 'uom-1',
            uomCode: 'EA',
            expectedQuantity: 5,
            externalLineReference: null,
          },
        ],
      }),
    ]);
    repo.current = fake;
    setLookupRepositories();
    renderDetailPage('/inbound/inbound-plan-1');

    await screen.findByTestId('inbound-draft-actions');
    fireEvent.click(screen.getByTestId('inbound-edit-trigger'));
    const panel = await screen.findByTestId('inbound-edit-panel');

    const lineNumberInputs = within(panel).getAllByLabelText('Số dòng');
    fireEvent.change(lineNumberInputs[1], { target: { value: '1' } });

    expect(within(panel).getByRole('button', { name: 'Lưu thay đổi' })).toHaveProperty('disabled', true);
    expect(fake.update).not.toHaveBeenCalled();
  });

});
