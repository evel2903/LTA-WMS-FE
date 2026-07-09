// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SiteMasterPage } from '@modules/MasterData/Presentation/Pages/SiteMasterPage';

const mutationSpies = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}));

function siteNode(overrides: { id: string; siteCode: string; siteName: string; status?: string }) {
  return {
    id: overrides.id,
    type: 'site' as const,
    label: overrides.siteCode,
    status: overrides.status ?? 'Active',
    entity: {
      id: overrides.id,
      siteCode: overrides.siteCode,
      siteName: overrides.siteName,
      status: overrides.status ?? 'Active',
      sourceSystem: null,
      referenceId: null,
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    },
    children: [],
  };
}

const treeData = vi.hoisted(() => ({
  nodes: [
    siteNode({ id: 'site-1', siteCode: 'SITE-HCM', siteName: 'Trung tâm HCM' }),
    siteNode({ id: 'site-2', siteCode: 'SITE-HN', siteName: 'Trung tâm Hà Nội', status: 'Inactive' }),
  ],
  isLoading: false,
  error: null as Error | null,
}));

vi.mock('@modules/MasterData/Application/Queries/UseSiteLocationTree', () => ({
  useSiteLocationTree: () => ({ data: treeData.nodes, isLoading: treeData.isLoading, error: treeData.error }),
}));

vi.mock('@modules/ReasonCode/Application/Queries/UseReasonCodeOptions', () => ({
  useReasonCodeOptions: () => ({
    options: [{ value: 'RC-MD-UPDATE', label: 'RC-MD-UPDATE - Cập nhật master data' }],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@modules/MasterData/Application/Commands/UseMasterDataMutations', () => ({
  useMasterDataMutations: () => ({
    createSite: { isPending: false, mutate: mutationSpies.create },
    updateSite: { isPending: false, mutate: mutationSpies.update },
  }),
}));

afterEach(() => {
  cleanup();
  mutationSpies.create.mockClear();
  mutationSpies.update.mockClear();
});

describe('SiteMasterPage', () => {
  it('renders the site list, filters by search/status, and creates a site', async () => {
    render(<SiteMasterPage />);

    expect(screen.getByRole('heading', { name: 'Site' })).toBeTruthy();
    expect(screen.getAllByText('SITE-HCM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SITE-HN').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('Tìm'), { target: { value: 'HCM' } });
    await waitFor(() => expect(screen.queryByText('SITE-HN')).toBeNull());
    expect(screen.getAllByText('SITE-HCM').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Tìm'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Tạo site' }));
    const createDialog = screen.getByRole('dialog', { name: 'Tạo site' });
    fireEvent.change(within(createDialog).getByLabelText('Mã site'), { target: { value: 'SITE-DN' } });
    fireEvent.change(within(createDialog).getByLabelText('Tên site'), { target: { value: 'Trung tâm Đà Nẵng' } });
    fireEvent.click(within(createDialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(createDialog).getByRole('button', { name: 'Tạo site' }));

    await waitFor(() => expect(mutationSpies.create).toHaveBeenCalled());
    const [createPayload] = mutationSpies.create.mock.calls[0] as [{ siteCode: string; siteName: string }];
    expect(createPayload.siteCode).toBe('SITE-DN');
  });

  it('opens the edit dialog for an existing site and submits the update', async () => {
    render(<SiteMasterPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Sửa' })[0]);
    const editDialog = screen.getByRole('dialog', { name: 'Cập nhật site' });
    expect(within(editDialog).getByLabelText<HTMLInputElement>('Mã site').value).toBe('SITE-HCM');

    fireEvent.change(within(editDialog).getByLabelText('Tên site'), { target: { value: 'HCM cập nhật' } });
    fireEvent.click(within(editDialog).getByLabelText('Mã lý do'));
    fireEvent.click(screen.getByRole('option', { name: /RC-MD-UPDATE/ }));
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Cập nhật site' }));

    await waitFor(() => expect(mutationSpies.update).toHaveBeenCalled());
    const [updatePayload] = mutationSpies.update.mock.calls[0] as [{ id: string; input: { siteName: string } }];
    expect(updatePayload.id).toBe('site-1');
    expect(updatePayload.input.siteName).toBe('HCM cập nhật');
  });
});
