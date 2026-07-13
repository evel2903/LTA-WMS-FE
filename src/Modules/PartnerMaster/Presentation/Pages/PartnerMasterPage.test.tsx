// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderToStaticMarkup } from 'react-dom/server';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import type { PaginatedResponse } from '@shared/Types/Api';
import type { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import type { Partner } from '@modules/PartnerMaster/Domain/Types/Partner';
import type {
  CreatePartnerInput,
  PartnerListFilter,
  UpdatePartnerInput,
} from '@modules/PartnerMaster/Domain/Types/PartnerQuery';

const repo = vi.hoisted(() => ({ current: null as unknown as IPartnerRepository }));
vi.mock('@modules/PartnerMaster/Infrastructure/Repositories/PartnerRepositoryInstance', () => ({
  get partnerRepository() {
    return repo.current;
  },
}));
const reasonCodeOptions = vi.hoisted(() => ({
  useReasonCodeOptions: vi.fn(() => ({
    options: [{ value: 'RC-CANCEL', label: 'RC-CANCEL - Ngưng kích hoạt đối tác' }],
    isLoading: false,
    isError: false,
  })),
}));
vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: reasonCodeOptions.useReasonCodeOptions,
}));

import { PartnerMasterPage } from '@modules/PartnerMaster/Presentation/Pages/PartnerMasterPage';
import { PartnerMasterDetailPage } from '@modules/PartnerMaster/Presentation/Pages/PartnerMasterDetailPage';
import { PartnerStatusBadge } from '@modules/PartnerMaster/Presentation/Components/PartnerStatusBadge';
import {
  displayPartnerStatus,
  displayPartnerType,
} from '@modules/PartnerMaster/Presentation/Constants/PartnerDisplayText';

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 };
}

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: 'partner-1',
    partnerCode: 'SUP-001',
    partnerName: 'Acme Supplier',
    partnerType: 'Supplier',
    status: 'Active',
    sourceSystem: 'SAP',
    externalReference: 'SAP-SUP-001',
    referenceText: 'Legacy supplier reference',
    createdAt: '2026-06-22T00:00:00.000Z',
    updatedAt: '2026-06-22T00:00:00.000Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

class FakeRepository implements Partial<IPartnerRepository> {
  items: Partner[];

  constructor(initial: Partner[] = []) {
    this.items = initial;
  }

  list = vi.fn((filter?: PartnerListFilter) =>
    Promise.resolve(
      page(
        this.items.filter((item) => {
          if (filter?.partnerType && item.partnerType !== filter.partnerType) return false;
          if (filter?.status && item.status !== filter.status) return false;
          if (filter?.partnerCode && !item.partnerCode.includes(filter.partnerCode)) return false;
          if (filter?.partnerName && !item.partnerName.includes(filter.partnerName)) return false;
          if (
            filter?.externalReference &&
            !item.externalReference.includes(filter.externalReference)
          ) {
            return false;
          }
          return true;
        }),
      ),
    ),
  );

  getById = vi.fn((id: string) =>
    Promise.resolve(this.items.find((item) => item.id === id) ?? this.items[0]),
  );

  create = vi.fn((input: CreatePartnerInput) => {
    const created = makePartner({
      id: `partner-${this.items.length + 1}`,
      partnerCode: input.partnerCode,
      partnerName: input.partnerName,
      partnerType: input.partnerType,
      status: input.status,
      sourceSystem: input.sourceSystem,
      externalReference: input.externalReference,
      referenceText: input.referenceText ?? null,
    });
    this.items = [created, ...this.items];
    return Promise.resolve(created);
  });

  update = vi.fn((id: string, input: UpdatePartnerInput) => {
    const index = this.items.findIndex((item) => item.id === id);
    this.items[index] = { ...this.items[index], ...input };
    return Promise.resolve(this.items[index]);
  });

  deactivate = vi.fn((id: string) => {
    const index = this.items.findIndex((item) => item.id === id);
    this.items[index] = { ...this.items[index], status: 'Inactive' };
    return Promise.resolve(this.items[index]);
  });
}

function renderPage(initialEntries: string[] = [ROUTES.FOUNDATION.MASTER_DATA.PARTNERS]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS} element={<PartnerMasterPage />} />
          <Route
            path={ROUTES.FOUNDATION.MASTER_DATA.PARTNER_NEW}
            element={<PartnerMasterDetailPage mode="create" />}
          />
          <Route
            path={ROUTES.FOUNDATION.MASTER_DATA.PARTNER_DETAIL()}
            element={<PartnerMasterDetailPage mode="detail" />}
          />
          <Route
            path={ROUTES.FOUNDATION.MASTER_DATA.PARTNER_EDIT()}
            element={<PartnerMasterDetailPage mode="edit" />}
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

