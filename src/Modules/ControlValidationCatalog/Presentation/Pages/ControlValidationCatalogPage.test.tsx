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
    const { container } = renderPage();

    expect(await screen.findByText('Danh mục kiểm soát và xác thực')).toBeTruthy();
    expect((await screen.findAllByText('RBAC-VAL-01')).length).toBeGreaterThan(0);
    expect(container.querySelector('.overflow-x-auto table')).toBeTruthy();
    expect(screen.getAllByText('RBAC-VAL-05').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dời sang C9').length).toBeGreaterThan(0);

    await actor.click(screen.getByRole('tab', { name: /Ngoại lệ kiểm soát/i }));
    expect(screen.getAllByText('CTRL-EX-09').length).toBeGreaterThan(0);
    expect(container.querySelector('.overflow-x-auto table')).toBeTruthy();
    expect(screen.getAllByText('Hoãn sau V1').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('CTRL-EX-09 bằng chứng: bắt buộc').length).toBeGreaterThan(0);

    expect(screen.queryByRole('button', { name: /create|update|delete/i })).toBeNull();
  });

  it('filters code, category, and deferred metadata across tabs (AC1/AC3)', async () => {
    const actor = userEvent.setup();
    renderPage();

    await screen.findAllByText('RBAC-VAL-01');
    await actor.type(screen.getByRole('textbox', { name: 'Lọc danh mục' }), 'Sửa dữ liệu thủ công');
    await actor.click(screen.getByRole('tab', { name: /Ngoại lệ kiểm soát/i }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('CTRL-EX-09')).toBeTruthy();
    expect(within(table).getByText('Sửa dữ liệu thủ công')).toBeTruthy();
    expect(within(table).queryByText('CTRL-EX-01')).toBeNull();
  });

  it('surfaces a missing linked CTRL-EX setup instead of treating it as not applicable', async () => {
    repo.current = {
      getCatalog: vi.fn(() =>
        Promise.resolve({
          validationRules: [
            {
              ...CONTROL_VALIDATION_SEED_CATALOG.validationRules[0],
              code: 'RBAC-VAL-MISSING',
              controlExceptionCode: ' CTRL-EX-MISSING ',
            },
          ],
          controlExceptions: [],
        }),
      ),
    };

    renderPage();

    expect((await screen.findAllByText('Thiếu cấu hình CTRL-EX-MISSING')).length).toBeGreaterThan(0);
  });

  it('keeps the linked CTRL-EX setup when the exception code has whitespace', async () => {
    repo.current = {
      getCatalog: vi.fn(() =>
        Promise.resolve({
          validationRules: [
            {
              ...CONTROL_VALIDATION_SEED_CATALOG.validationRules[0],
              code: 'RBAC-VAL-SPACED',
              controlExceptionCode: 'CTRL-EX-01',
            },
          ],
          controlExceptions: [
            {
              ...CONTROL_VALIDATION_SEED_CATALOG.controlExceptions[0],
              code: ' CTRL-EX-01 ',
            },
          ],
        }),
      ),
    };

    renderPage();

    expect((await screen.findAllByText('RBAC-VAL-SPACED')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Thiếu cấu hình/)).toBeNull();
    expect(screen.getAllByText('Cao').length).toBeGreaterThan(0);
  });

  it('shows unknown requirement labels when boolean metadata is missing', async () => {
    repo.current = {
      getCatalog: vi.fn(() =>
        Promise.resolve({
          validationRules: [
            {
              ...CONTROL_VALIDATION_SEED_CATALOG.validationRules[0],
              code: 'RBAC-VAL-UNKNOWN',
              controlExceptionCode: 'CTRL-EX-UNKNOWN',
            },
          ],
          controlExceptions: [
            {
              ...CONTROL_VALIDATION_SEED_CATALOG.controlExceptions[0],
              code: 'CTRL-EX-UNKNOWN',
              evidenceRequired: null as unknown as boolean,
            },
          ],
        }),
      ),
    };

    renderPage();

    expect((await screen.findAllByText('Không xác định')).length).toBeGreaterThan(0);
  });

  it('shows permission denied when the read source 403s (AC4)', async () => {
    repo.current = {
      getCatalog: vi.fn(() =>
        Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' })),
      ),
    };

    renderPage();

    expect((await screen.findAllByText(/không có quyền/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
