// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { IAccessControlRepository } from '@modules/AccessControl/Application/Interfaces/IAccessControlRepository';
import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import { useAllRoles } from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import type { Role } from '@modules/AccessControl/Domain/Entities/AccessControl';

const repo = vi.hoisted(() => ({ current: null as unknown as IAccessControlRepository }));
vi.mock('@modules/AccessControl/Infrastructure/Repositories/AccessControlRepositoryInstance', () => ({
  get accessControlRepository() { return repo.current; },
}));

const role: Role = {
  id: 'role-1',
  roleCode: 'OPERATOR',
  roleName: 'Operator',
  description: null,
  isSystem: true,
  status: 'ACTIVE',
  permissionsVersion: 0,
  updatedAt: '2026-07-22T00:00:00.000Z',
};

function world(listAllRoles: ReturnType<typeof vi.fn>) {
  repo.current = { listAllRoles } as unknown as IAccessControlRepository;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useAllRoles(), { wrapper }) };
}

describe('RH-05 role catalog query state', () => {
  it('retains a non-empty last-known-good snapshot and marks it unconfirmed after refetch failure', async () => {
    const listAllRoles = vi.fn().mockResolvedValueOnce([role]);
    const { client, result } = world(listAllRoles);
    await waitFor(() => expect(result.current.isCatalogVerified).toBe(true));

    listAllRoles.mockRejectedValueOnce(new Error('refresh failed'));
    await act(async () => {
      await client.refetchQueries({ queryKey: accessControlQueryKeys.allRoles() });
    });

    await waitFor(() => expect(result.current.isCatalogUnconfirmed).toBe(true));
    expect(result.current.data).toEqual([role]);
    expect(result.current.isCatalogVerified).toBe(false);
  });

  it('retains an empty last-known-good snapshot distinctly from initial failure', async () => {
    const listAllRoles = vi.fn().mockResolvedValueOnce([]);
    const { client, result } = world(listAllRoles);
    await waitFor(() => expect(result.current.isCatalogVerified).toBe(true));

    listAllRoles.mockRejectedValueOnce(new Error('refresh failed'));
    await act(async () => {
      await client.refetchQueries({ queryKey: accessControlQueryKeys.allRoles() });
    });

    await waitFor(() => expect(result.current.isCatalogUnconfirmed).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('uses infinite GC for the verified snapshot so route unmounts cannot erase the LKG', async () => {
    vi.useFakeTimers();
    try {
      const listAllRoles = vi.fn().mockResolvedValue([role]);
      const { client, result, unmount } = world(listAllRoles);
      await vi.waitFor(() => expect(result.current.isCatalogVerified).toBe(true));
      unmount();
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      expect(client.getQueryData(accessControlQueryKeys.allRoles())).toEqual([role]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks an invalidated catalog unconfirmed while its offline refetch is paused', async () => {
    const listAllRoles = vi.fn().mockResolvedValue([role]);
    const { client, result } = world(listAllRoles);
    await waitFor(() => expect(result.current.isCatalogVerified).toBe(true));

    try {
      onlineManager.setOnline(false);
      act(() => {
        void client.invalidateQueries({ queryKey: accessControlQueryKeys.allRoles() });
      });
      await waitFor(() => expect(result.current.fetchStatus).toBe('paused'));
      expect(result.current.isCatalogVerified).toBe(false);
      expect(result.current.isCatalogUnconfirmed).toBe(true);
      expect(result.current.data).toEqual([role]);
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
