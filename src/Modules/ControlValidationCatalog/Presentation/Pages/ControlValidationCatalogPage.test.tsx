// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { IControlValidationCatalogRepository } from '@modules/ControlValidationCatalog/Application/Interfaces/IControlValidationCatalogRepository';
import { CONTROL_VALIDATION_SEED_CATALOG } from '@modules/ControlValidationCatalog/Domain/Constants/ControlValidationSeedCatalog';

const repo = vi.hoisted(() => ({ current: null as unknown as IControlValidationCatalogRepository }));

vi.mock(
  '@modules/ControlValidationCatalog/Infrastructure/Repositories/ControlValidationCatalogRepositoryInstance',
  () => ({
    get controlValidationCatalogRepository() {
      return repo.current;
    },
  }),
);

import { ControlValidationCatalogPage } from '@modules/ControlValidationCatalog/Presentation/Pages/ControlValidationCatalogPage';

class FakeRepository implements IControlValidationCatalogRepository {
  getCatalog = vi.fn(() => Promise.resolve(CONTROL_VALIDATION_SEED_CATALOG));
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ControlValidationCatalogPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  repo.current = new FakeRepository();
});

afterEach(() => cleanup());

describe('ControlValidationCatalogPage (C18)', () => {
  it('renders both C8 catalogs from seed fixtures and stays read-only (AC1/AC2/AC3/AC5)', async () => {
    const actor = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Danh mục kiểm soát và xác thực')).toBeTruthy();
    expect(await screen.findByText('RBAC-VAL-01')).toBeTruthy();
    expect(screen.getByText('RBAC-VAL-05')).toBeTruthy();
    expect(screen.getAllByText('Dời sang C9').length).toBeGreaterThan(0);

    await actor.click(screen.getByRole('tab', { name: /Ngoại lệ kiểm soát/i }));
    expect(screen.getByText('CTRL-EX-09')).toBeTruthy();
    expect(screen.getAllByText('Deferred V1+').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('CTRL-EX-09 bằng chứng: bắt buộc')).toBeTruthy();

    expect(screen.queryByRole('button', { name: /create|update|delete/i })).toBeNull();
  });

  it('filters code, category, and deferred metadata across tabs (AC1/AC3)', async () => {
    const actor = userEvent.setup();
    renderPage();

    await screen.findByText('RBAC-VAL-01');
    await actor.type(screen.getByLabelText(/Lọc danh mục/i), 'ManualDataFix');
    await actor.click(screen.getByRole('tab', { name: /Ngoại lệ kiểm soát/i }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('CTRL-EX-09')).toBeTruthy();
    expect(within(table).queryByText('CTRL-EX-01')).toBeNull();
  });

  it('shows permission denied when the read source 403s (AC4)', async () => {
    repo.current = {
      getCatalog: vi.fn(() =>
        Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
      ),
    };

    renderPage();

    expect((await screen.findAllByText(/không có quyền/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
