import { useRef } from 'react';
import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query';

import { toast } from '@shared/Components/Ui/Toast';
import { ApiError } from '@shared/Services/Http/ApiError';
import { QUERY_NAMESPACES } from '@shared/Constants/QueryKeys';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { inboundPlanQueryKeys } from '@modules/InboundPlan/Application/Queries/InboundPlanQueryKeys';
import type { InboundPlan } from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type {
  CreateInboundPlanInput,
  RecordGateInInput,
  UpdateInboundPlanInput,
} from '@modules/InboundPlan/Domain/Types/InboundPlanQuery';
import { inboundPlanRepository } from '@modules/InboundPlan/Infrastructure/Repositories/InboundPlanRepositoryInstance';

/** Mutation keys for the 4 plan-mutating actions that must never run concurrently for the
 * SAME plan (Sửa/Xác nhận/Xóa/gate-in). Lets `useIsMutating` (React Query's mutation-cache
 * query hook) detect a pending mutation for a plan GLOBALLY, across every component that calls
 * `useInboundPlanMutations()` -- this hook is instantiated separately by the list page and the
 * detail page (two independent `useMutation()` observer states), so a single component-local
 * `.isPending` check only ever sees ITS OWN instance's mutations. Without this, cancelling a
 * plan from the list page (Xóa) then immediately navigating to that same plan's edit page
 * mounts a BRAND NEW `useInboundPlanMutations()` instance whose own `.isPending` reads false,
 * making the edit form's cross-mutation lock blind to the still-in-flight list-page cancel
 * (re-review round 3 finding, adversarial-verify). Mirrors the exact
 * `mutationKey`/`useMutationState` pattern already established for the same class of problem
 * in `UseAccessControlMutations.ts`/`RoleDetailPage.tsx` (RA-04). */
export const INBOUND_PLAN_MUTATION_KEYS = {
  update: ['inboundPlanUpdate'] as const,
  confirm: ['inboundPlanConfirm'] as const,
  cancel: ['inboundPlanCancel'] as const,
  recordGateIn: ['inboundPlanRecordGateIn'] as const,
};

const INBOUND_PLAN_LOCK_KEY_NAMES = new Set<string>([
  INBOUND_PLAN_MUTATION_KEYS.update[0],
  INBOUND_PLAN_MUTATION_KEYS.confirm[0],
  INBOUND_PLAN_MUTATION_KEYS.cancel[0],
  INBOUND_PLAN_MUTATION_KEYS.recordGateIn[0],
]);

/** Re-review fix (P1, round 4): the cross-mutation lock must be read the SAME way by EVERY
 * page that can trigger one of the 4 lock-relevant plan mutations, not just the detail page --
 * `InboundPlanPage` (list) has its own `Xóa` action, and a naive per-instance `.isPending`
 * check there is blind to a mutation still in flight from the DETAIL page (e.g. operator starts
 * gate-in/Xác nhận/Sửa on Detail, navigates back to the list before it settles, then clicks Xóa
 * for the same plan there). Sharing this ONE hook -- rather than duplicating the
 * `useMutationState` predicate per page -- guarantees both pages agree on what "locked" means
 * and stay in sync if the lock-relevant mutation set ever changes.
 *
 * Returns the plan ids with a lock-relevant mutation currently pending, GLOBALLY across the
 * whole app's shared QueryClient mutation cache (see `INBOUND_PLAN_MUTATION_KEYS`'s own comment
 * for why a per-component `useMutation()` observer isn't enough). Callers compare their own
 * plan id against this array as a plain expression, deliberately OUTSIDE this hook's own
 * memoized `useMutationState` call -- `useMutationState`/`useIsMutating` cache their result in a
 * ref that only recomputes on a MUTATION CACHE notify event, not on an unrelated component
 * re-render, so baking a render-derived id into the predicate itself would silently go stale. */
export function useInboundPlanLockMutationIds(): Array<string | undefined> {
  return useMutationState({
    filters: {
      predicate: (mutation) => {
        const keyName = mutation.options.mutationKey?.[0];
        return (
          typeof keyName === 'string' &&
          INBOUND_PLAN_LOCK_KEY_NAMES.has(keyName) &&
          mutation.state.status === 'pending'
        );
      },
    },
    select: (mutation) => (mutation.state.variables as { id?: string } | undefined)?.id,
  });
}

