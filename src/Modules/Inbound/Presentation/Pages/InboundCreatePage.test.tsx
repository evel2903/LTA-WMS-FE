// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import type { InboundLineImportPreview } from '@modules/Inbound/Domain/Types/InboundPlan';
import type { CreateInboundPlanInput } from '@modules/Inbound/Domain/Types/InboundPlanQuery';

type MutateOpts<T> = { onSuccess?: (data: T) => void };
type PreviewVars = { file: File; scope: { warehouseId: string; ownerId: string } };
type CommitVars = { file: File; header: Omit<CreateInboundPlanInput, 'lines'> };

const h = vi.hoisted(() => ({
  navigate: vi.fn<(to: string) => void>(),
  downloadBlob: vi.fn<(blob: Blob, fileName: string) => void>(),
  preview: { current: null as InboundLineImportPreview | null },
  download: vi.fn<(vars: undefined, opts?: MutateOpts<Blob>) => void>(),
  previewMutate: vi.fn<(vars: PreviewVars, opts?: MutateOpts<InboundLineImportPreview>) => void>(),
  commit: vi.fn<(vars: CommitVars, opts?: MutateOpts<{ id: string }>) => void>(),
  create: vi.fn(),
  activeWarehousesSearch: vi.fn<(search: string | undefined) => void>(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDom>();
  return { ...actual, useNavigate: () => h.navigate };
});

vi.mock('@shared/Utils/DownloadBlob', () => ({ downloadBlob: h.downloadBlob }));

vi.mock('@modules/Inbound/Application/Commands/UseInboundMutations', () => ({
  useInboundMutations: () => ({
    createInboundPlan: { mutate: h.create, isPending: false },
    downloadLineImportTemplate: { mutate: h.download, isPending: false },
    previewLineImport: { mutate: h.previewMutate, isPending: false },
    commitLineImport: { mutate: h.commit, isPending: false },
  }),
}));

const lookup = <T,>(items: T[]) => ({ data: { items }, isLoading: false, isError: false });

vi.mock('@modules/PartnerMaster/Application/Queries/UsePartners', () => ({
  usePartners: () => lookup([{ id: 'supplier-1', partnerCode: 'SUP', partnerName: 'Nhà cung cấp 1' }]),
}));
vi.mock('@modules/MasterData/Application/Queries/CatalogQueries', () => ({
  useActiveOwners: () =>
    lookup([
      { id: 'owner-1', ownerCode: 'OWN', ownerName: 'Chủ hàng 1' },
      { id: 'owner-2', ownerCode: 'OWN2', ownerName: 'Chủ hàng 2' },
    ]),
  useActiveUoms: () => lookup([{ id: 'uom-1', uomCode: 'EA', uomName: 'Cái' }]),
  useSkus: () => lookup([{ id: 'sku-1', skuCode: 'SKU-1', skuName: 'Hàng 1' }]),
}));
vi.mock('@modules/MasterData/Application/Queries/UseSiteLocationTree', () => ({
  useActiveWarehouses: (search?: string) => {
    h.activeWarehousesSearch(search);
    return lookup([{ id: 'wh-1', warehouseCode: 'WH', warehouseName: 'Kho 1' }]);
  },
}));
vi.mock('@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles', () => ({
  useWarehouseProfiles: () => lookup([{ id: 'profile-1', profileCode: 'PRF', profileName: 'Hồ sơ 1' }]),
}));

import { InboundCreatePage } from '@modules/Inbound/Presentation/Pages/InboundCreatePage';

function cleanPreview(): InboundLineImportPreview {
  return {
    fileName: 'lines.xlsx',
    rows: [
      {
        rowNumber: 2,
        skuCode: 'SKU-1',
        uomCode: 'EA',
        expectedQuantity: '12',
        externalLineReference: '10',
        skuId: 'sku-1',
        uomId: 'uom-1',
        errors: [],
      },
    ],
    summary: { total: 1, valid: 1, invalid: 0 },
    headerError: null,
  };
}

function invalidPreview(): InboundLineImportPreview {
  return {
    fileName: 'lines.xlsx',
    rows: [
      {
        rowNumber: 2,
        skuCode: 'SKU-X',
        uomCode: 'EA',
        expectedQuantity: '0',
        externalLineReference: '',
        errors: ['SKU không tồn tại.'],
      },
    ],
    summary: { total: 1, valid: 0, invalid: 1 },
    headerError: null,
  };
}

function field(id: string) {
  return document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
}

function commitButton() {
  return screen.getByRole('button', { name: /Tạo từ file/i });
}

async function selectScope(actor: ReturnType<typeof userEvent.setup>) {
  await actor.selectOptions(field('inbound-owner-id'), 'owner-1');
  await actor.selectOptions(field('inbound-warehouse-id'), 'wh-1');
}

async function fillCommitHeader(actor: ReturnType<typeof userEvent.setup>) {
  await actor.type(field('inbound-source-system'), 'ERP');
  await actor.type(field('inbound-source-document-number'), 'ASN-10001');
  await actor.selectOptions(field('inbound-supplier-id'), 'supplier-1');
}

// The Excel flow now lives inside a popup opened from the "Import Excel" button.
async function openImport(actor: ReturnType<typeof userEvent.setup>) {
  await actor.click(screen.getByRole('button', { name: 'Import Excel' }));
}

function renderPage() {
  return render(
    <MemoryRouter>
      <InboundCreatePage />
    </MemoryRouter>,
  );
}

describe('InboundCreatePage Excel import (IFB-03)', () => {
  beforeEach(() => {
    h.navigate.mockReset();
    h.downloadBlob.mockReset();
    h.create.mockReset();
    h.preview.current = null;
    h.download.mockReset().mockImplementation((_vars, opts) => opts?.onSuccess?.(new Blob(['x'])));
    h.previewMutate.mockReset().mockImplementation((_vars, opts) => {
      if (h.preview.current) opts?.onSuccess?.(h.preview.current);
    });
    h.commit.mockReset().mockImplementation((_vars, opts) => opts?.onSuccess?.({ id: 'inbound-plan-1' }));
  });

  afterEach(() => cleanup());

  it('downloads the .xlsx template via the repository and triggers a browser download', async () => {
    const actor = userEvent.setup();
    renderPage();
    await openImport(actor);

    await actor.click(screen.getByRole('button', { name: /Tải template Excel/i }));

    expect(h.download).toHaveBeenCalledTimes(1);
    expect(h.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'inbound-line-template.xlsx');
  });

  it('keeps the upload disabled until a warehouse and owner scope is chosen', async () => {
    const actor = userEvent.setup();
    renderPage();
    await openImport(actor);
    expect((field('inbound-excel-import') as HTMLInputElement).disabled).toBe(true);
  });

  it('previews an upload with scope and shows summary + per-row errors without committing', async () => {
    const actor = userEvent.setup();
    h.preview.current = invalidPreview();
    renderPage();

    await selectScope(actor);
    await openImport(actor);
    await actor.upload(field('inbound-excel-import') as HTMLInputElement, new File(['x'], 'lines.xlsx'));

    expect(h.previewMutate).toHaveBeenCalledTimes(1);
    const previewVars = h.previewMutate.mock.calls[0][0];
    expect(previewVars.file).toBeInstanceOf(File);
    expect(previewVars.scope).toEqual({ warehouseId: 'wh-1', ownerId: 'owner-1' });
    const panel = await screen.findByTestId('inbound-excel-import-preview');
    expect(panel.textContent).toContain('SKU không tồn tại.');
    // Invalid rows must block commit and never create a plan during preview.
    expect(commitButton().hasAttribute('disabled')).toBe(true);
    expect(h.commit).not.toHaveBeenCalled();
    // File input value is reset so re-selecting the same corrected file re-fires onChange.
    expect((field('inbound-excel-import') as HTMLInputElement).value).toBe('');
  });

  it('invalidates a stale preview when the warehouse/owner scope changes after preview', async () => {
    const actor = userEvent.setup();
    h.preview.current = cleanPreview();
    renderPage();

    await selectScope(actor);
    await openImport(actor);
    await actor.upload(field('inbound-excel-import') as HTMLInputElement, new File(['x'], 'lines.xlsx'));
    expect(await screen.findByTestId('inbound-excel-import-preview')).toBeTruthy();

    // Switch owner A -> B: the preview was validated server-side against the old scope, so it
    // must be dropped (no committing a file validated under a different scope).
    await actor.selectOptions(field('inbound-owner-id'), 'owner-2');

    await waitFor(() =>
      expect(screen.queryByTestId('inbound-excel-import-preview')).toBeNull(),
    );
    expect(screen.queryByRole('button', { name: /Tạo từ file/i })).toBeNull();
  });

  it('commits a clean preview with the page header and navigates to the new plan', async () => {
    const actor = userEvent.setup();
    h.preview.current = cleanPreview();
    renderPage();

    await selectScope(actor);
    await fillCommitHeader(actor);
    await openImport(actor);
    await actor.upload(field('inbound-excel-import') as HTMLInputElement, new File(['x'], 'lines.xlsx'));

    await waitFor(() => expect(commitButton().hasAttribute('disabled')).toBe(false));
    await actor.click(commitButton());

    expect(h.commit).toHaveBeenCalledTimes(1);
    const commitVars = h.commit.mock.calls[0][0];
    expect(commitVars.file).toBeInstanceOf(File);
    expect(commitVars.header).toMatchObject({
      sourceSystem: 'ERP',
      sourceDocumentNumber: 'ASN-10001',
      supplierId: 'supplier-1',
      ownerId: 'owner-1',
      warehouseId: 'wh-1',
    });
    expect(h.navigate).toHaveBeenCalledWith(ROUTES.INBOUND.DETAIL('inbound-plan-1'));
  });
});

describe('InboundCreatePage warehouse search (IFB-16)', () => {
  afterEach(() => cleanup());

  it('debounces typed warehouse search text and forwards it to useActiveWarehouses', async () => {
    h.activeWarehousesSearch.mockClear();
    const actor = userEvent.setup();
    renderPage();

    expect(h.activeWarehousesSearch).toHaveBeenCalledWith('');

    await actor.type(screen.getByLabelText('Tìm kiếm Kho'), 'HCM');

    await waitFor(() => expect(h.activeWarehousesSearch).toHaveBeenCalledWith('HCM'));
  });

  it('still selects a warehouse option through the underlying select', async () => {
    const actor = userEvent.setup();
    renderPage();

    await actor.selectOptions(field('inbound-warehouse-id'), 'wh-1');
    expect((field('inbound-warehouse-id') as HTMLSelectElement).value).toBe('wh-1');
  });

  it('clears the selected warehouse once the search debounce settles (review-fix)', async () => {
    const actor = userEvent.setup();
    renderPage();

    await actor.selectOptions(field('inbound-warehouse-id'), 'wh-1');
    expect((field('inbound-warehouse-id') as HTMLSelectElement).value).toBe('wh-1');

    await actor.type(screen.getByLabelText('Tìm kiếm Kho'), 'H');

    await waitFor(() => expect((field('inbound-warehouse-id') as HTMLSelectElement).value).toBe(''));
  });
});
