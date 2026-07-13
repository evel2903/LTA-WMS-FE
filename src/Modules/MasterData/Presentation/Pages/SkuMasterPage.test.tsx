// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { ICatalogRepository } from '@modules/MasterData/Application/Interfaces/ICatalogRepository';
import type { IMasterDataRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataRepository';
import type {
  ItemCoverage,
  Owner,
  PackDefinition,
  Sku,
  SkuBarcode,
  Uom,
  UomConversion,
} from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { Warehouse } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  CreateSkuInput,
  SkuListFilter,
  UpdateSkuInput,
} from '@modules/MasterData/Domain/Types/CatalogQuery';

vi.mock('@shared/Services/Http/ApiClient', () => ({ httpClient: {} }));

const repo = vi.hoisted(() => ({ current: null as unknown as ICatalogRepository }));
const masterRepo = vi.hoisted(() => ({
  current: null as unknown as Pick<IMasterDataRepository, 'listWarehouses'>,
}));
vi.mock('@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance', () => ({
  get catalogRepository() {
    return repo.current;
  },
}));
vi.mock('@modules/MasterData/Infrastructure/Repositories/MasterDataRepositoryInstance', () => ({
  get masterDataRepository() {
    return masterRepo.current;
  },
}));

import { SkuMasterDetailPage } from '@modules/MasterData/Presentation/Pages/SkuMasterDetailPage';
import { SkuMasterPage } from '@modules/MasterData/Presentation/Pages/SkuMasterPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function makeSku(overrides: Partial<Sku> = {}): Sku {
  return {
    id: 'sku-1',
    skuCode: 'SKU-001',
    skuName: 'ERP Item',
    defaultOwnerId: null,
    itemClass: 'GENERAL',
    itemStatus: 'Active',
    baseUomId: 'uom-1',
    inventoryUomId: 'uom-1',
    lotControlled: false,
    expiryControlled: false,
    serialControlled: false,
    ownerControlled: false,
    lpnControlled: false,
    temperatureControlled: false,
    dgControlled: false,
    customsControlled: false,
    qcRequired: false,
    bondedFlag: false,
    temperatureClass: null,
    dgClass: null,
    shelfLifeDays: null,
    minRemainingShelfLifeDays: null,
    sourceSystem: 'WMS',
    referenceId: null,
    createdAt: '2026-07-06T00:00:00.000Z',
    updatedAt: '2026-07-06T00:00:00.000Z',
    createdBy: 'admin',
    updatedBy: null,
    ...overrides,
  };
}

function makeUom(): Uom {
  return {
    id: 'uom-1',
    uomCode: 'EA',
    uomName: 'Each',
    uomType: 'Quantity',
    decimalPrecision: 0,
    status: 'Active',
    sourceSystem: 'WMS',
    referenceId: 'EA',
    createdAt: '2026-07-06T00:00:00.000Z',
    updatedAt: '2026-07-06T00:00:00.000Z',
    createdBy: 'seed',
    updatedBy: null,
  };
}

class FakeCatalogRepository implements Partial<ICatalogRepository> {
  sku = makeSku();
  uom = makeUom();

  listSkus = vi.fn((_filter?: SkuListFilter) => Promise.resolve(page([this.sku])));
  getSku = vi.fn((id: string) => Promise.resolve({ ...this.sku, id }));
  listOwners = vi.fn(() => Promise.resolve(page([] as Owner[])));
  listUoms = vi.fn(() => Promise.resolve(page([this.uom])));
  createSku = vi.fn((input: CreateSkuInput) => {
    this.sku = makeSku({
      id: 'sku-2',
      skuCode: input.skuCode,
      skuName: input.skuName,
      itemClass: input.itemClass,
      itemStatus: input.itemStatus,
      baseUomId: input.baseUomId,
      inventoryUomId: input.inventoryUomId,
      sourceSystem: input.sourceSystem ?? 'WMS',
      referenceId: input.referenceId ?? null,
    });
    return Promise.resolve(this.sku);
  });
  updateSku = vi.fn((id: string, input: UpdateSkuInput) => {
    this.sku = makeSku({
      ...this.sku,
      id,
      skuName: input.skuName ?? this.sku.skuName,
      itemStatus: input.itemStatus ?? this.sku.itemStatus,
      updatedAt: '2026-07-06T01:00:00.000Z',
      updatedBy: 'admin',
    });
    return Promise.resolve(this.sku);
  });
  listSkuBarcodes = vi.fn(() => Promise.resolve(page([] as SkuBarcode[])));
  listPackDefinitions = vi.fn(() => Promise.resolve(page([] as PackDefinition[])));
  listUomConversions = vi.fn(() => Promise.resolve(page([] as UomConversion[])));
  listItemCoverages = vi.fn(() => Promise.resolve(page([] as ItemCoverage[])));
}

const fakeMasterRepository: Pick<IMasterDataRepository, 'listWarehouses'> = {
  listWarehouses: vi.fn(() => Promise.resolve(page([] as Warehouse[]))),
};

