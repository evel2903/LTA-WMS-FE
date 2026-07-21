// @vitest-environment jsdom
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  createManualReceipt: vi.fn(),
  startReceivingSession: vi.fn(),
}));

vi.mock(
  '@modules/InboundReceiving/Infrastructure/Repositories/InboundReceivingRepositoryInstance',
  () => ({
    inboundReceivingRepository: {
      createManualReceipt: h.createManualReceipt,
      startReceivingSession: h.startReceivingSession,
    },
  }),
);

import { inboundPlanQueryKeys } from '@modules/InboundPlan/Application/Queries/InboundPlanQueryKeys';
import { inboundReceivingQueryKeys } from '@modules/InboundReceiving/Application/Queries/InboundReceivingQueryKeys';
import { useInboundReceivingMutations } from '@modules/InboundReceiving/Application/Commands/UseInboundReceivingMutations';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useInboundReceivingMutations cross-invalidate (ipr-01 AC12c)', () => {
  it('invalidates receipt list, detail and operational state after manual receipt creation', async () => {
    const receipt = {
      id: 'receipt-manual-1',
      inboundPlanId: null,
      receiptNumber: 'RCPT-MANUAL-001',
    };
    h.createManualReceipt.mockResolvedValueOnce({
      receipt,
      session: { id: 'session-1', inboundPlanId: null },
      isDuplicate: false,
    });
    const client = makeClient();
    client.setQueryData(inboundReceivingQueryKeys.receiptList({}), { items: [] });
    client.setQueryData(inboundReceivingQueryKeys.receiptOperationalState('receipt-manual-1'), {
      stale: true,
    });
    client.setQueryData(inboundReceivingQueryKeys.receiptDetail('receipt-manual-1'), {
      id: 'receipt-manual-1',
    });

    const { result } = renderHook(() => useInboundReceivingMutations(null), {
      wrapper: wrapperFor(client),
    });

    act(() => {
      result.current.createManualReceipt.mutate({
        ownerId: 'owner-1',
        warehouseId: 'warehouse-1',
        supplierId: 'supplier-1',
        receiptNumber: 'RCPT-MANUAL-001',
        businessReference: 'MANUAL:DOCK:001',
        sessionKey: 'dock-1',
        idempotencyKey: 'manual-receipt-1',
      });
    });

    await waitFor(() => expect(result.current.createManualReceipt.isSuccess).toBe(true));

    expect(client.getQueryState(inboundReceivingQueryKeys.receiptList({}))?.isInvalidated).toBe(
      true,
    );
    expect(
      client.getQueryState(inboundReceivingQueryKeys.receiptOperationalState('receipt-manual-1'))
        ?.isInvalidated,
    ).toBe(true);
    expect(
      client.getQueryState(inboundReceivingQueryKeys.receiptDetail('receipt-manual-1'))?.isInvalidated,
    ).toBe(true);
  });

  it("invalidates the Receiving namespace AND the Plan module's ENTIRE namespace (detail + list) after startReceivingSession succeeds", async () => {
    h.startReceivingSession.mockResolvedValueOnce({ id: 'session-1' });
    const client = makeClient();
    client.setQueryData(inboundReceivingQueryKeys.operationalState('inbound-plan-1'), {
      stale: true,
    });
    client.setQueryData(inboundPlanQueryKeys.detail('inbound-plan-1'), {
      id: 'inbound-plan-1',
      status: 'Planned',
    });
    client.setQueryData(inboundPlanQueryKeys.list(), {
      items: [{ id: 'inbound-plan-1', status: 'Planned' }],
    });

    const { result } = renderHook(() => useInboundReceivingMutations('inbound-plan-1'), {
      wrapper: wrapperFor(client),
    });

    act(() => {
      result.current.startReceivingSession.mutate({
        id: 'inbound-plan-1',
        input: { sessionKey: 'dock-1:user-1', deviceCode: 'rf-01' },
      });
    });

    await waitFor(() => expect(result.current.startReceivingSession.isSuccess).toBe(true));

    // The Receiving module's own cache always busts.
    expect(
      client.getQueryState(inboundReceivingQueryKeys.operationalState('inbound-plan-1'))
        ?.isInvalidated,
    ).toBe(true);
    // Without this, the Plan detail page would keep showing the pre-receiving
    // Status/GateInStatus after startReceivingSession changes it server-side.
    expect(client.getQueryState(inboundPlanQueryKeys.detail('inbound-plan-1'))?.isInvalidated).toBe(
      true,
    );
    // Review fix: the Plan LIST page (Draft-only row actions, status column) also
    // reads this data and must refresh, not just the single plan's detail cache.
    expect(client.getQueryState(inboundPlanQueryKeys.list())?.isInvalidated).toBe(true);
  });

  it('does not touch the Plan cache when no planId is available (e.g. hook mounted before the route param resolves)', async () => {
    h.startReceivingSession.mockResolvedValueOnce({ id: 'session-2' });
    const client = makeClient();
    client.setQueryData(inboundPlanQueryKeys.detail('inbound-plan-1'), {
      id: 'inbound-plan-1',
      status: 'Planned',
    });

    const { result } = renderHook(() => useInboundReceivingMutations(null), {
      wrapper: wrapperFor(client),
    });

    act(() => {
      result.current.startReceivingSession.mutate({
        id: 'inbound-plan-1',
        input: { sessionKey: 'dock-1:user-1', deviceCode: 'rf-01' },
      });
    });

    await waitFor(() => expect(result.current.startReceivingSession.isSuccess).toBe(true));

    expect(client.getQueryState(inboundPlanQueryKeys.detail('inbound-plan-1'))?.isInvalidated).toBe(
      false,
    );
  });
});
