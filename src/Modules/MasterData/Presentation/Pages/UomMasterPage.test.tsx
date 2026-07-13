// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PaginatedResponse } from '@shared/Types/Api';
import type { ICatalogRepository } from '@modules/MasterData/Application/Interfaces/ICatalogRepository';
import type { Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { CreateUomInput, UomListFilter } from '@modules/MasterData/Domain/Types/CatalogQuery';

vi.mock('@shared/Services/Http/ApiClient', () => ({ httpClient: {} }));

const repo = vi.hoisted(() => ({ current: null as unknown as ICatalogRepository }));

vi.mock('@modules/MasterData/Infrastructure/Repositories/CatalogRepositoryInstance', () => ({
  get catalogRepository() {
    return repo.current;
  },
}));

import { UomMasterPage } from '@modules/MasterData/Presentation/Pages/UomMasterPage';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function makeUom(overrides: Partial<Uom> = {}): Uom {
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
    ...overrides,
  };
}

class FakeCatalogRepository implements Partial<ICatalogRepository> {
  uom = makeUom();

  listUoms = vi.fn((_filter?: UomListFilter) => Promise.resolve(page([this.uom])));
  createUom = vi.fn((input: CreateUomInput) =>
    Promise.resolve(makeUom({ id: 'uom-2', uomCode: input.uomCode, uomName: input.uomName })),
  );
  updateUom = vi.fn((id: string, input: Partial<Uom>) =>
    Promise.resolve(makeUom({ ...this.uom, id, ...input })),
  );
}

function renderUomPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UomMasterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UomMasterPage', () => {
  it('renders the catalog with StatusBadge and a Sửa action (no more code-cell navigation link)', async () => {
    const fake = new FakeCatalogRepository();
    repo.current = fake as unknown as ICatalogRepository;
    renderUomPage();

    expect((await screen.findAllByText('EA')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'EA' })).toBeNull();
    expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Sửa' }).length).toBeGreaterThan(0);
  });

  it('maps Vietnamese UOM type filter labels back to raw query values', async () => {
    const fake = new FakeCatalogRepository();
    repo.current = fake as unknown as ICatalogRepository;
    const actor = userEvent.setup();
    renderUomPage();

    await screen.findAllByText('EA');
    await actor.type(screen.getByLabelText('Loại đơn vị tính'), 'Số lượng');

    await waitFor(() =>
      expect(fake.listUoms).toHaveBeenLastCalledWith(
        expect.objectContaining({ uomType: 'Quantity' }),
      ),
    );
    expect(fake.listUoms).not.toHaveBeenLastCalledWith(
      expect.objectContaining({ uomType: 'Số lượng' }),
    );
  });

  it('creates a UOM through the create modal', async () => {
    const fake = new FakeCatalogRepository();
    repo.current = fake as unknown as ICatalogRepository;
    renderUomPage();

    await screen.findAllByText('EA');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đơn vị tính' }));
    const dialog = screen.getByRole('dialog', { name: 'Tạo đơn vị tính' });
    fireEvent.change(within(dialog).getByLabelText('Mã đơn vị tính'), { target: { value: 'BOX' } });
    fireEvent.change(within(dialog).getByLabelText('Tên đơn vị tính'), { target: { value: 'Box' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tạo đơn vị tính' }));

    await waitFor(() => expect(fake.createUom).toHaveBeenCalled());
    const [payload] = fake.createUom.mock.calls[0];
    expect(payload.uomCode).toBe('BOX');
    expect(payload.status).toBe('Active');
  });

  it('opens the edit modal for an existing UOM and submits the update', async () => {
    const fake = new FakeCatalogRepository();
    repo.current = fake as unknown as ICatalogRepository;
    renderUomPage();

    await screen.findAllByText('EA');
    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Cập nhật đơn vị tính' });
    expect(within(dialog).getByLabelText<HTMLInputElement>('Mã đơn vị tính').value).toBe('EA');

    fireEvent.change(within(dialog).getByLabelText('Tên đơn vị tính'), { target: { value: 'Each updated' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cập nhật đơn vị tính' }));

    await waitFor(() => expect(fake.updateUom).toHaveBeenCalled());
    const [id, input] = fake.updateUom.mock.calls[0];
    expect(id).toBe('uom-1');
    expect(input.uomName).toBe('Each updated');
  });
});
