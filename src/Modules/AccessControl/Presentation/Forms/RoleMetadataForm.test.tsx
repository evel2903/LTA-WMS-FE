// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@shared/Services/Http/ApiError';
import type { Role } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { UpdateRoleInput } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import { RoleMetadataForm } from '@modules/AccessControl/Presentation/Forms/RoleMetadataForm';

const role: Role = {
  id: 'role-1',
  roleCode: 'CUSTOM_ROLE',
  roleName: 'Original role',
  description: null,
  isSystem: false,
  status: 'ACTIVE',
  permissionsVersion: 2,
  updatedAt: '2026-07-22T06:00:00.123Z',
};
const refreshRole = () => Promise.resolve(role);

afterEach(() => cleanup());

describe('RoleMetadataForm', () => {
  it('submits the server-issued token and custom-role status, then accepts the response as baseline', async () => {
    const onSubmit = vi.fn((_input: UpdateRoleInput) => Promise.resolve({
      ...role,
      roleName: 'Updated role',
      updatedAt: '2026-07-22T06:00:00.124Z',
    }));
    render(<RoleMetadataForm role={role} onSubmit={onSubmit} onRefresh={refreshRole} />);

    fireEvent.change(screen.getByLabelText('Tên vai trò'), { target: { value: 'Updated role' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu metadata' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        expectedUpdatedAt: role.updatedAt,
        roleName: 'Updated role',
      }),
    );
    await waitFor(() => expect(screen.getByDisplayValue('Updated role')).toBeTruthy());
  });

  it('never supplies Status for a system role while still allowing name/description updates', async () => {
    const systemRole = { ...role, roleCode: 'WMS_ADMIN', isSystem: true };
    const onSubmit = vi.fn((_input: UpdateRoleInput) =>
      Promise.resolve({ ...systemRole, roleName: 'Renamed admin' }),
    );
    render(<RoleMetadataForm role={systemRole} onSubmit={onSubmit} onRefresh={() => Promise.resolve(systemRole)} />);

    fireEvent.change(screen.getByLabelText('Tên vai trò'), { target: { value: 'Renamed admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu metadata' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      expectedUpdatedAt: role.updatedAt,
      roleName: 'Renamed admin',
    });
    expect(screen.queryByLabelText('Trạng thái')).toBeNull();
  });

  it('keeps the dirty draft across stale refetch and uses the refreshed token only on explicit resubmit', async () => {
    const stale = new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'Stale',
      details: { Reason: 'ROLE_METADATA_STALE', CurrentUpdatedAt: '2026-07-22T06:00:00.125Z' },
    });
    const current = {
      ...role,
      roleName: 'Changed elsewhere',
      description: 'Concurrent description',
      updatedAt: '2026-07-22T06:00:00.125Z',
    };
    const onSubmit = vi
      .fn<(input: UpdateRoleInput) => Promise<Role>>()
      .mockRejectedValueOnce(stale)
      .mockResolvedValueOnce({ ...current, roleName: 'My draft', updatedAt: '2026-07-22T06:00:00.126Z' });
    const view = render(<RoleMetadataForm role={role} onSubmit={onSubmit} onRefresh={refreshRole} />);

    fireEvent.change(screen.getByLabelText('Tên vai trò'), { target: { value: 'My draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu metadata' }));
    await screen.findByText(/Không thể tải phiên bản vai trò mới nhất/);
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Lưu metadata' }).disabled).toBe(true);

    view.rerender(<RoleMetadataForm role={current} onSubmit={onSubmit} onRefresh={() => Promise.resolve(current)} />);
    await screen.findByText(/Dữ liệu vai trò đã được thay đổi ở phiên khác/);
    expect(screen.getByLabelText<HTMLInputElement>('Tên vai trò').value).toBe('My draft');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Lưu metadata' }).disabled).toBe(false),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lưu metadata' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]?.[0]).toEqual({
      expectedUpdatedAt: current.updatedAt,
      roleName: 'My draft',
    });
  });

  it('does not silently rebase a dirty draft onto a newer background GET before a 409', async () => {
    const current = {
      ...role,
      roleName: 'Changed elsewhere',
      updatedAt: '2026-07-22T06:00:00.125Z',
    };
    const onSubmit = vi.fn((_input: UpdateRoleInput) => Promise.resolve({
      ...current,
      roleName: 'My draft',
      updatedAt: '2026-07-22T06:00:00.126Z',
    }));
    const view = render(<RoleMetadataForm role={role} onSubmit={onSubmit} onRefresh={refreshRole} />);

    fireEvent.change(screen.getByLabelText('Tên vai trò'), { target: { value: 'My draft' } });
    view.rerender(<RoleMetadataForm role={current} onSubmit={onSubmit} onRefresh={() => Promise.resolve(current)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu metadata' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      expectedUpdatedAt: role.updatedAt,
      roleName: 'My draft',
    });
  });

  it('retries the authoritative refresh in place without losing the dirty draft', async () => {
    const current = {
      ...role,
      roleName: 'Changed elsewhere',
      updatedAt: '2026-07-22T06:00:00.125Z',
    };
    const stale = new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'Stale',
      details: { Reason: 'ROLE_METADATA_STALE', CurrentUpdatedAt: current.updatedAt },
    });
    const onSubmit = vi
      .fn<(input: UpdateRoleInput) => Promise<Role>>()
      .mockRejectedValueOnce(stale)
      .mockResolvedValueOnce({ ...current, roleName: 'My retained draft' });
    const onRefresh = vi.fn(() => Promise.resolve(current));
    render(<RoleMetadataForm role={role} onSubmit={onSubmit} onRefresh={onRefresh} />);

    fireEvent.change(screen.getByLabelText('Tên vai trò'), { target: { value: 'My retained draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu metadata' }));
    await screen.findByText(/Không thể tải phiên bản vai trò mới nhất/);

    fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại' }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText<HTMLInputElement>('Tên vai trò').value).toBe('My retained draft');
    await waitFor(() =>
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Lưu metadata' }).disabled).toBe(false),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Lưu metadata' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]?.[0]).toEqual({
      expectedUpdatedAt: current.updatedAt,
      roleName: 'My retained draft',
    });
  });
});
