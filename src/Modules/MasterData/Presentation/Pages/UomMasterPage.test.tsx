// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PaginatedResponse } from '@shared/Types/Api';
import type { ICatalogRepository } from '@modules/MasterData/Application/Interfaces/ICatalogRepository';
import type { Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { UomListFilter } from '@modules/MasterData/Domain/Types/CatalogQuery';

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
  uom = makeUom();

  listUoms = vi.fn((_filter?: UomListFilter) => Promise.resolve(page([this.uom])));
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
  it('maps Vietnamese UOM type filter labels back to raw query values', async () => {
    const fake = new FakeCatalogRepository();
    repo.current = fake as unknown as ICatalogRepository;
    const actor = userEvent.setup();
    renderUomPage();

    expect((await screen.findAllByRole('button', { name: 'EA' })).length).toBeGreaterThan(0);

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
});
