// @vitest-environment jsdom
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ recordGateIn: vi.fn(), confirm: vi.fn(), cancel: vi.fn() }));

vi.mock('@modules/InboundPlan/Infrastructure/Repositories/InboundPlanRepositoryInstance', () => ({
  inboundPlanRepository: { recordGateIn: h.recordGateIn, confirm: h.confirm, cancel: h.cancel },
}));

import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import { inboundPlanQueryKeys } from '@modules/InboundPlan/Application/Queries/InboundPlanQueryKeys';
import { useInboundPlanMutations } from '@modules/InboundPlan/Application/Commands/UseInboundPlanMutations';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useInboundPlanMutations cross-invalidate (IPR-01 review fix)', () => {
  it("recordGateIn invalidates its own namespace AND the Receiving module's namespace, via the shared QUERY_NAMESPACES constant only", async () => {
    h.recordGateIn.mockResolvedValueOnce({ id: 'inbound-plan-1', status: 'Planned' });
    const client = makeClient();
    client.setQueryData(inboundPlanQueryKeys.detail('inbound-plan-1'), { id: 'inbound-plan-1', status: 'Planned' });
    // Receiving's readiness cache for this plan -- keyed under the shared namespace
    // constant directly, NOT via an import of Receiving's own query-key module (the
    // Plan module must not import InboundReceiving internals, per AGENTS.md 4.4).
    client.setQueryData([QUERY_NAMESPACES.INBOUND_RECEIVING, 'readiness', 'inbound-plan-1'], {
      gateInRequired: true,
      gateInRecorded: false,
    });

    const { result } = renderHook(() => useInboundPlanMutations(), { wrapper: wrapperFor(client) });

    act(() => {
      result.current.recordGateIn.mutate({
        id: 'inbound-plan-1',
        input: { gateInAt: '2026-07-17T00:00:00.000Z', gateReference: 'GATE-1' },
      });
    });

    await waitFor(() => expect(result.current.recordGateIn.isSuccess).toBe(true));

    expect(
      client.getQueryState(inboundPlanQueryKeys.detail('inbound-plan-1'))?.isInvalidated,
    ).toBe(true);
    // Without this, returning to Receiving inside staleTime=30s would still read the
    // pre-gate-in readiness snapshot (gateInRecorded: false) and block receiving.
    expect(
      client.getQueryState([QUERY_NAMESPACES.INBOUND_RECEIVING, 'readiness', 'inbound-plan-1'])
        ?.isInvalidated,
    ).toBe(true);
  });

  it('every Plan mutation shares the same cross-invalidate behavior (confirm also busts the Receiving namespace)', async () => {
    h.confirm.mockResolvedValueOnce({ id: 'inbound-plan-2', status: 'Planned' });
    const client = makeClient();
    client.setQueryData([QUERY_NAMESPACES.INBOUND_RECEIVING, 'operational-state', 'inbound-plan-2'], {
      receivingSessions: [],
    });

    const { result } = renderHook(() => useInboundPlanMutations(), { wrapper: wrapperFor(client) });

    act(() => {
      result.current.confirmInboundPlan.mutate({ id: 'inbound-plan-2' });
    });

    await waitFor(() => expect(result.current.confirmInboundPlan.isSuccess).toBe(true));

    expect(
      client.getQueryState([QUERY_NAMESPACES.INBOUND_RECEIVING, 'operational-state', 'inbound-plan-2'])
        ?.isInvalidated,
    ).toBe(true);
  });

  it("re-review fix (P1): an older mutation's response settling AFTER a newer one does not regress the cache (monotonic updatedAt guard)", async () => {
    const client = makeClient();
    client.setQueryData(inboundPlanQueryKeys.detail('inbound-plan-3'), {
      id: 'inbound-plan-3',
      status: 'Draft',
      updatedAt: '2026-07-17T00:00:00.000Z',
    });

    // Xác nhận isn't gated on recordGateIn's isPending, so both can genuinely be
    // in-flight for the same plan at once -- simulate gate-in (submitted first, but
    // whose response settles LAST) racing against Confirm (submitted second, settles
    // first).
    let resolveGateIn: ((plan: unknown) => void) | undefined;
    h.recordGateIn.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGateIn = resolve;
        }),
    );
    h.confirm.mockResolvedValueOnce({
      id: 'inbound-plan-3',
      status: 'Planned',
      updatedAt: '2026-07-17T00:00:05.000Z',
    });

    const { result } = renderHook(() => useInboundPlanMutations(), { wrapper: wrapperFor(client) });

    act(() => {
      result.current.recordGateIn.mutate({
        id: 'inbound-plan-3',
        input: { gateInAt: '2026-07-17T00:00:01.000Z', gateReference: 'GATE-1' },
      });
    });
    act(() => {
      result.current.confirmInboundPlan.mutate({ id: 'inbound-plan-3' });
    });
    await waitFor(() => expect(result.current.confirmInboundPlan.isSuccess).toBe(true));

    // Gate-in's stale response (older server UpdatedAt) finally arrives.
    act(() => {
      resolveGateIn?.({
        id: 'inbound-plan-3',
        status: 'Draft',
        gateInStatus: 'Recorded',
        updatedAt: '2026-07-17T00:00:02.000Z',
      });
    });
    await waitFor(() => expect(result.current.recordGateIn.isSuccess).toBe(true));

    // Must still reflect Confirm's fresher Planned state, not gate-in's stale Draft --
    // a naive last-settled-wins write would have let the late gate-in response win.
    expect(client.getQueryData(inboundPlanQueryKeys.detail('inbound-plan-3'))).toMatchObject({
      status: 'Planned',
      updatedAt: '2026-07-17T00:00:05.000Z',
    });
  });

  it('re-review fix (P1, round 4): an exact timestamp tie between two lock-relevant mutations resolves to the LATER-STARTED one, not last-settled-wins', async () => {
    // Round-3 documented this as an accepted residual gap: `<` treats a tie as "not
    // older", so it fell through to last-settled-wins, arbitrary regardless of which
    // response was semantically fresher. Round-4 re-review flagged that as still a real
    // defect (not fully mitigated by the UI lock alone, since this test calls `.mutate()`
    // directly on both mutation objects, bypassing the disabled-button guard entirely --
    // the same class of bypass the List<->Detail P1 gap turned out to be reachable
    // through). Fix: `applyPlanUpdate` now also tracks a generation counter stamped in
    // each lock-relevant mutation's `onMutate` -- i.e. at the moment it's INVOKED, not
    // when it settles -- and uses it ONLY to break an exact `updatedAt` tie, preferring
    // the mutation that was started MORE RECENTLY (reflects the operator's latest
    // intent). Below, recordGateIn starts first (generation 1) but settles LAST with a
    // stale Draft snapshot; confirmInboundPlan starts second (generation 2) and settles
    // first with the correct Planned state. The tie must resolve to Planned.
    const client = makeClient();
    client.setQueryData(inboundPlanQueryKeys.detail('inbound-plan-4'), {
      id: 'inbound-plan-4',
      status: 'Draft',
      updatedAt: '2026-07-17T00:00:00.000Z',
    });

    let resolveGateIn: ((plan: unknown) => void) | undefined;
    h.recordGateIn.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGateIn = resolve;
        }),
    );
    h.confirm.mockResolvedValueOnce({
      id: 'inbound-plan-4',
      status: 'Planned',
      updatedAt: '2026-07-17T00:00:05.000Z',
    });

    const { result } = renderHook(() => useInboundPlanMutations(), { wrapper: wrapperFor(client) });

    act(() => {
      result.current.recordGateIn.mutate({
        id: 'inbound-plan-4',
        input: { gateInAt: '2026-07-17T00:00:01.000Z', gateReference: 'GATE-1' },
      });
    });
    act(() => {
      result.current.confirmInboundPlan.mutate({ id: 'inbound-plan-4' });
    });
    await waitFor(() => expect(result.current.confirmInboundPlan.isSuccess).toBe(true));

    // Gate-in's response finally arrives with the EXACT SAME updatedAt as Confirm's,
    // despite being a semantically stale Draft snapshot.
    act(() => {
      resolveGateIn?.({
        id: 'inbound-plan-4',
        status: 'Draft',
        gateInStatus: 'Recorded',
        updatedAt: '2026-07-17T00:00:05.000Z',
      });
    });
    await waitFor(() => expect(result.current.recordGateIn.isSuccess).toBe(true));

    // The generation tie-break protects the correct state: confirm (generation 2,
    // Planned) was started AFTER gate-in (generation 1, stale Draft), so it wins the
    // exact-timestamp tie even though gate-in's response arrived later.
    expect(client.getQueryData(inboundPlanQueryKeys.detail('inbound-plan-4'))).toMatchObject({
      status: 'Planned',
      updatedAt: '2026-07-17T00:00:05.000Z',
    });
  });

  it('adversarial-verify fix: a rejected/stale tie response does not regress the recorded generation and let a later, lower-generation response win a subsequent tie', async () => {
    // Found by an adversarial-verify pass on the generation tie-break above: the first
    // implementation recorded `context.generation` unconditionally, even when the
    // incoming response LOST the tie and `old` was kept. With 3 mutations settling
    // out of generation order, that let the bookkeeping regress: cancel (gen 3) applies
    // first, then gate-in (gen 1) correctly loses its tie against gen 3 -- but used to
    // still overwrite the recorded generation down to 1 -- so confirm (gen 2), settling
    // last with the same tied timestamp, would wrongly pass `2 < 1` (false) and clobber
    // cancel's already-applied, genuinely fresher result. The fix only records the
    // generation when the incoming response actually won the write.
    const client = makeClient();
    client.setQueryData(inboundPlanQueryKeys.detail('inbound-plan-5'), {
      id: 'inbound-plan-5',
      status: 'Draft',
      updatedAt: '2026-07-17T00:00:00.000Z',
    });

    let resolveGateIn: ((plan: unknown) => void) | undefined;
    let resolveConfirm: ((plan: unknown) => void) | undefined;
    h.recordGateIn.mockImplementationOnce(
      () => new Promise((resolve) => { resolveGateIn = resolve; }),
    );
    h.confirm.mockImplementationOnce(
      () => new Promise((resolve) => { resolveConfirm = resolve; }),
    );
    h.cancel.mockResolvedValueOnce({
      id: 'inbound-plan-5',
      status: 'Cancelled',
      updatedAt: '2026-07-17T00:00:05.000Z',
    });

    const { result } = renderHook(() => useInboundPlanMutations(), { wrapper: wrapperFor(client) });

    // Invocation order (assigns generations 1, 2, 3): gate-in, confirm, cancel.
    act(() => {
      result.current.recordGateIn.mutate({
        id: 'inbound-plan-5',
        input: { gateInAt: '2026-07-17T00:00:01.000Z', gateReference: 'GATE-1' },
      });
    });
    act(() => {
      result.current.confirmInboundPlan.mutate({ id: 'inbound-plan-5' });
    });
    act(() => {
      result.current.cancelInboundPlan.mutate({ id: 'inbound-plan-5' });
    });
    await waitFor(() => expect(result.current.cancelInboundPlan.isSuccess).toBe(true));

    // Settlement order: cancel (gen 3) already applied above. Now gate-in (gen 1)
    // settles with the SAME tied timestamp -- must lose against gen 3.
    act(() => {
      resolveGateIn?.({
        id: 'inbound-plan-5',
        status: 'Draft',
        gateInStatus: 'Recorded',
        updatedAt: '2026-07-17T00:00:05.000Z',
      });
    });
    await waitFor(() => expect(result.current.recordGateIn.isSuccess).toBe(true));

    // Then confirm (gen 2) settles, also tied -- must ALSO lose against gen 3, not
    // wrongly win against a regressed "last recorded generation" of 1.
    act(() => {
      resolveConfirm?.({
        id: 'inbound-plan-5',
        status: 'Planned',
        updatedAt: '2026-07-17T00:00:05.000Z',
      });
    });
    await waitFor(() => expect(result.current.confirmInboundPlan.isSuccess).toBe(true));

    expect(client.getQueryData(inboundPlanQueryKeys.detail('inbound-plan-5'))).toMatchObject({
      status: 'Cancelled',
      updatedAt: '2026-07-17T00:00:05.000Z',
    });
  });
});