function renderSkuRoutes(initialEntries: string[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.MASTER_DATA.SKUS} element={<SkuMasterPage />} />
          <Route
            path={ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW}
            element={<SkuMasterDetailPage mode="create" />}
          />
          <Route
            path={ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL()}
            element={<SkuMasterDetailPage mode="detail" />}
          />
          <Route
            path={ROUTES.FOUNDATION.MASTER_DATA.SKU_EDIT()}
            element={<SkuMasterDetailPage mode="edit" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SkuMasterPage UI-managed behavior', () => {
  it('shows the create SKU entrypoint on the list route', async () => {
    repo.current = new FakeCatalogRepository() as unknown as ICatalogRepository;
    masterRepo.current = fakeMasterRepository;
    renderSkuRoutes([ROUTES.FOUNDATION.MASTER_DATA.SKUS]);

    expect((await screen.findAllByText('SKU-001')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Xem' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Tạo SKU' })).toBeTruthy();
  });

  it('creates a SKU from the create route and navigates to detail', async () => {
    const fake = new FakeCatalogRepository();
    repo.current = fake as unknown as ICatalogRepository;
    masterRepo.current = fakeMasterRepository;
    const actor = userEvent.setup();
    renderSkuRoutes([ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW]);

    await screen.findByLabelText('Mã SKU');
    await waitFor(() => expect(screen.getByLabelText('Mã SKU').hasAttribute('disabled')).toBe(false));
    await actor.type(screen.getByLabelText('Mã SKU'), 'SKU-002');
    await actor.type(screen.getByLabelText('Tên SKU'), 'Manual item');
    await actor.type(screen.getByLabelText('Nhóm hàng'), 'GENERAL');
    await actor.click(screen.getByRole('combobox', { name: 'Đơn vị tính cơ sở' }));
    await actor.click(await screen.findByRole('option', { name: 'EA - Each' }));
    await actor.click(screen.getByRole('combobox', { name: 'Đơn vị tính tồn kho' }));
    await actor.click(await screen.findByRole('option', { name: 'EA - Each' }));
    await actor.click(screen.getByRole('button', { name: 'Tạo SKU' }));

    await waitFor(() =>
      expect(fake.createSku).toHaveBeenCalledWith(
        expect.objectContaining({
          skuCode: 'SKU-002',
          skuName: 'Manual item',
          itemClass: 'GENERAL',
          baseUomId: 'uom-1',
          inventoryUomId: 'uom-1',
        }),
      ),
    );
    expect(await screen.findByRole('heading', { name: 'SKU-002' })).toBeTruthy();
  });

  it('allows SKU create while optional owner lookup is still loading when UOM is ready', async () => {
    const fake = new FakeCatalogRepository();
    fake.listOwners.mockImplementation(() => new Promise<PaginatedResponse<Owner>>(() => undefined));
    repo.current = fake as unknown as ICatalogRepository;
    masterRepo.current = fakeMasterRepository;
    const actor = userEvent.setup();
    renderSkuRoutes([ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW]);

    await screen.findByLabelText('Mã SKU');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo SKU' }).hasAttribute('disabled')).toBe(false));
    await actor.type(screen.getByLabelText('Mã SKU'), 'SKU-003');
    await actor.type(screen.getByLabelText('Tên SKU'), 'Owner optional item');
    await actor.type(screen.getByLabelText('Nhóm hàng'), 'GENERAL');
    await actor.click(screen.getByRole('combobox', { name: 'Đơn vị tính cơ sở' }));
    await actor.click(await screen.findByRole('option', { name: 'EA - Each' }));
    await actor.click(screen.getByRole('combobox', { name: 'Đơn vị tính tồn kho' }));
    await actor.click(await screen.findByRole('option', { name: 'EA - Each' }));
    await actor.click(screen.getByRole('button', { name: 'Tạo SKU' }));

    await waitFor(() =>
      expect(fake.createSku).toHaveBeenCalledWith(
        expect.objectContaining({
          skuCode: 'SKU-003',
          defaultOwnerId: undefined,
          baseUomId: 'uom-1',
          inventoryUomId: 'uom-1',
        }),
      ),
    );
  });

  it('updates a SKU from the edit route', async () => {
    const fake = new FakeCatalogRepository();
    repo.current = fake as unknown as ICatalogRepository;
    masterRepo.current = fakeMasterRepository;
    const actor = userEvent.setup();
    renderSkuRoutes([ROUTES.FOUNDATION.MASTER_DATA.SKU_EDIT('sku-1')]);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'SKU-001' })).toBeTruthy());
    const nameInput = screen.getByLabelText('Tên SKU');
    await actor.clear(nameInput);
    await actor.type(nameInput, 'Manual item updated');
    await actor.click(screen.getByRole('button', { name: 'Cập nhật SKU' }));

    await waitFor(() =>
      expect(fake.updateSku).toHaveBeenCalledWith(
        'sku-1',
        expect.objectContaining({ skuName: 'Manual item updated' }),
      ),
    );
  });
});
