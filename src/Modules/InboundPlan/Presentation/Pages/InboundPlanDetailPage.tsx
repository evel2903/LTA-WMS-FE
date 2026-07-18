import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Link, Navigate, useMatch, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import {
  useInboundPlanLockMutationIds,
  useInboundPlanMutations,
} from '@modules/InboundPlan/Application/Commands/UseInboundPlanMutations';
import { useInboundPlan } from '@modules/InboundPlan/Application/Queries/UseInboundPlans';
import { InboundPlanEditPanel } from '@modules/InboundPlan/Presentation/Components/InboundPlanEditPanel';
import { InboundPlanGateInPanel } from '@modules/InboundPlan/Presentation/Components/InboundPlanGateInPanel';
import type { InboundPlan } from '@modules/InboundPlan/Domain/Types/InboundPlan';
import type { UpdateInboundPlanInput } from '@modules/InboundPlan/Domain/Types/InboundPlanQuery';

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="rounded-md border px-2 py-1 text-xs font-medium">
      {vietnameseOperationalLabel(value)}
    </span>
  );
}

function LifecycleStatusBadge({ value }: { value: string }) {
  return (
    <span
      className="rounded-md border bg-background px-2 py-1 text-xs font-medium"
      data-testid="inbound-lifecycle-badge"
    >
      Chứng từ: {vietnameseOperationalLabel(value)}
    </span>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Chưa ghi nhận';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

// Durable inline error text for a mutation, instead of relying solely on the
// transient toast (IFB-06) — prefers the real backend message, falls back to a
// generic per-action message, and is `null` (no paragraph rendered) when idle.
function toPanelErrorMessage(error: unknown, fallback: string): string | null {
  if (!error) return null;
  return error instanceof ApiError ? error.message : fallback;
}

function DetailMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border bg-background px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

interface InboundOperatorHeaderProps {
  plan: InboundPlan;
  onEdit?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  // Re-review fix (P1, round 3): a single cross-action lock instead of one flag per
  // button -- Sửa/Xác nhận/Xóa/gate-in all mutate the SAME plan, so if any one of them
  // is in flight the other three must be disabled too, not just their own individual
  // mutation. See `isPlanMutationPending` below for why: a monotonic `updatedAt`
  // comparator alone can't order two responses that settle within the same finite
  // Date() tick, so the only fully sound fix is to never let two of them be in flight
  // for this plan at once.
  isBusy?: boolean;
}

// IFB-24: Draft is the only status where the plan can still be edited or
// soft-cancelled -- once confirmed it has real downstream state (CoreFlow
// instance, outbox event) that these actions do not know how to unwind.
function InboundOperatorHeader({ plan, onEdit, onConfirm, onCancel, isBusy = false }: InboundOperatorHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const isDraft = plan.status === 'Draft';

  return (
    <Card data-testid="inbound-operator-header">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">Nhập kho {plan.businessReference}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              ASN {plan.sourceDocumentNumber || plan.businessReference}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LifecycleStatusBadge value={plan.status} />
            <button
              type="button"
              className="min-h-10 shrink-0 rounded-md border px-2 text-sm font-medium hover:bg-muted"
              aria-expanded={expanded}
              aria-controls="inbound-operator-header-details"
              data-testid="inbound-operator-header-toggle"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? (
                <ChevronUp className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
              <span className="sr-only">
                {expanded ? 'Thu gọn header nhập kho' : 'Mở rộng header nhập kho'}
              </span>
            </button>
          </div>
        </div>
        {isDraft && (onEdit || onConfirm || onCancel) ? (
          <div className="flex flex-wrap gap-2" data-testid="inbound-draft-actions">
            {onEdit ? (
              <button
                type="button"
                className="min-h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="inbound-edit-trigger"
                disabled={isBusy}
                onClick={onEdit}
              >
                Sửa
              </button>
            ) : null}
            {onConfirm ? (
              <button
                type="button"
                className="min-h-10 rounded-md border px-3 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="inbound-confirm-trigger"
                disabled={isBusy}
                onClick={onConfirm}
              >
                Xác nhận
              </button>
            ) : null}
            {onCancel ? (
              <button
                type="button"
                className="border-destructive text-destructive min-h-10 rounded-md border px-3 text-sm font-medium hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="inbound-cancel-trigger"
                disabled={isBusy}
                onClick={onCancel}
              >
                Xóa
              </button>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 sm:grid-cols-3">
          <DetailMetric label="ASN" value={plan.sourceDocumentNumber || plan.businessReference} />
          <DetailMetric label="Nhà cung cấp" value={plan.supplierCode ?? 'Chưa có mã'} />
          <DetailMetric label="Kho" value={plan.warehouseCode ?? 'Chưa có mã'} />
        </dl>
        {expanded && (
          <dl
            id="inbound-operator-header-details"
            className="grid gap-2 md:grid-cols-4"
            data-testid="inbound-operator-header-details"
          >
            <DetailMetric label="Trạng thái chứng từ" value={vietnameseOperationalLabel(plan.status)} />
            <DetailMetric label="Trạng thái cổng" value={vietnameseOperationalLabel(plan.gateInStatus)} />
            <DetailMetric label="Dự kiến đến" value={plan.expectedArrivalAt ?? 'Chưa thiết lập'} />
            <DetailMetric label="CoreFlow" value={plan.coreFlowInstanceId ?? 'Chưa liên kết'} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function InboundRecentActivity({ items }: { items: string[] }) {
  return (
    <Card data-testid="inbound-recent-activity">
      <CardHeader>
        <CardTitle className="text-base">Lịch sử thao tác gần nhất</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ol className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item} className="rounded-md border bg-background px-3 py-2">
                {item}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có thao tác trong phiên hiện tại.</p>
        )}
      </CardContent>
    </Card>
  );
}

function InboundTechnicalDetails({ plan }: { plan: InboundPlan }) {
  return (
    <details
      className="rounded-md border bg-card p-3 text-sm"
      data-testid="inbound-technical-details"
    >
      <summary className="cursor-pointer font-medium">Chi tiết kỹ thuật</summary>
      <dl className="mt-3 grid gap-2 text-muted-foreground">
        <DetailMetric label="Plan ID" value={plan.id} />
        <DetailMetric label="CoreFlow" value={plan.coreFlowInstanceId ?? 'Chưa liên kết'} />
      </dl>
    </details>
  );
}

export function InboundPlanDetailPage() {
  const { id: routePlanId } = useParams<{ id: string }>();
  // Review fix: match against the registered route PATTERN (useMatch), not a
  // pathname-suffix check -- `endsWith('/edit')` misread a trailing slash
  // (`/inbound/:id/edit/`) as staying on the detail route, and misread a plan id that
  // itself happens to equal "edit"/"gate-in" (e.g. `/inbound/edit`, the DETAIL route)
  // as the edit/gate-in route. useMatch's compiled pattern requires the full
  // 3-segment shape (`/inbound/:id/edit`) and tolerates a trailing slash by design
  // (react-router's `compilePath` appends `\/*$` when `end: true`, its default), so
  // both cases resolve correctly without hand-rolled string logic.
  const isEditRoute = Boolean(useMatch(ROUTES.INBOUND_PLAN.EDIT()));
  const isGateInRoute = Boolean(useMatch(ROUTES.INBOUND_PLAN.GATE_IN()));
  const mode: 'detail' | 'edit' | 'gate-in' = isEditRoute ? 'edit' : isGateInRoute ? 'gate-in' : 'detail';
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(routePlanId ?? null);
  const [gateReference, setGateReference] = useState('');
  // Review fix (P2): updated synchronously on every render (not via useEffect) so a
  // mutation callback that settles in the narrow window after the operator has already
  // navigated to a DIFFERENT plan still sees the CURRENT route id, not a stale one
  // captured when the request was submitted -- same pattern as `currentRoleCodeRef` in
  // RoleDetailPage.tsx.
  const routePlanIdRef = useRef(routePlanId);
  routePlanIdRef.current = routePlanId;
  // Re-review fix (P1): the id check alone isn't enough -- if gate-in for THIS SAME
  // plan is still in flight and the operator navigates to /edit for it (same id,
  // different mode), the id guard passes and the settled response would still
  // `replace` them off the edit form and back to detail. Track whether we're still on
  // the gate-in route too, so a stale response only acts while both the plan AND the
  // route mode it was submitted from are unchanged.
  const isGateInRouteRef = useRef(isGateInRoute);
  isGateInRouteRef.current = isGateInRoute;

  const detailQuery = useInboundPlan(routePlanId ?? null);
  const mutations = useInboundPlanMutations();

  // Review fix (P1): `useInboundPlanMutations()` now writes every mutation's fresh
  // response straight into this plan's query cache (see UseInboundPlanMutations.ts),
  // so `detailQuery.data` is always the freshest known plan -- no local "mutation-first"
  // fallback needed (the old one only ever tracked recordGateIn and went stale after any
  // LATER mutation, e.g. Draft -> gate-in -> Confirm kept showing Draft).
  const selected = useMemo(
    () => (detailQuery.data?.id === selectedId ? detailQuery.data : null),
    [detailQuery.data, selectedId],
  );

  useEffect(() => {
    if (routePlanId && selectedId !== routePlanId) {
      setSelectedId(routePlanId);
    }
  }, [routePlanId, selectedId]);

  useEffect(() => {
    setGateReference('');
  }, [selected?.id]);

  // Re-review fix (P1, round 3): `applyPlanUpdate`'s monotonic `updatedAt` guard closes
  // the race for two responses that settle in a DIFFERENT order than they were sent, but
  // it degrades to last-settled-wins if BE happens to stamp two different mutations with
  // the exact same timestamp (finite Date() resolution) -- a comparator alone cannot fully
  // order that tie. The sound fix is to never let two plan-mutating actions be in flight
  // for the SAME plan at once: Sửa/Xác nhận/Xóa/gate-in all disable while ANY of them is
  // pending FOR THIS PLAN, not just their own individual mutation.
  //
  // Re-review fix (P1, round 3+4, adversarial-verify): a lock read off THIS component's own
  // `mutations.*.isPending` is scoped correctly WITHIN one page, but `useInboundPlanMutations()`
  // is instantiated separately by the list page and this detail page -- two independent
  // `useMutation()` observer states. `useInboundPlanLockMutationIds()` reads the GLOBAL
  // mutation cache instead (shared by the one QueryClient every page uses), so it sees a
  // pending mutation regardless of which component instance started it -- and, since the
  // SAME shared hook is also used by `InboundPlanPage` (list) for its own Xóa gating (round
  // 4 fix: the list page previously only checked its own `cancelInboundPlan.isPending`,
  // leaving the Detail -> List direction of this same race open), both pages now agree on
  // what "locked" means. See the hook's own doc comment in `UseInboundPlanMutations.ts` for
  // why `selected?.id` is compared as a plain expression here rather than inside the hook's
  // own memoized predicate.
  const pendingLockMutationPlanIds = useInboundPlanLockMutationIds();
  const isPlanMutationPending =
    Boolean(selected) && pendingLockMutationPlanIds.includes(selected?.id);

  const isCancelledTerminal = selected?.status === 'Cancelled';
  const gateInDone = Boolean(selected?.gateInAt || selected?.gateInStatus === 'Recorded');
  const canGateIn = Boolean(
    selected && !isCancelledTerminal && !gateInDone && !isPlanMutationPending && gateReference.trim(),
  );
  // CTA into the Receiving module only makes sense once the plan has left Draft
  // (nothing to receive yet) and isn't Cancelled (dead-end, nothing to receive at all).
  const showStartReceivingCta = Boolean(
    selected && selected.status !== 'Draft' && selected.status !== 'Cancelled',
  );

  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const denied = Boolean(apiError?.isForbidden);
  const detailError =
    detailQuery.error instanceof Error
      ? detailQuery.error.message
      : 'Không thể tải kế hoạch nhập kho.';

  function openEdit() {
    if (!selected) return;
    void navigate(ROUTES.INBOUND_PLAN.EDIT(selected.id));
  }

  function closeEdit() {
    if (!selected) return;
    void navigate(ROUTES.INBOUND_PLAN.DETAIL(selected.id));
  }

  function submitEdit(input: UpdateInboundPlanInput) {
    // Re-review fix (P1, round 3): mirrors the disabled-button guard at the call site --
    // kept here too since this function is the actual mutation trigger, matching the
    // codebase's established pattern of guarding both the UI control and the handler.
    if (!selected || isPlanMutationPending) return;
    mutations.updateInboundPlan.mutate(
      { id: selected.id, input },
      { onSuccess: () => void navigate(ROUTES.INBOUND_PLAN.DETAIL(selected.id)) },
    );
  }

  function submitConfirm() {
    if (!selected || isPlanMutationPending) return;
    mutations.confirmInboundPlan.mutate({ id: selected.id });
  }

  function submitCancelPlan() {
    if (!selected || isPlanMutationPending) return;
    if (!window.confirm(`Xóa kế hoạch nhập kho ${selected.sourceDocumentNumber}?`)) return;
    mutations.cancelInboundPlan.mutate(
      { id: selected.id },
      { onSuccess: () => void navigate(ROUTES.INBOUND_PLAN.ROOT) },
    );
  }

  function submitGateIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canGateIn || isPlanMutationPending) return;
    mutations.recordGateIn.mutate(
      {
        id: selected.id,
        input: {
          gateInAt: new Date().toISOString(),
          gateReference: gateReference.trim(),
        },
      },
      {
        onSuccess: (plan) => {
          // Review fix (P2) + re-review fix (P1): skip if the operator has since
          // navigated away from the SAME plan+gate-in-route this request was
          // submitted from -- either to a different plan (id changed) or to a
          // different mode of the SAME plan, e.g. /edit (mode changed). Either way
          // this stale response must not yank them anywhere or clobber their
          // current view.
          if (routePlanIdRef.current !== plan.id || !isGateInRouteRef.current) return;
          setSelectedId(plan.id);
          setGateReference('');
          // Review fix: without this the operator stays parked on /gate-in, but the
          // "Bắt đầu nhận hàng" CTA only renders in mode === 'detail' -- there was no
          // visible next step after a successful gate-in (AC4/AC14).
          // Review fix (P2): `replace: true` swaps out the now-locked /gate-in
          // history entry instead of stacking DETAIL on top of it, so browser Back
          // returns to wherever the operator came from, not back into the
          // just-completed (now disabled) gate-in form.
          void navigate(ROUTES.INBOUND_PLAN.DETAIL(plan.id), { replace: true });
        },
      },
    );
  }

  const recentActivityItems = useMemo(() => {
    const items: string[] = [];
    if (gateInDone) {
      items.push(`Vào cổng: ${formatDateTime(selected?.gateInAt)}`);
    }
    return items;
  }, [gateInDone, selected?.gateInAt]);

  // IFB-24: edit is Draft-only -- a direct URL visit to /:id/edit for an already
  // confirmed/cancelled plan bounces back to the read-only detail view.
  if (mode === 'edit' && selected && selected.status !== 'Draft') {
    return <Navigate to={ROUTES.INBOUND_PLAN.DETAIL(selected.id)} replace />;
  }

  // Re-review fix (P2, round 3): the post-submit `{ replace: true }` navigate only
  // covers the operator's OWN just-completed gate-in. A direct visit to /:id/gate-in
  // for a plan whose gate-in is already done -- via bookmark, a stale URL, or browser
  // history from a different tab/session -- bypasses that entirely and lands straight on
  // this route, where the form renders locked (isGateInDone) with no CTA to continue.
  // Redirect the same way the edit-mode guard above does.
  if (mode === 'gate-in' && selected && gateInDone) {
    return <Navigate to={ROUTES.INBOUND_PLAN.DETAIL(selected.id)} replace />;
  }

  if (routePlanId && detailQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết chứng từ nhập kho</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={denied ? 'text-muted-foreground text-sm' : 'text-destructive text-sm'}>
            {denied ? 'Không có quyền đọc kế hoạch nhập kho.' : detailError}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1536px] space-y-4">
      {selected && (
        <InboundOperatorHeader
          plan={selected}
          onEdit={openEdit}
          onConfirm={submitConfirm}
          onCancel={submitCancelPlan}
          isBusy={isPlanMutationPending}
        />
      )}

      {selected && mode === 'edit' && (
        <InboundPlanEditPanel
          // Force a remount when the plan id changes so a stale form never keeps
          // showing a previous plan's values (IFB-24 review fix).
          key={selected.id}
          plan={selected}
          isPending={isPlanMutationPending}
          errorMessage={toPanelErrorMessage(
            mutations.updateInboundPlan.error,
            'Không thể lưu thay đổi kế hoạch nhập kho.',
          )}
          onSubmit={submitEdit}
          onCancel={closeEdit}
        />
      )}

      {selected && mode === 'gate-in' && (
        <InboundPlanGateInPanel
          gateReference={gateReference}
          hasPlan={Boolean(selected)}
          isGateInDone={gateInDone}
          isPending={isPlanMutationPending}
          onGateReferenceChange={setGateReference}
          onSubmit={submitGateIn}
        />
      )}

      {selected && mode === 'detail' && showStartReceivingCta && (
        <Card data-testid="inbound-start-receiving-cta">
          <CardHeader>
            <CardTitle className="text-base">Vận hành nhận hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={ROUTES.INBOUND_RECEIVING.DETAIL(selected.id)}>Bắt đầu nhận hàng</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {selected && (
        <div className="space-y-4">
          <Card data-testid="inbound-document-info">
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={selected.gateInStatus} />
                <span className="text-muted-foreground text-sm">{selected.businessReference}</span>
                {selected.isDuplicate ? (
                  <span className="text-muted-foreground text-sm">
                    Đã dùng lại kế hoạch nhập kho hiện có.
                  </span>
                ) : null}
              </div>
              <div className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
                <span>Dự kiến đến: {selected.expectedArrivalAt ?? 'chưa thiết lập'}</span>
                <span>Dấu vết CoreFlow: {selected.coreFlowInstanceId ?? 'chưa liên kết'}</span>
              </div>
            </CardContent>
          </Card>
          <InboundRecentActivity items={recentActivityItems} />
          <InboundTechnicalDetails plan={selected} />
        </div>
      )}
    </div>
  );
}