export function useInboundPlanMutations() {
  const queryClient = useQueryClient();
  // Re-review fix (P1, round 4): `applyPlanUpdate`'s `updatedAt` comparator cannot order two
  // DIFFERENT lock-relevant mutations that settle with the EXACT same server timestamp (BE's
  // clock resolution is finite) -- `<` treats a tie as "not older", so the LAST-SETTLED
  // response wins regardless of which one is semantically fresher. A generation counter,
  // stamped in `onMutate` (i.e. at the moment each mutation is INVOKED, not when it settles),
  // gives ties a principled tie-break: the mutation the operator started MORE RECENTLY wins,
  // since it reflects their latest intent. Scoped to this hook instance on purpose -- the
  // Detail<->List cross-instance race this generation counter does NOT cover is already closed
  // by `useInboundPlanLockMutationIds` disabling every lock-relevant action while one is
  // in flight for the plan; this counter only has to resolve a tie between two calls issued
  // from the SAME instance (e.g. a caller that bypasses the disabled button).
  const mutationGenerationRef = useRef(0);
  const appliedGenerationByPlanId = useRef(new Map<string, number>());
  // Review fix: Plan mutations (esp. recordGateIn) can change fields the Receiving
  // module reads via readiness/operational-state (GateInStatus, WarehouseProfileId,
  // Status) -- bust its cache too so a return trip inside staleTime=30s doesn't act on
  // stale readiness. Invalidate via the shared QUERY_NAMESPACES constant only (never
  // import InboundReceiving's own query-key module) to keep the module dependency
  // direction one-way (Plan must not import Receiving internals, per AGENTS.md 4.4).
  //
  // Re-review fix (P1, round 5): must RETURN the combined Promise, not fire-and-forget
  // it -- `queryClient.invalidateQueries()` only resolves once its ACTIVE queries have
  // actually refetched (confirmed by reading `queryClient.js`'s `invalidateQueries`/
  // `refetchQueries`: it awaits `Promise.all(...)` of each active query's `fetch()`).
  // Every individual query's fetch promise is wrapped in `.catch(noop)` internally
  // (since we don't pass `throwOnError`), so this combined promise can never reject --
  // safe to return from a mutation's `onSuccess` without opening a new error path.
  // Returning it lets TanStack Query's `Mutation.execute()` AWAIT it before calling
  // `#dispatch({type:'success'})`, which is what releases `useInboundPlanLockMutationIds`'
  // global lock -- without this, the lock released as soon as the refetch merely
  // STARTED, letting a warm list/detail cache re-enable Sửa/Xóa on stale Draft data
  // before the fresh state actually landed.
  const invalidateInboundPlan = () => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: inboundPlanQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: [QUERY_NAMESPACES.INBOUND_RECEIVING] }),
    ]);
  };
  // Review fix (P1): write the mutation's fresh response straight into THIS plan's
  // detail cache before invalidating. `invalidateQueries` only schedules a background
  // refetch -- it leaves a window where `useInboundPlan(id)` still returns the
  // pre-mutation snapshot. A page-level "prefer the last mutation's own result" fallback
  // used to paper over that window, but it only ever tracked ONE mutation (recordGateIn)
  // and never reset, so it kept winning forever even after a LATER mutation (e.g.
  // confirmInboundPlan) succeeded -- Draft -> gate-in -> Confirm kept showing Draft.
  // Patching the cache here means every consumer of useInboundPlan(id) is instantly
  // correct after ANY plan mutation, with no local page-level workaround needed.
  //
  // Re-review fix (P1): a naive last-settled-wins write is itself unsafe -- the header's
  // Xác nhận button only disables on confirmInboundPlan's OWN isPending, not on
  // recordGateIn's, so an operator can submit gate-in then immediately Confirm while
  // gate-in is still in flight. If gate-in's response settles AFTER confirm's (its
  // request/response pair simply took longer), its stale Draft snapshot would overwrite
  // the fresher Planned one. Guard by server UpdatedAt (bumped by every plan-mutating BE
  // operation -- RecordGateIn/Confirm/Cancel/ApplyEdits all set it) so only a genuinely
  // newer response can win -- mirrors the monotonic `permissionsVersion` guard already
  // established in `patchRoleDetailCache` (UseAccessControlMutations.ts, RA-04).
  const applyPlanUpdate = (plan: InboundPlan, context?: { generation: number }) => {
    const previousGeneration = appliedGenerationByPlanId.current.get(plan.id) ?? 0;
    let applied = false;
    queryClient.setQueryData<InboundPlan>(inboundPlanQueryKeys.detail(plan.id), (old) => {
      if (old) {
        const incomingTime = new Date(plan.updatedAt).getTime();
        const oldTime = new Date(old.updatedAt).getTime();
        if (incomingTime < oldTime) return old;
        // Exact tie: only yield to the incoming response if it was started AFTER the
        // response currently applied -- otherwise an earlier-started, later-settling call
        // (e.g. a slow gate-in that resolves after a quick confirm already landed) would
        // clobber the more recent action's result despite carrying the same timestamp.
        if (incomingTime === oldTime && context && context.generation < previousGeneration) {
          return old;
        }
      }
      applied = true;
      return plan;
    });
    // Adversarial-verify fix: only advance the recorded generation when this response
    // actually WON the write above -- recording it unconditionally (even on a rejected/
    // stale response) let a 3rd, in-between mutation's rejection silently regress the
    // bookkeeping, so a LATER but smaller-generation response could then wrongly win a
    // subsequent tie against an already-applied fresher result.
    if (applied && context) appliedGenerationByPlanId.current.set(plan.id, context.generation);
    // Re-review fix (P1, round 5): return the invalidate Promise so callers (every
    // lock-relevant mutation's `onSuccess`, see `invalidateInboundPlan`'s own comment)
    // settle only after the refetch actually lands, not merely after it's scheduled.
    return invalidateInboundPlan();
  };
  const nextGeneration = () => {
    mutationGenerationRef.current += 1;
    return { generation: mutationGenerationRef.current };
  };
  const notifyError = (error: unknown) => toast.error(toMutationErrorMessage(error));

  return {
    createInboundPlan: useMutation({
      mutationFn: (input: CreateInboundPlanInput) => inboundPlanRepository.create(input),
      onSuccess: (plan) => applyPlanUpdate(plan),
      onError: notifyError,
    }),
    updateInboundPlan: useMutation({
      mutationKey: INBOUND_PLAN_MUTATION_KEYS.update,
      mutationFn: ({ id, input }: { id: string; input: UpdateInboundPlanInput }) =>
        inboundPlanRepository.update(id, input),
      onMutate: nextGeneration,
      onSuccess: (plan, _variables, context) => applyPlanUpdate(plan, context),
      onError: (error: unknown) => {
        notifyError(error);
        // Re-review fix (P1 decision): a 409 here means a concurrent edit landed first --
        // invalidate so the NEXT time this plan is opened (e.g. after Hủy + reopening
        // Edit) it shows the fresh data, without touching the operator's own
        // still-open, in-progress form right now.
        if (error instanceof ApiError && error.status === 409) void invalidateInboundPlan();
      },
    }),
    confirmInboundPlan: useMutation({
      mutationKey: INBOUND_PLAN_MUTATION_KEYS.confirm,
      mutationFn: ({ id }: { id: string }) => inboundPlanRepository.confirm(id),
      onMutate: nextGeneration,
      onSuccess: (plan, _variables, context) => applyPlanUpdate(plan, context),
      onError: notifyError,
    }),
    cancelInboundPlan: useMutation({
      mutationKey: INBOUND_PLAN_MUTATION_KEYS.cancel,
      mutationFn: ({ id }: { id: string }) => inboundPlanRepository.cancel(id),
      onMutate: nextGeneration,
      onSuccess: (plan, _variables, context) => applyPlanUpdate(plan, context),
      onError: notifyError,
    }),
    downloadLineImportTemplate: useMutation({
      mutationFn: () => inboundPlanRepository.downloadLineImportTemplate(),
      onError: notifyError,
    }),
    previewLineImport: useMutation({
      mutationFn: ({ file, scope }: { file: File; scope: { warehouseId: string; ownerId: string } }) =>
        inboundPlanRepository.previewLineImport(file, scope),
      onError: notifyError,
    }),
    commitLineImport: useMutation({
      mutationFn: ({ file, header }: { file: File; header: Omit<CreateInboundPlanInput, 'lines'> }) =>
        inboundPlanRepository.commitLineImport(file, header),
      onSuccess: (plan) => applyPlanUpdate(plan),
      onError: notifyError,
    }),
    recordGateIn: useMutation({
      mutationKey: INBOUND_PLAN_MUTATION_KEYS.recordGateIn,
      mutationFn: ({ id, input }: { id: string; input: RecordGateInInput }) =>
        inboundPlanRepository.recordGateIn(id, input),
      onMutate: nextGeneration,
      onSuccess: (plan, _variables, context) => applyPlanUpdate(plan, context),
      onError: notifyError,
    }),
  };
}