describe('PartnerMasterPage', () => {
  it('hiển thị trạng thái đối tác bằng Badge thống nhất', () => {
    const activeHtml = renderToStaticMarkup(<PartnerStatusBadge status="Active" />);
    const inactiveHtml = renderToStaticMarkup(<PartnerStatusBadge status="Inactive" />);

    expect(displayPartnerStatus('Active')).toBe('Đang hoạt động');
    expect(displayPartnerStatus('Inactive')).toBe('Ngừng hoạt động');
    expect(displayPartnerType('Supplier')).toBe('Nhà cung cấp');
    expect(displayPartnerType('Customer')).toBe('Khách hàng');
    expect(displayPartnerType('Carrier')).toBe('Đơn vị vận chuyển');
    expect(displayPartnerStatus(' Active ')).toBe('Đang hoạt động');
    expect(displayPartnerStatus('   ')).toBe('-');
    expect(displayPartnerStatus('Suspended')).toBe('Suspended');
    expect(displayPartnerStatus(undefined)).toBe('-');
    expect(displayPartnerType(' Supplier ')).toBe('Nhà cung cấp');
    expect(displayPartnerType('   ')).toBe('-');
    expect(displayPartnerType('Broker')).toBe('Broker');
    expect(displayPartnerType(undefined)).toBe('-');

    expect(activeHtml).toContain('data-slot="badge"');
    expect(activeHtml).toContain('Đang hoạt động');
    expect(activeHtml).not.toContain('>Active<');

    expect(inactiveHtml).toContain('data-slot="badge"');
    expect(inactiveHtml).toContain('Ngừng hoạt động');
    expect(inactiveHtml).not.toContain('>Inactive<');

    const unknownHtml = renderToStaticMarkup(<PartnerStatusBadge status="Suspended" />);
    expect(unknownHtml).toContain('Suspended');
  });

  it('creates, edits and deactivates Supplier/Customer/Carrier through the repository', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository();
    repo.current = fake as unknown as IPartnerRepository;
    renderPage();

    await actor.click(await screen.findByRole('link', { name: 'Tạo đối tác' }));
    await actor.type(await screen.findByLabelText('Mã đối tác'), 'SUP-001');
    await actor.type(screen.getByLabelText('Tên đối tác'), 'Acme Supplier');
    await actor.selectOptions(screen.getByLabelText('Loại đối tác'), 'Supplier');
    await actor.type(screen.getByLabelText('Hệ thống nguồn'), 'SAP');
    await actor.type(screen.getByLabelText('Tham chiếu ngoài'), 'SAP-SUP-001');
    await actor.click(screen.getByRole('button', { name: 'Tạo đối tác' }));

    await waitFor(() =>
      expect(fake.create).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerCode: 'SUP-001',
          partnerType: 'Supplier',
          sourceSystem: 'SAP',
          externalReference: 'SAP-SUP-001',
        }),
      ),
    );
    await screen.findByRole('heading', { name: 'SUP-001' });

    await actor.click(screen.getByRole('link', { name: 'Chỉnh sửa đối tác' }));
    const updateButton = await screen.findByRole('button', { name: 'Cập nhật đối tác' });
    const editForm = updateButton.closest('form') as HTMLFormElement;
    expect(within(editForm).queryByLabelText('Loại đối tác')).toBeNull();
    expect(within(editForm).getByText('Nhà cung cấp')).toBeTruthy();
    await actor.clear(within(editForm).getByLabelText('Tên đối tác'));
    await actor.type(within(editForm).getByLabelText('Tên đối tác'), 'Acme Supplier Updated');
    await actor.click(updateButton);

    await waitFor(() =>
      expect(fake.update).toHaveBeenCalledWith(
        'partner-1',
        expect.objectContaining({ partnerName: 'Acme Supplier Updated' }),
      ),
    );
    expect(fake.update.mock.calls[0]?.[1]).not.toHaveProperty('partnerType');
    expect(await screen.findByDisplayValue('Acme Supplier Updated')).toBeTruthy();

    await actor.click(screen.getByRole('link', { name: 'Chỉnh sửa đối tác' }));
    const refreshedUpdateButton = await screen.findByRole('button', { name: 'Cập nhật đối tác' });
    const refreshedForm = refreshedUpdateButton.closest('form') as HTMLFormElement;
    await actor.click(within(refreshedForm).getByLabelText('Mã lý do'));
    await actor.click(await screen.findByRole('option', { name: /RC-CANCEL/ }));
    await actor.click(within(refreshedForm).getByRole('button', { name: 'Ngưng kích hoạt đối tác' }));

    await waitFor(() =>
      expect(fake.deactivate).toHaveBeenCalledWith('partner-1', { reasonCode: 'RC-CANCEL' }),
    );
    await waitFor(() => expect(screen.getAllByText('Ngừng hoạt động').length).toBeGreaterThan(0));
  });

  it('shows read-only denied behavior when list is forbidden', async () => {
    const fake = new FakeRepository();
    fake.list = vi.fn(() =>
      Promise.reject(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'No partner read' })),
    );
    repo.current = fake as unknown as IPartnerRepository;
    renderPage();

    expect((await screen.findAllByText(/không có quyền/i)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Tạo đối tác' })).toBeNull();
  });

  it('passes partner name filter to the repository', async () => {
    const actor = userEvent.setup();
    const fake = new FakeRepository([
      makePartner({ id: 'partner-1', partnerCode: 'SUP-001', partnerName: 'Acme Supplier' }),
      makePartner({ id: 'partner-2', partnerCode: 'CAR-001', partnerName: 'Fast Carrier' }),
    ]);
    repo.current = fake as unknown as IPartnerRepository;
    renderPage();

    expect((await screen.findAllByText('SUP-001')).length).toBeGreaterThan(0);
    await actor.type(screen.getByLabelText('Tên đối tác'), 'Acme');

    await waitFor(() =>
      expect(fake.list).toHaveBeenLastCalledWith(expect.objectContaining({ partnerName: 'Acme' })),
    );
  });
});
