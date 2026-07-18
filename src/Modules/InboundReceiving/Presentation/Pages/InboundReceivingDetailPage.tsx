import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useInboundPlan } from '@modules/InboundPlan/Application/Queries/UseInboundPlans';
import { useInboundReceivingMutations } from '@modules/InboundReceiving/Application/Commands/UseInboundReceivingMutations';
import { useSku } from '@modules/MasterData/Application/Queries/CatalogQueries';
import {
  useInboundOperationalState,
  useReceivingReadiness,
} from '@modules/InboundReceiving/Application/Queries/UseInboundReceivingState';
import {
  InboundCompletedStepSummary,
  type InboundCompletedStepSummaryViewModel,
} from '@modules/InboundReceiving/Presentation/Components/InboundCompletedStepSummary';
import { InboundDiscrepancySheet } from '@modules/InboundReceiving/Presentation/Components/InboundDiscrepancySheet';
import { InboundLineConsole } from '@modules/InboundReceiving/Presentation/Components/InboundLineConsole';
import { InboundLineRail } from '@modules/InboundReceiving/Presentation/Components/InboundLineRail';
import {
  deriveFocusedLineStage,
  deriveLineStage,
  isPlanLineFullyReceived,
  isPlanLineFullyReleased,
  READY_FOR_PUTAWAY,
  type InboundLineStage,
} from '@modules/InboundReceiving/Presentation/Components/InboundLineStage';
import { InboundQcPanel } from '@modules/InboundReceiving/Presentation/Components/InboundQcPanel';
import { InboundReceivingReadinessPanel } from '@modules/InboundReceiving/Presentation/Components/InboundReceivingReadinessPanel';
import { InboundReceiptLineRail } from '@modules/InboundReceiving/Presentation/Components/InboundReceiptLineRail';
import { InboundReceivingPanel } from '@modules/InboundReceiving/Presentation/Components/InboundReceivingPanel';
import { InboundReleasePutawayPanel } from '@modules/InboundReceiving/Presentation/Components/InboundReleasePutawayPanel';
import { InboundWorkflowStepper } from '@modules/InboundReceiving/Presentation/Components/InboundWorkflowStepper';
import { usePutawayMutations } from '@modules/Putaway/Application/Commands/UsePutawayMutations';
import {
  mapInboundActionToWorkflowStep,
  type InboundWorkflowStep,
  type InboundWorkflowStepKey,
  type InboundWorkflowStepState,
} from '@modules/InboundReceiving/Presentation/Components/InboundWorkflowStepperModel';
import type {
  InboundDiscrepancyType,
  InboundLpn,
  InboundPutawayRelease,
  QcDispositionCode,
  QcResultStatus,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/InboundReceiving/Domain/Types/Receipt';

const INBOUND_RECEIVING_ALLOWED_ACTIONS = new Set(['receiving', 'qc', 'lpn', 'release', 'discrepancy']);

function resolveWorkflowStepState(
  stepKey: InboundWorkflowStepKey,
  activeStep: InboundWorkflowStepKey,
  done: boolean,
  blocked = false,
  skipped = false,
  approvalRequired = false,
): InboundWorkflowStepState {
  if (skipped) return 'skipped';
  if (done) return 'done';
  // Checked before `blocked`: an ApprovalRequired readiness is recoverable via the
  // override control already rendered on screen, not a hard stop, so it must not
  // paint as the same "locked" state as a genuine Blocked decision.
  if (approvalRequired) return 'approval';
  if (blocked) return 'blocked';
  if (stepKey === activeStep) return 'active';
  return 'waiting';
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
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

function InboundWorkflowProgressBand({
  caption,
  completedSummaryStepKey,
  lineCue,
  onStepSelect,
  steps,
}: {
  caption: string;
  completedSummaryStepKey: InboundWorkflowStepKey | null;
  /** Per-line cue `Bước hiện tại — Dòng: {X}` shown above the read-only ribbon. */
  lineCue: string;
  onStepSelect: (step: InboundWorkflowStep) => void;
  steps: InboundWorkflowStep[];
}) {
  return (
    <Card data-testid="inbound-workflow-progress">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tiến độ dòng đang chọn</CardTitle>
        <p
          className="break-words text-sm text-muted-foreground"
          data-testid="inbound-workflow-progress-caption"
        >
          {caption}
        </p>
        <p
          className="break-words text-sm font-medium text-foreground"
          data-testid="inbound-current-step-line-cue"
        >
          {lineCue}
        </p>
        <p className="break-words text-xs text-muted-foreground" data-testid="inbound-progress-note">
          Tiến độ hiển thị theo dòng đang chọn.
        </p>
      </CardHeader>
      <CardContent>
        {/* Ribbon scrolls horizontally inside its own container so a wide step row
            never forces the whole page to scroll horizontally on mobile. */}
        <div className="overflow-x-auto" data-testid="inbound-workflow-progress-scroller">
          <InboundWorkflowStepper
            steps={steps}
            selectedStepKey={completedSummaryStepKey}
            onStepSelect={onStepSelect}
          />
        </div>
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

function InboundTechnicalDetails({
  confirmedInboundLpn,
  putawayRelease,
  readiness,
  receiptLine,
  receivingSession,
}: {
  confirmedInboundLpn: InboundLpn | null;
  putawayRelease: InboundPutawayRelease | null;
  readiness: ReceivingReadiness | null;
  receiptLine: ReceiptLine | null;
  receivingSession: ReceivingSession | null;
}) {
  return (
    <details
      className="rounded-md border bg-card p-3 text-sm"
      data-testid="inbound-technical-details"
    >
      <summary className="cursor-pointer font-medium">Chi tiết kỹ thuật</summary>
      <dl className="mt-3 grid gap-2 text-muted-foreground">
        <DetailMetric
          label="Readiness"
          value={readiness ? vietnameseOperationalLabel(readiness.decision) : 'Chưa kiểm tra'}
        />
        <DetailMetric label="Rule (readiness)" value={readiness?.ruleCode ?? '—'} />
        <DetailMetric
          label="Phiếu tiếp nhận"
          value={receivingSession?.receiptNumber ?? 'Chưa có'}
        />
        <DetailMetric label="Receipt line" value={receiptLine?.id ?? 'Chưa có'} />
        <DetailMetric label="LPN" value={confirmedInboundLpn?.lpnCode ?? 'Chưa có'} />
        <DetailMetric label="Release" value={putawayRelease?.id ?? 'Chưa có'} />
      </dl>
    </details>
  );
}

export function InboundReceivingDetailPage() {
  const {
    id: routePlanId,
    action: routeActionParam,
    lineId: routeDiscrepancyLineId,
  } = useParams<{ id: string; action?: string; lineId?: string }>();
  const routeAction = routeDiscrepancyLineId ? 'discrepancy' : routeActionParam;
  const navigate = useNavigate();
  const actionPanelRef = useRef<HTMLElement | null>(null);
  const [completedSummaryStepKey, setCompletedSummaryStepKey] =
    useState<InboundWorkflowStepKey | null>(null);
  const [readinessReasonCode, setReadinessReasonCode] = useState('');
  const [readinessOverridePlanId, setReadinessOverridePlanId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  // IDC-07: which receipt line is active when a plan line has more than one
  // (multi-unit serial-controlled receiving, see IFB-14). Null = "use latest".
  const [selectedReceiptLineId, setSelectedReceiptLineId] = useState<string | null>(null);
  const [pendingLineFocusId, setPendingLineFocusId] = useState<string | null>(null);
  const [receivingSessionKey, setReceivingSessionKey] = useState('dock-1');
  const [receivingDeviceCode, setReceivingDeviceCode] = useState('rf-web');
  const [receiptActualQuantity, setReceiptActualQuantity] = useState('1');
  const [receiptRawScan, setReceiptRawScan] = useState('');
  const [receiptManualConfirm, setReceiptManualConfirm] = useState(false);
  const [receiptReasonCode, setReceiptReasonCode] = useState('');
  const [receiptLotNumber, setReceiptLotNumber] = useState('');
  const [receiptExpiryDate, setReceiptExpiryDate] = useState('');
  const [receiptSerialNumber, setReceiptSerialNumber] = useState('');
  const [receiptIdempotencyKey, setReceiptIdempotencyKey] = useState(() => `receipt-${Date.now()}`);
  const [discrepancyType, setDiscrepancyType] =
    useState<InboundDiscrepancyType>('QuantityVariance');
  const [discrepancyReasonCode, setDiscrepancyReasonCode] = useState('');
  const [discrepancyReasonNote, setDiscrepancyReasonNote] = useState('');
  const [discrepancyEvidenceRefs, setDiscrepancyEvidenceRefs] = useState('');
  const [discrepancyIdempotencyKey, setDiscrepancyIdempotencyKey] = useState(
    () => `discrepancy-${Date.now()}`,
  );
  const [qcForceRequired, setQcForceRequired] = useState(false);
  const [qcTaskReasonCode, setQcTaskReasonCode] = useState('');
  const [qcTaskReasonNote, setQcTaskReasonNote] = useState('');
  const [qcTaskEvidenceRefs, setQcTaskEvidenceRefs] = useState('');
  const [qcTaskIdempotencyKey, setQcTaskIdempotencyKey] = useState(() => `qc-task-${Date.now()}`);
  const [qcResultStatus, setQcResultStatus] = useState<QcResultStatus>('Passed');
  const [qcDispositionCode, setQcDispositionCode] = useState<QcDispositionCode>('Release');
  const [qcInspectedQuantity, setQcInspectedQuantity] = useState('1');
  const [qcAcceptedQuantity, setQcAcceptedQuantity] = useState('1');
  const [qcRejectedQuantity, setQcRejectedQuantity] = useState('0');
  const [qcResultReasonCode, setQcResultReasonCode] = useState('');
  const [qcResultReasonNote, setQcResultReasonNote] = useState('');
  const [qcResultEvidenceRefs, setQcResultEvidenceRefs] = useState('');
  const [qcResultIdempotencyKey, setQcResultIdempotencyKey] = useState(
    () => `qc-result-${Date.now()}`,
  );
  const [lpnCode, setLpnCode] = useState('');
  const [ssccCode, setSsccCode] = useState('');
  const [lpnIdempotencyKey, setLpnIdempotencyKey] = useState(() => `lpn-${Date.now()}`);
  const [releaseCurrentLocationCode, setReleaseCurrentLocationCode] = useState('RECEIVING');
  const [releaseRequireLpn, setReleaseRequireLpn] = useState(true);
  const [releaseAttemptLabelOverride, setReleaseAttemptLabelOverride] = useState(false);
  const [releaseReasonCode, setReleaseReasonCode] = useState('');
  const [releaseEvidenceRefs, setReleaseEvidenceRefs] = useState('');
  const [releaseIdempotencyKey, setReleaseIdempotencyKey] = useState(() => `release-${Date.now()}`);

  // Plan header/lines are read via the Plan module's own public Application-layer
  // hook (read-only) -- not by reaching into Plan's Domain/Infrastructure directly.
  // This mirrors how ReasonCode/Putaway/MasterData are already consumed cross-module
  // elsewhere in this codebase.
  const planQuery = useInboundPlan(routePlanId ?? null);
  const plan = planQuery.data ?? null;
  const operationalStateQuery = useInboundOperationalState(routePlanId ?? null);
  const mutations = useInboundReceivingMutations(routePlanId ?? null);
  // Bug fix: release-to-putaway used to leave the released goods with no visible
  // Putaway Task (the FE never called the separate `POST /putaway/tasks/release`
  // step) — auto-chain it right after a successful release below so the operator
  // ends up with a workable task without leaving the Inbound screen.
  const putawayMutations = usePutawayMutations();
  const resetValidateReadiness = mutations.validateReadiness.reset;
  const resetStartReceiving = mutations.startReceivingSession.reset;
  const resetConfirmReceiptLine = mutations.confirmReceiptLine.reset;
  const resetConfirmInboundLpn = mutations.confirmInboundLpn.reset;
  const resetReleaseInboundToPutaway = mutations.releaseInboundToPutaway.reset;
  const resetCaptureDiscrepancy = mutations.captureDiscrepancy.reset;
  const resetEvaluateQcTask = mutations.evaluateQcTask.reset;
  const resetRecordQcResult = mutations.recordQcResult.reset;

  // IRM-02: operational-state read model (persisted, survives reload).
  const operationalState = operationalStateQuery.data ?? null;
  // The read model can carry more than one row per line (re-receive / re-QC), and array order
  // is not a contract — pick the LATEST matching row by timestamp deterministically.
  const latestBy = <T,>(items: T[] | undefined, when: (item: T) => string | null | undefined): T | null => {
    if (!items || items.length === 0) return null;
    return [...items].sort((a, b) => (when(b) ?? '').localeCompare(when(a) ?? ''))[0] ?? null;
  };
  // Mutation-first, persisted-fallback: this session's just-performed action wins immediately
  // (fresh, no stale flicker); the persisted read model fills in on reload when no mutation
  // result is present — that is what fixes "step lost on reload".
  const receivingSession =
    (mutations.startReceivingSession.data?.inboundPlanId === plan?.id
      ? mutations.startReceivingSession.data
      : null) ??
    latestBy(
      operationalState?.receivingSessions.filter((session) => session.inboundPlanId === plan?.id),
      (session) => session.startedAt,
    );
  const selectedLine = useMemo(
    () => plan?.lines.find((line) => line.id === selectedLineId) ?? plan?.lines[0] ?? null,
    [plan?.lines, selectedLineId],
  );
  const selectedSkuQuery = useSku(selectedLine?.skuId ?? null);
  const selectedSku = selectedSkuQuery.data ?? null;
  const skuLotControlled = selectedSku?.lotControlled ?? false;
  const skuExpiryControlled = selectedSku?.expiryControlled ?? false;
  const skuSerialControlled = selectedSku?.serialControlled ?? false;
  // Fail closed while the SKU's control flags are still loading (IDC-03 dual
  // review): defaulting flags to false during the fetch window would let a
  // fast operator submit before a lotControlled/expiryControlled/serialControlled
  // SKU's required fields are known to be required.
  const skuFlagsLoading = Boolean(selectedLine?.skuId) && selectedSkuQuery.isPending;
  const lastConfirmedLine = mutations.confirmReceiptLine.data;
  const mutationConfirmedReceiptLine =
    lastConfirmedLine &&
    lastConfirmedLine.inboundPlanId === plan?.id &&
    lastConfirmedLine.inboundPlanLineId === selectedLine?.id
      ? lastConfirmedLine
      : null;
  // IDC-07: a plan line can have more than one receipt line (multi-unit
  // serial-controlled receiving forces one receiving-confirm call per
  // physical unit — see IFB-14). Keep the full set so each is independently
  // selectable instead of collapsing straight to the latest.
  const receiptLinesForSelectedLine =
    operationalState?.receiptLines.filter(
      (line) => line.inboundPlanId === plan?.id && line.inboundPlanLineId === selectedLine?.id,
    ) ?? [];
  // IDC-07 dual review: `selectedReceiptLineId` must be the single source of
  // truth once set — checking `mutationConfirmedReceiptLine` FIRST would let a
  // fresh confirm-receiving submission silently override an operator's
  // explicit rail pick of a DIFFERENT (older) receipt line on the same plan
  // line, with the rail's own highlight flipping with no click to explain it.
  // `mutationConfirmedReceiptLine` stays only as the bridge for the brief
  // window before `operationalState` refetches and the new line's id becomes
  // findable in `receiptLinesForSelectedLine` (see the effect below, which
  // keeps `selectedReceiptLineId` in sync so the rail reflects reality).
  const confirmedReceiptLine =
    receiptLinesForSelectedLine.find((line) => line.id === selectedReceiptLineId) ??
    mutationConfirmedReceiptLine ??
    latestBy(receiptLinesForSelectedLine, (line) => line.receivedAt);
  const evaluatedQcTask =
    (mutations.evaluateQcTask.data &&
    confirmedReceiptLine?.id === mutations.evaluateQcTask.data.receiptLineId
      ? mutations.evaluateQcTask.data
      : null) ??
    latestBy(
      operationalState?.qcTasks.filter((task) => task.receiptLineId === confirmedReceiptLine?.id),
      (task) => task.createdAt,
    );
  const recordedQcResult =
    (mutations.recordQcResult.data && evaluatedQcTask?.id === mutations.recordQcResult.data.qcTaskId
      ? mutations.recordQcResult.data
      : null) ??
    latestBy(
      operationalState?.qcResults.filter((result) => result.receiptLineId === confirmedReceiptLine?.id),
      (result) => result.recordedAt,
    );
  const capturedDiscrepancy =
    (mutations.captureDiscrepancy.data &&
    mutations.captureDiscrepancy.data.receiptLineId === confirmedReceiptLine?.id
      ? mutations.captureDiscrepancy.data
      : null) ??
    latestBy(
      operationalState?.discrepancies.filter((d) => d.receiptLineId === confirmedReceiptLine?.id),
      (d) => d.recordedAt,
    );
  const captureDiscrepancyErrorMatchesSelectedLine = Boolean(
    confirmedReceiptLine &&
    mutations.captureDiscrepancy.error &&
    mutations.captureDiscrepancy.variables?.input.receiptLineId === confirmedReceiptLine.id,
  );
  const confirmedInboundLpn =
    (mutations.confirmInboundLpn.data &&
    mutations.confirmInboundLpn.data.receiptLineId === confirmedReceiptLine?.id
      ? mutations.confirmInboundLpn.data
      : null) ??
    latestBy(
      operationalState?.lpns.filter((lpn) => lpn.receiptLineId === confirmedReceiptLine?.id),
      (lpn) => lpn.confirmedAt,
    );
  const putawayRelease =
    (mutations.releaseInboundToPutaway.data &&
    mutations.releaseInboundToPutaway.data.receiptLineId === confirmedReceiptLine?.id
      ? mutations.releaseInboundToPutaway.data
      : null) ??
    latestBy(
      operationalState?.releases.filter((release) => release.receiptLineId === confirmedReceiptLine?.id),
      (release) => release.releasedAt,
    );
  // Scoped to the currently-shown release so switching lines doesn't leak a
  // stale task code/error from a previously released, different line.
  const putawayTaskForRelease =
    putawayMutations.releaseTask.data?.inboundPutawayReleaseId === putawayRelease?.id
      ? putawayMutations.releaseTask.data
      : null;
  const putawayTaskErrorForRelease =
    putawayMutations.releaseTask.variables?.inboundPutawayReleaseId === putawayRelease?.id
      ? putawayMutations.releaseTask.error
      : null;
  const selectedInitialLineId = plan?.lines[0]?.id ?? null;
  const selectedInitialExpectedQuantity = plan?.lines[0]?.expectedQuantity ?? 1;
  const readinessQuery = useReceivingReadiness(plan?.id ?? null);
  const readiness =
    readinessOverridePlanId === plan?.id
      ? (mutations.validateReadiness.data ?? readinessQuery.data ?? null)
      : (readinessQuery.data ?? null);
  const apiError = planQuery.error instanceof ApiError ? planQuery.error : null;
  const denied = Boolean(apiError?.isForbidden);
  const detailError =
    planQuery.error instanceof Error
      ? planQuery.error.message
      : 'Không thể tải kế hoạch nhập kho.';
  const isCancelledTerminal = plan?.status === 'Cancelled';
  const gateInDone = Boolean(
    plan?.gateInAt || plan?.gateInStatus === 'Recorded' || readiness?.gateInRecorded,
  );
  const readinessDone = Boolean(readiness?.allowed || readiness?.overrideAccepted);
  // Single source of truth for "readiness resolved ApprovalRequired and hasn't been
  // overridden yet" — reused by the stepper state, the step description, and the
  // console header title so the three can't silently diverge (IFB-05).
  const readinessApprovalRequired = !readinessDone && readiness?.decision === 'ApprovalRequired';
  const readinessBusy = readinessQuery.isLoading || readinessQuery.isFetching;
  const canOverride = Boolean(
    plan &&
      !isCancelledTerminal &&
      !readinessDone &&
      !readinessBusy &&
      !mutations.validateReadiness.isPending &&
      readinessReasonCode.trim(),
  );
  // `!receivingSession` is enforced here (the source-of-truth predicate), not
  // only by the panel unmounting the button once a session exists (IFB-08) —
  // otherwise a future caller reading canStartReceiving directly could
  // silently reintroduce a double-start.
  const canStartReceiving = Boolean(
    plan &&
      !isCancelledTerminal &&
      !receivingSession &&
      readinessDone &&
      !readinessBusy &&
      receivingSessionKey.trim(),
  );
  const canConfirmReceiptLine = Boolean(
    !isCancelledTerminal &&
    receivingSession &&
    selectedLine &&
    !skuFlagsLoading &&
    Number(receiptActualQuantity) > 0 &&
    receiptIdempotencyKey.trim() &&
    (receiptManualConfirm ? receiptReasonCode.trim() : receiptRawScan.trim()) &&
    (!skuLotControlled || receiptLotNumber.trim()) &&
    (!skuExpiryControlled || receiptExpiryDate.trim()) &&
    (!skuSerialControlled || receiptSerialNumber.trim()),
  );
  const discrepancyEvidenceRefList = useMemo(
    () =>
      discrepancyEvidenceRefs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [discrepancyEvidenceRefs],
  );
  const qcTaskEvidenceRefList = useMemo(
    () =>
      qcTaskEvidenceRefs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [qcTaskEvidenceRefs],
  );
  const qcResultEvidenceRefList = useMemo(
    () =>
      qcResultEvidenceRefs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [qcResultEvidenceRefs],
  );
  const releaseEvidenceRefList = useMemo(
    () =>
      releaseEvidenceRefs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [releaseEvidenceRefs],
  );
  const canCaptureDiscrepancy = Boolean(
    !isCancelledTerminal &&
    receivingSession &&
    confirmedReceiptLine &&
    discrepancyReasonCode.trim() &&
    discrepancyEvidenceRefList.length > 0 &&
    discrepancyIdempotencyKey.trim(),
  );
  const canEvaluateQcTask = Boolean(
    !isCancelledTerminal && receivingSession && confirmedReceiptLine && qcTaskIdempotencyKey.trim(),
  );
  const qcInspectedQty = Number(qcInspectedQuantity);
  const qcAcceptedQty = Number(qcAcceptedQuantity);
  const qcRejectedQty = Number(qcRejectedQuantity);
  const qcQuantityBalanced = Math.abs(qcAcceptedQty + qcRejectedQty - qcInspectedQty) < 0.000001;
  const qcNeedsReasonEvidence =
    qcResultStatus !== 'Passed' || qcDispositionCode !== 'Release' || qcRejectedQty > 0;
  const canRecordQcResult = Boolean(
    !isCancelledTerminal &&
    evaluatedQcTask?.required &&
    qcResultIdempotencyKey.trim() &&
    qcInspectedQty > 0 &&
    qcAcceptedQty >= 0 &&
    qcRejectedQty >= 0 &&
    qcQuantityBalanced &&
    (qcNeedsReasonEvidence
      ? qcResultReasonCode.trim() && qcResultEvidenceRefList.length > 0
      : true),
  );
  const putawayReady =
    evaluatedQcTask?.targetInventoryStatusCode === 'READY_FOR_PUTAWAY' ||
    recordedQcResult?.targetInventoryStatusCode === 'READY_FOR_PUTAWAY';
  const canConfirmInboundLpn = Boolean(
    !isCancelledTerminal &&
      receivingSession &&
      confirmedReceiptLine &&
      lpnCode.trim() &&
      lpnIdempotencyKey.trim(),
  );
  const canReleaseInboundToPutaway = Boolean(
    !isCancelledTerminal &&
    receivingSession &&
    confirmedReceiptLine &&
    putawayReady &&
    releaseIdempotencyKey.trim() &&
    (releaseRequireLpn ? confirmedInboundLpn : true),
  );
  const routeWorkflowStep = mapInboundActionToWorkflowStep(routeAction);
  const receivingDone = Boolean(confirmedReceiptLine);
  const needsDiscrepancyRouting = Boolean(
    confirmedReceiptLine?.discrepancySignals.length && !capturedDiscrepancy,
  );
  const qcSkipped = Boolean(evaluatedQcTask && !evaluatedQcTask.required);
  const qcDone = Boolean(recordedQcResult || qcSkipped);
  const lpnDone = Boolean(confirmedInboundLpn);
  const releaseDone = Boolean(putawayRelease);
  // IFB-21: releaseDone above only means this ONE receipt-line was released --
  // a SerialControlled plan line can have several receipt-lines (one per unit,
  // IFB-14), so the badge/stepper must check the plan line's cumulative received
  // quantity separately, not assume one release means the whole line is done.
  const focusedLineFullyReceived = isPlanLineFullyReceived(
    receiptLinesForSelectedLine,
    selectedLine?.id ?? '',
    selectedLine?.skuId ?? '',
  );
  // IFB-22: RELEASE-axis analog of focusedLineFullyReceived above.
  // IFB-23 review fix: now also excludes permanently QC-blocked receipt lines
  // from the completeness math (see isPlanLineFullyReleased's own comment) --
  // pass qcResults so it can resolve each receipt line's latest QC state.
  const focusedLineFullyReleased = isPlanLineFullyReleased(
    receiptLinesForSelectedLine,
    operationalState?.releases ?? [],
    operationalState?.qcResults ?? [],
    selectedLine?.id ?? '',
    selectedLine?.skuId ?? '',
  );
  // IFB-23 review fix: compute the "next unit to release" candidate ONCE,
  // shared by both the "Release đơn vị còn lại" button's visibility gate and
  // its click handler below. Filters QC-ready + not-yet-released candidates,
  // THEN sorts ascending by receivedAt (tie-broken by id) before picking the
  // earliest — array order from the backend is not a contract.
  const nextReleasableUnitForRelease = receiptLinesForSelectedLine
    .filter((line) => {
      if (line.skuId !== selectedLine?.skuId) return false;
      if (operationalState?.releases.some((release) => release.receiptLineId === line.id)) return false;
      if (releaseRequireLpn && !operationalState?.lpns.some((lpn) => lpn.receiptLineId === line.id)) {
        return false;
      }
      const latestResult = latestBy(
        operationalState?.qcResults.filter((result) => result.receiptLineId === line.id),
        (result) => result.recordedAt,
      );
      if (latestResult) return latestResult.targetInventoryStatusCode === READY_FOR_PUTAWAY;
      const latestTask = latestBy(
        operationalState?.qcTasks.filter((task) => task.receiptLineId === line.id),
        (task) => task.createdAt,
      );
      return Boolean(
        latestTask && !latestTask.required && latestTask.targetInventoryStatusCode === READY_FOR_PUTAWAY,
      );
    })
    .sort(
      (a, b) => (a.receivedAt ?? '').localeCompare(b.receivedAt ?? '') || a.id.localeCompare(b.id),
    )[0];
  const isDiscrepancyRoute = Boolean(routeDiscrepancyLineId);
  const discrepancyRouteBlockedMessage = isDiscrepancyRoute
    ? !selectedLine
      ? 'Không tìm thấy dòng nhập kho trong chứng từ hiện tại.'
      : !receivingSession
        ? 'Cần bắt đầu phiên tiếp nhận trước khi báo sai lệch.'
        : !confirmedReceiptLine
          ? 'Cần xác nhận dòng tiếp nhận trước khi báo sai lệch.'
          : null
    : null;
  const inferredWorkflowStep: InboundWorkflowStepKey = releaseDone
    ? 'release'
    : confirmedInboundLpn
      ? 'release'
      : recordedQcResult || putawayReady
        ? 'lpn'
        : evaluatedQcTask || (confirmedReceiptLine && !needsDiscrepancyRouting)
          ? 'qc'
          : receivingSession || readinessDone || gateInDone
            ? 'receiving'
            : plan
              ? 'gate-in'
              : 'gate-in';
  const activeWorkflowStep = routeWorkflowStep ?? inferredWorkflowStep;
  const terminalActionMessage = isCancelledTerminal
    ? 'Chứng từ đã hủy. Không thể tiếp tục thao tác nhập kho.'
    : null;
  const blockedActionMessage =
    discrepancyRouteBlockedMessage ??
    (activeWorkflowStep === 'gate-in'
      ? 'Cần vào cổng trước khi tiếp tục — thao tác vào cổng nằm ở trang Kế hoạch.'
      : activeWorkflowStep === 'qc'
        ? !receivingSession
          ? 'Cần bắt đầu phiên tiếp nhận trước khi QC.'
          : !confirmedReceiptLine
            ? 'Cần xác nhận dòng tiếp nhận trước khi QC.'
            : needsDiscrepancyRouting
              ? 'Dòng có sai lệch — xử lý trước khi QC'
              : null
        : activeWorkflowStep === 'lpn'
          ? !receivingSession
            ? 'Cần bắt đầu phiên tiếp nhận trước khi xác nhận LPN/SSCC.'
            : !confirmedReceiptLine
              ? 'Cần xác nhận dòng tiếp nhận trước khi xác nhận LPN/SSCC.'
              : !putawayReady
                ? 'Cần QC đưa dòng về READY_FOR_PUTAWAY trước khi xác nhận LPN/SSCC.'
                : null
          : activeWorkflowStep === 'release'
            ? !receivingSession
              ? 'Cần bắt đầu phiên tiếp nhận trước khi release.'
              : !confirmedReceiptLine
                ? 'Cần xác nhận dòng tiếp nhận trước khi release.'
                : // IFB-23 review fix: once this receipt line already has a release,
                  // don't retroactively block it on `putawayReady` -- a later QC
                  // re-evaluation can flip that false, but the release already
                  // happened.
                  putawayRelease
                  ? null
                  : !putawayReady
                    ? 'Cần trạng thái READY_FOR_PUTAWAY trước khi release.'
                    : releaseRequireLpn && !confirmedInboundLpn
                      ? 'Cần xác nhận LPN/SSCC trước khi release vì cấu hình đang yêu cầu LPN.'
                      : null
            : null);
  // A Cancelled (terminal) doc overrides every not-yet-cleared step to its own
  // `cancelled` state in one place, instead of threading `isCancelledTerminal`
  // through resolveWorkflowStepState's 5 call sites — steps already `done`
  // (or `skipped`) keep that state so history recorded before cancellation is
  // preserved (IFB-07).
  const rawWorkflowSteps: InboundWorkflowStep[] = [
    {
      key: 'gate-in',
      label: 'Vào cổng',
      description: gateInDone
        ? 'Đã ghi nhận vào cổng.'
        : 'Cần ghi nhận xe/hàng vào cổng ở trang Kế hoạch.',
      state: resolveWorkflowStepState('gate-in', activeWorkflowStep, gateInDone, !plan),
    },
    {
      key: 'receiving',
      label: 'Tiếp nhận',
      description: !gateInDone
        ? 'Cần vào cổng trước khi tiếp nhận.'
        : readinessDone
          ? receivingDone
            ? needsDiscrepancyRouting
              ? 'Dòng tiếp nhận có sai lệch, cần điều phối trước khi QC.'
              : 'Đã xác nhận ít nhất một dòng tiếp nhận.'
            : 'Sẵn sàng quét và xác nhận dòng hàng.'
          : readinessApprovalRequired
            ? 'Cần phê duyệt sẵn sàng — nhập mã lý do để ghi đè.'
            : 'Đang bị chặn bởi kiểm tra sẵn sàng.',
      state: resolveWorkflowStepState(
        'receiving',
        activeWorkflowStep,
        receivingDone && !needsDiscrepancyRouting,
        !readinessDone,
        false,
        readinessApprovalRequired,
      ),
    },
    {
      key: 'qc',
      label: 'QC',
      description: qcSkipped
        ? 'QC không yêu cầu cho dòng này.'
        : qcDone
          ? 'QC đã có kết quả.'
        : 'Đánh giá QC sau khi có dòng tiếp nhận.',
      state: resolveWorkflowStepState('qc', activeWorkflowStep, qcDone, !receivingDone, qcSkipped),
    },
    {
      key: 'lpn',
      label: 'LPN/SSCC',
      description: lpnDone ? 'Đã xác nhận LPN/SSCC.' : 'Xác nhận LPN/SSCC sau QC.',
      state: resolveWorkflowStepState('lpn', activeWorkflowStep, lpnDone, !putawayReady),
    },
    {
      key: 'release',
      label: 'Release',
      // IFB-21 review fix: releaseDone alone only means this ONE receipt-line was
      // released -- the stepper (and the completed-step summary it gates) must not
      // show "Hoàn tất" for a SerialControlled plan line that's only partially
      // received, matching the rail badge's 'released-partial' distinction.
      // IFB-22: same guard on the RELEASE axis.
      description: releaseDone
        ? focusedLineFullyReceived && focusedLineFullyReleased
          ? 'Đã phát hành sang cất hàng.'
          : !focusedLineFullyReceived
            ? 'Đã phát hành một phần — còn đơn vị chưa nhận đủ.'
            : 'Đã phát hành một phần — còn đơn vị chưa release.'
        : 'Release sang công việc cất hàng.',
      state: resolveWorkflowStepState(
        'release',
        activeWorkflowStep,
        releaseDone && focusedLineFullyReceived && focusedLineFullyReleased,
        !confirmedInboundLpn,
      ),
    },
  ];
  const workflowSteps: InboundWorkflowStep[] = isCancelledTerminal
    ? rawWorkflowSteps.map((step) =>
        step.state === 'done' || step.state === 'skipped' ? step : { ...step, state: 'cancelled' },
      )
    : rawWorkflowSteps;
  const completedSummaryStep = workflowSteps.find((step) => step.key === completedSummaryStepKey);
  const activeWorkflowStepLabel =
    workflowSteps.find((step) => step.key === activeWorkflowStep)?.label ?? 'Chưa xác định';
  const selectedLineLabel = selectedLine
    ? `Dòng ${selectedLine.lineNumber} — ${selectedLine.skuCode ?? selectedLine.skuId}`
    : undefined;
  const focusedLineRibbonCaption = selectedLine
    ? `Tiến độ dòng đang chọn: Dòng ${selectedLine.lineNumber} — ${
        selectedLine.skuCode ?? selectedLine.skuId
      }`
    : 'Chưa chọn dòng nào để theo dõi tiến độ.';
  // Per-line execution cue (AC7): names the active step AND the focused line so
  // the operator never confuses lifecycle (document) with per-line execution.
  const focusedLineStepCue = selectedLine
    ? `Bước hiện tại — Dòng: ${selectedLine.lineNumber} — ${
        selectedLine.skuCode ?? selectedLine.skuId
      }`
    : 'Bước hiện tại — Dòng: chưa chọn';
  const focusedLineStage = deriveFocusedLineStage({
    gateInDone,
    receivingDone,
    qcDone,
    lpnDone,
    releaseDone,
    fullyReceived: focusedLineFullyReceived,
    fullyReleased: focusedLineFullyReleased,
  });
  // Rail badge fix: every line gets its OWN real stage from the operational-state
  // read model (already fetched in one call, carries `inboundPlanLineId` on every
  // row) instead of defaulting to `not-started` for whichever line isn't focused.
  // The focused line keeps the richer mutation-aware `focusedLineStage` above so
  // it still updates instantly on submit, before the read model refetches.
  const lineStages = useMemo(() => {
    const map: Record<string, InboundLineStage> = {};
    for (const line of plan?.lines ?? []) {
      map[line.id] =
        line.id === selectedLine?.id
          ? focusedLineStage
          : deriveLineStage({ lineId: line.id, skuId: line.skuId, gateInDone, operationalState });
    }
    return map;
  }, [plan?.lines, selectedLine?.id, focusedLineStage, gateInDone, operationalState]);
  const completedStepSummary: InboundCompletedStepSummaryViewModel | null =
    completedSummaryStep?.state === 'done'
      ? {
          stepLabel: completedSummaryStep.label,
          lineLabel:
            completedSummaryStep.key === 'gate-in' ? undefined : selectedLineLabel ?? 'Chưa chọn dòng',
          limitation:
            'Tóm tắt này chỉ phản ánh dữ liệu trong phiên hiện tại; sau reload cần read model riêng.',
          items:
            completedSummaryStep.key === 'gate-in'
              ? [
                  { label: 'Trạng thái cổng', value: vietnameseOperationalLabel(plan?.gateInStatus ?? 'Recorded') },
                  { label: 'Thời điểm vào cổng', value: formatDateTime(plan?.gateInAt) },
                  { label: 'Tham chiếu cổng', value: plan?.gateReference ?? 'Chưa có' },
                  { label: 'Xe', value: plan?.vehicleNumber ?? 'Chưa có' },
                ]
              : completedSummaryStep.key === 'receiving' && confirmedReceiptLine
                ? [
                    {
                      label: 'Dòng tiếp nhận',
                      value: `Dòng ${confirmedReceiptLine.lineNumber}`,
                    },
                    {
                      label: 'Số lượng thực nhận',
                      value: `${formatQuantity(confirmedReceiptLine.actualQuantity)} ${
                        confirmedReceiptLine.uomCode ?? ''
                      }`.trim(),
                    },
                    {
                      label: 'Trạng thái dòng',
                      value: vietnameseOperationalLabel(confirmedReceiptLine.status),
                    },
                    {
                      label: 'Mã lý do',
                      value: confirmedReceiptLine.reasonCode ?? 'Không có',
                    },
                  ]
                : completedSummaryStep.key === 'qc'
                  ? [
                      {
                        label: 'Kết luận QC',
                        value: recordedQcResult
                          ? vietnameseOperationalLabel(recordedQcResult.resultStatus)
                          : evaluatedQcTask?.required
                            ? vietnameseOperationalLabel(evaluatedQcTask.taskStatus)
                            : 'Không yêu cầu QC',
                      },
                      {
                        label: 'Hướng xử lý QC',
                        value: recordedQcResult
                          ? vietnameseOperationalLabel(recordedQcResult.dispositionCode)
                          : 'Không yêu cầu QC',
                      },
                      {
                        label: 'Trạng thái tồn sau QC',
                        value:
                          recordedQcResult?.targetInventoryStatusCode ??
                          evaluatedQcTask?.targetInventoryStatusCode ??
                          'Chưa có',
                      },
                      {
                        label: 'Số lượng kiểm',
                        value: recordedQcResult
                          ? formatQuantity(recordedQcResult.inspectedQuantity)
                          : evaluatedQcTask
                            ? formatQuantity(evaluatedQcTask.actualQuantity)
                            : 'Chưa có',
                      },
                    ]
                  : completedSummaryStep.key === 'lpn' && confirmedInboundLpn
                    ? [
                        { label: 'LPN', value: confirmedInboundLpn.lpnCode },
                        { label: 'SSCC', value: confirmedInboundLpn.ssccCode ?? 'Không có' },
                        {
                          label: 'Số lượng',
                          value: `${formatQuantity(confirmedInboundLpn.quantity)} ${
                            confirmedInboundLpn.uomCode ?? ''
                          }`.trim(),
                        },
                        { label: 'Thời điểm xác nhận', value: formatDateTime(confirmedInboundLpn.confirmedAt) },
                      ]
                    : completedSummaryStep.key === 'release' && putawayRelease
                      ? [
                          { label: 'Mã phát hành', value: putawayRelease.id },
                          {
                            label: 'Trạng thái tồn',
                            value: putawayRelease.inventoryStatusCode,
                          },
                          {
                            label: 'Số lượng',
                            value: `${formatQuantity(putawayRelease.quantity)} ${
                              putawayRelease.uomCode ?? ''
                            }`.trim(),
                          },
                          { label: 'Thời điểm release', value: formatDateTime(putawayRelease.releasedAt) },
                        ]
                      : [{ label: 'Dữ liệu phiên', value: 'Chưa có dữ liệu tóm tắt trong phiên này' }],
        }
      : null;

  useEffect(() => {
    if (!pendingLineFocusId || isDiscrepancyRoute) return;
    // Route post-line-action focus to the always-visible focused-line console
    // (not the rail line button, which is `display:none` while the rail is
    // collapsed on mobile, making `.focus()` a silent no-op that drops focus to
    // <body>). This keeps focus on a visible surface on BOTH desktop and mobile.
    actionPanelRef.current?.focus();
    setPendingLineFocusId(null);
  }, [isDiscrepancyRoute, pendingLineFocusId]);

  useEffect(() => {
    if (
      routeDiscrepancyLineId &&
      plan?.lines.some((line) => line.id === routeDiscrepancyLineId) &&
      selectedLineId !== routeDiscrepancyLineId
    ) {
      setSelectedLineId(routeDiscrepancyLineId);
    }
  }, [routeDiscrepancyLineId, plan?.lines, selectedLineId]);

  useEffect(() => {
    setCompletedSummaryStepKey(null);
  }, [plan?.id, selectedLine?.id]);

  useEffect(() => {
    setReadinessReasonCode('');
    setReadinessOverridePlanId(null);
    setSelectedLineId(selectedInitialLineId);
    setReceiptActualQuantity(String(selectedInitialExpectedQuantity));
    setReceiptRawScan('');
    setReceiptManualConfirm(false);
    setReceiptReasonCode('');
    setReceiptIdempotencyKey(`receipt-${plan?.id ?? 'none'}-${Date.now()}`);
    setDiscrepancyType('QuantityVariance');
    setDiscrepancyReasonCode('');
    setDiscrepancyReasonNote('');
    setDiscrepancyEvidenceRefs('');
    setDiscrepancyIdempotencyKey(`discrepancy-${plan?.id ?? 'none'}-${Date.now()}`);
    setQcForceRequired(false);
    setQcTaskReasonCode('');
    setQcTaskReasonNote('');
    setQcTaskEvidenceRefs('');
    setQcTaskIdempotencyKey(`qc-task-${plan?.id ?? 'none'}-${Date.now()}`);
    setQcResultStatus('Passed');
    setQcDispositionCode('Release');
    setQcInspectedQuantity(String(selectedInitialExpectedQuantity));
    setQcAcceptedQuantity(String(selectedInitialExpectedQuantity));
    setQcRejectedQuantity('0');
    setQcResultReasonCode('');
    setQcResultReasonNote('');
    setQcResultEvidenceRefs('');
    setQcResultIdempotencyKey(`qc-result-${plan?.id ?? 'none'}-${Date.now()}`);
    setLpnCode('');
    setSsccCode('');
    setLpnIdempotencyKey(`lpn-${plan?.id ?? 'none'}-${Date.now()}`);
    setReleaseCurrentLocationCode('RECEIVING');
    setReleaseRequireLpn(true);
    setReleaseAttemptLabelOverride(false);
    setReleaseReasonCode('');
    setReleaseEvidenceRefs('');
    setReleaseIdempotencyKey(`release-${plan?.id ?? 'none'}-${Date.now()}`);
    resetValidateReadiness();
    resetStartReceiving();
    resetConfirmReceiptLine();
    resetConfirmInboundLpn();
    resetReleaseInboundToPutaway();
    resetCaptureDiscrepancy();
    resetEvaluateQcTask();
    resetRecordQcResult();
  }, [
    resetCaptureDiscrepancy,
    resetConfirmReceiptLine,
    resetConfirmInboundLpn,
    resetEvaluateQcTask,
    resetReleaseInboundToPutaway,
    resetRecordQcResult,
    resetStartReceiving,
    resetValidateReadiness,
    plan?.id,
    selectedInitialExpectedQuantity,
    selectedInitialLineId,
  ]);

  // Switching the operator-selected line within the same plan (line rail click)
  // does NOT retrigger the effect above (keyed on the plan's first line, not the
  // active selection) — without this, a Lot/Expiry/Serial value typed for one
  // line could silently carry over and be submitted for a different line's SKU
  // (IDC-03 dual review).
  useEffect(() => {
    setReceiptLotNumber('');
    setReceiptExpiryDate('');
    setReceiptSerialNumber('');
  }, [selectedLine?.id]);

  // IDC-07 dual review: reset the receipt-line selection whenever the PLAN
  // line changes, regardless of which path changed it (rail click, the
  // discrepancy deep-link effect above, browser back/forward).
  useEffect(() => {
    setSelectedReceiptLineId(null);
  }, [selectedLine?.id]);

  // IDC-07 dual review: a fresh confirm-receiving submission for the SAME
  // plan line must become the operator's new explicit selection — not a
  // silent bypass of whatever they had previously picked via the rail.
  useEffect(() => {
    const line = mutations.confirmReceiptLine.data;
    if (line && line.inboundPlanId === plan?.id && line.inboundPlanLineId === selectedLine?.id) {
      setSelectedReceiptLineId(line.id);
    }
  }, [mutations.confirmReceiptLine.data, plan?.id, selectedLine?.id]);

  // IDC-07 dual review: QC/LPN/Release/discrepancy form fields must not carry
  // over when the operator switches which receipt line is active (via the new
  // rail) — otherwise a quantity/reason/evidence value typed while reviewing
  // one receipt line could be silently submitted against a different one.
  useEffect(() => {
    setDiscrepancyReasonCode('');
    setDiscrepancyReasonNote('');
    setDiscrepancyEvidenceRefs('');
    setQcForceRequired(false);
    setQcTaskReasonCode('');
    setQcTaskReasonNote('');
    setQcTaskEvidenceRefs('');
    setQcTaskIdempotencyKey(`qc-task-${confirmedReceiptLine?.id ?? 'none'}-${Date.now()}`);
    setQcResultStatus('Passed');
    setQcDispositionCode('Release');
    setQcInspectedQuantity(String(confirmedReceiptLine?.actualQuantity ?? selectedInitialExpectedQuantity));
    setQcAcceptedQuantity(String(confirmedReceiptLine?.actualQuantity ?? selectedInitialExpectedQuantity));
    setQcRejectedQuantity('0');
    setQcResultReasonCode('');
    setQcResultReasonNote('');
    setQcResultEvidenceRefs('');
    setQcResultIdempotencyKey(`qc-result-${confirmedReceiptLine?.id ?? 'none'}-${Date.now()}`);
    setLpnCode('');
    setSsccCode('');
    setLpnIdempotencyKey(`lpn-${confirmedReceiptLine?.id ?? 'none'}-${Date.now()}`);
    setReleaseCurrentLocationCode('RECEIVING');
    setReleaseRequireLpn(true);
    setReleaseAttemptLabelOverride(false);
    setReleaseReasonCode('');
    setReleaseEvidenceRefs('');
    setReleaseIdempotencyKey(`release-${confirmedReceiptLine?.id ?? 'none'}-${Date.now()}`);
  }, [confirmedReceiptLine?.id, confirmedReceiptLine?.actualQuantity, selectedInitialExpectedQuantity]);

  function submitOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan || !canOverride || mutations.validateReadiness.isPending) return;
    mutations.validateReadiness.mutate(
      {
        id: plan.id,
        input: { attemptOverride: true, reasonCode: readinessReasonCode.trim() },
      },
      { onSuccess: () => setReadinessOverridePlanId(plan.id) },
    );
  }

  function submitStartReceiving(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan || !canStartReceiving) return;
    mutations.startReceivingSession.mutate({
      id: plan.id,
      input: {
        sessionKey: receivingSessionKey.trim(),
        deviceCode: receivingDeviceCode.trim() || null,
      },
    });
  }

  function submitReceiptLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingSession || !selectedLine || !canConfirmReceiptLine) return;
    mutations.confirmReceiptLine.mutate(
      {
        receiptId: receivingSession.receiptId,
        input: {
          inboundPlanLineId: selectedLine.id,
          actualQuantity: Number(receiptActualQuantity),
          manualConfirm: receiptManualConfirm,
          reasonCode: receiptManualConfirm ? receiptReasonCode.trim() : null,
          lotNumber: skuLotControlled ? receiptLotNumber.trim() : null,
          expiryDate: skuExpiryControlled ? receiptExpiryDate.trim() : null,
          serialNumber: skuSerialControlled ? receiptSerialNumber.trim() : null,
          idempotencyKey: receiptIdempotencyKey.trim(),
          scanEvidence: receiptManualConfirm
            ? null
            : {
                rawValue: receiptRawScan.trim(),
                scanResult: 'Accepted',
                resolvedSkuId: selectedLine.skuId,
                resolvedUomId: selectedLine.uomId,
              },
        },
      },
      {
        onSuccess: (line) => {
          setReceiptRawScan('');
          setReceiptReasonCode('');
          setReceiptLotNumber('');
          setReceiptExpiryDate('');
          setReceiptSerialNumber('');
          setReceiptIdempotencyKey(`receipt-${selectedLine.id}-${Date.now()}`);
          setDiscrepancyType(line.discrepancySignals[0] ?? 'QuantityVariance');
          setQcTaskIdempotencyKey(`qc-task-${line.id}-${Date.now()}`);
          setQcInspectedQuantity(String(line.actualQuantity));
          setQcAcceptedQuantity(String(line.actualQuantity));
          setQcRejectedQuantity('0');
          setQcResultIdempotencyKey(`qc-result-${line.id}-${Date.now()}`);
          setLpnCode('');
          setSsccCode('');
          setLpnIdempotencyKey(`lpn-${line.id}-${Date.now()}`);
          setReleaseCurrentLocationCode('RECEIVING');
          setReleaseReasonCode('');
          setReleaseEvidenceRefs('');
          setReleaseIdempotencyKey(`release-${line.id}-${Date.now()}`);
          mutations.evaluateQcTask.reset();
          mutations.recordQcResult.reset();
          mutations.confirmInboundLpn.reset();
          mutations.releaseInboundToPutaway.reset();
        },
      },
    );
  }

  function submitInboundLpn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingSession || !confirmedReceiptLine || !canConfirmInboundLpn) return;
    mutations.confirmInboundLpn.mutate(
      {
        receiptId: receivingSession.receiptId,
        receiptLineId: confirmedReceiptLine.id,
        input: {
          lpnCode: lpnCode.trim(),
          ssccCode: ssccCode.trim() || null,
          idempotencyKey: lpnIdempotencyKey.trim(),
        },
      },
      {
        onSuccess: (lpn) => {
          setLpnCode(lpn.lpnCode);
          setSsccCode(lpn.ssccCode ?? '');
          setLpnIdempotencyKey(`lpn-${lpn.receiptLineId}-${Date.now()}`);
        },
      },
    );
  }

  function openDiscrepancyOverlay() {
    if (!plan || !selectedLine || isCancelledTerminal) return;
    const signalType = confirmedReceiptLine?.discrepancySignals[0];
    // Pre-seed from the line's first signal when present; otherwise reset to the
    // documented default so a no-signal line never inherits the previous line's
    // stale type.
    setDiscrepancyType(signalType ?? 'QuantityVariance');
    setDiscrepancyIdempotencyKey(
      `discrepancy-${confirmedReceiptLine?.id ?? selectedLine.id}-${Date.now()}`,
    );
    void navigate(ROUTES.INBOUND_RECEIVING.DISCREPANCY(plan.id, selectedLine.id));
  }

  function navigateToReceivingAndFocusSelectedLine() {
    if (!plan) return;
    const selectedLineFocusId = selectedLine?.id;
    setPendingLineFocusId(selectedLineFocusId ?? null);
    void navigate(ROUTES.INBOUND_RECEIVING.ACTION(plan.id, 'receiving'));
  }

  // IFB-22: RELEASE-axis analog -- reopens the release flow for the currently
  // selected line (mirrors navigateToReceivingAndFocusSelectedLine above).
  function navigateToReleaseAndFocusSelectedLine() {
    if (!plan) return;
    const selectedLineFocusId = selectedLine?.id;
    setPendingLineFocusId(selectedLineFocusId ?? null);
    setSelectedReceiptLineId(nextReleasableUnitForRelease?.id ?? null);
    void navigate(ROUTES.INBOUND_RECEIVING.ACTION(plan.id, 'release'));
  }

  function closeDiscrepancyOverlay() {
    navigateToReceivingAndFocusSelectedLine();
  }

  function closeCompletedStepSummary() {
    setCompletedSummaryStepKey(null);
    window.setTimeout(() => actionPanelRef.current?.focus(), 0);
  }

  function selectWorkflowStep(step: InboundWorkflowStep) {
    // Terminal docs: the console already shows the prominent terminal message;
    // every ribbon click just refocuses the console with no active step.
    if (terminalActionMessage) {
      setCompletedSummaryStepKey(null);
      window.setTimeout(() => actionPanelRef.current?.focus(), 0);
      return;
    }
    // `done` → open the read-only completed-step summary.
    if (step.state === 'done') {
      setCompletedSummaryStepKey(step.key);
      return;
    }
    // `active`/`skipped` → focus the console on that step's panel. `gate-in` is
    // the one step whose action lives on a DIFFERENT module (the Plan detail
    // page) since this page has no gate-in panel of its own.
    if (step.state === 'active' || step.state === 'skipped') {
      setCompletedSummaryStepKey(null);
      if (plan) {
        if (step.key === 'gate-in') {
          void navigate(ROUTES.INBOUND_PLAN.GATE_IN(plan.id));
        } else {
          void navigate(ROUTES.INBOUND_RECEIVING.ACTION(plan.id, step.key));
        }
      }
      window.setTimeout(() => actionPanelRef.current?.focus(), 0);
    }
  }

  function submitDiscrepancy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingSession || !confirmedReceiptLine || !canCaptureDiscrepancy) return;
    mutations.captureDiscrepancy.mutate(
      {
        receiptId: receivingSession.receiptId,
        input: {
          receiptLineId: confirmedReceiptLine.id,
          discrepancyType,
          reasonCode: discrepancyReasonCode.trim(),
          reasonNote: discrepancyReasonNote.trim() || null,
          evidenceRefs: discrepancyEvidenceRefList,
          idempotencyKey: discrepancyIdempotencyKey.trim(),
        },
      },
      {
        onSuccess: () => {
          setDiscrepancyReasonNote('');
          setDiscrepancyEvidenceRefs('');
          setDiscrepancyIdempotencyKey(`discrepancy-${confirmedReceiptLine.id}-${Date.now()}`);
          navigateToReceivingAndFocusSelectedLine();
        },
      },
    );
  }

  function submitEvaluateQcTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingSession || !confirmedReceiptLine || !canEvaluateQcTask) return;
    // Re-evaluating QC can flip `required`; clear any prior recorded QC result so a
    // fresh evaluation never rides on stale `recordedQcResult` data (no-op on the
    // first-evaluate path where recordQcResult has no data yet).
    mutations.recordQcResult.reset();
    mutations.evaluateQcTask.mutate(
      {
        receiptId: receivingSession.receiptId,
        input: {
          receiptLineId: confirmedReceiptLine.id,
          idempotencyKey: qcTaskIdempotencyKey.trim(),
          forceRequired: qcForceRequired,
          reasonCode: qcTaskReasonCode.trim() || null,
          reasonNote: qcTaskReasonNote.trim() || null,
          evidenceRefs: qcTaskEvidenceRefList,
        },
      },
      {
        onSuccess: (task) => {
          setQcInspectedQuantity(String(task.actualQuantity));
          setQcAcceptedQuantity(String(task.actualQuantity));
          setQcRejectedQuantity('0');
          setQcResultIdempotencyKey(`qc-result-${task.id}-${Date.now()}`);
        },
      },
    );
  }

  function submitQcResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!evaluatedQcTask || !canRecordQcResult) return;
    mutations.recordQcResult.mutate(
      {
        qcTaskId: evaluatedQcTask.id,
        input: {
          idempotencyKey: qcResultIdempotencyKey.trim(),
          resultStatus: qcResultStatus,
          dispositionCode: qcDispositionCode,
          inspectedQuantity: Number(qcInspectedQuantity),
          acceptedQuantity: Number(qcAcceptedQuantity),
          rejectedQuantity: Number(qcRejectedQuantity),
          reasonCode: qcResultReasonCode.trim() || null,
          reasonNote: qcResultReasonNote.trim() || null,
          evidenceRefs: qcResultEvidenceRefList,
        },
      },
      {
        onSuccess: () => {
          setQcResultReasonNote('');
          setQcResultEvidenceRefs('');
          setQcResultIdempotencyKey(`qc-result-${evaluatedQcTask.id}-${Date.now()}`);
        },
      },
    );
  }

  function submitReleaseInboundToPutaway(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingSession || !confirmedReceiptLine || !canReleaseInboundToPutaway) return;
    mutations.releaseInboundToPutaway.mutate(
      {
        receiptId: receivingSession.receiptId,
        receiptLineId: confirmedReceiptLine.id,
        input: {
          currentLocationCode: releaseCurrentLocationCode.trim() || null,
          requireLpn: releaseRequireLpn,
          attemptLabelOverride: releaseAttemptLabelOverride,
          reasonCode: releaseReasonCode.trim() || null,
          evidenceRefs: releaseEvidenceRefList,
          idempotencyKey: releaseIdempotencyKey.trim(),
        },
      },
      {
        onSuccess: (release) => {
          setReleaseIdempotencyKey(`release-${release.receiptLineId}-${Date.now()}`);
          setReleaseReasonCode('');
          setReleaseEvidenceRefs('');
          // No targetLocationId on purpose — the BE's own suggested-target rule
          // engine (RULE-PUT-ELIG-01) picks it, same as a manual `POST
          // /putaway/tasks/release` call already does.
          //
          // Idempotency key is DETERMINISTIC (release.id only, no timestamp) on
          // purpose: a time-based suffix would defeat idempotency.
          putawayMutations.releaseTask.mutate({
            inboundPutawayReleaseId: release.id,
            sourceLocationId: release.currentLocationId,
            sourceLocationCode: release.currentLocationCode,
            idempotencyKey: `putaway-release-${release.id}`,
          });
        },
      },
    );
  }

  const nextActionTitle =
    activeWorkflowStep === 'gate-in'
      ? 'Vào cổng'
      : activeWorkflowStep === 'receiving'
        ? readinessDone
          ? 'Tiếp nhận hàng'
          : readinessApprovalRequired
            ? 'Tiếp nhận cần phê duyệt sẵn sàng'
            : 'Tiếp nhận đang bị chặn'
        : activeWorkflowStep === 'qc'
          ? 'QC'
          : activeWorkflowStep === 'lpn'
            ? 'LPN/SSCC'
            : 'Release';

  const recentActivityItems = useMemo(() => {
    const items: string[] = [];
    // Gate-in activity lives on the Plan module's own recent-activity list now.
    if (receivingSession) {
      items.push(`Phiên tiếp nhận: ${receivingSession.receiptNumber}`);
    }
    if (confirmedReceiptLine) {
      items.push(
        `Nhận dòng ${confirmedReceiptLine.lineNumber}: ${formatQuantity(
          confirmedReceiptLine.actualQuantity,
        )} ${confirmedReceiptLine.uomCode ?? ''}`,
      );
    }
    if (evaluatedQcTask) {
      items.push(
        evaluatedQcTask.required
          ? `QC: cần kiểm tra, trạng thái ${vietnameseOperationalLabel(evaluatedQcTask.taskStatus)}`
          : 'QC: Không yêu cầu theo rule hiện tại',
      );
    }
    if (recordedQcResult) {
      items.push(`Kết quả QC: ${vietnameseOperationalLabel(recordedQcResult.resultStatus)}`);
    }
    if (confirmedInboundLpn) {
      items.push(`LPN/SSCC: ${confirmedInboundLpn.lpnCode}`);
    }
    if (putawayRelease) {
      items.push(`Release: ${formatDateTime(putawayRelease.releasedAt)}`);
    }
    return items;
  }, [
    confirmedInboundLpn,
    confirmedReceiptLine,
    evaluatedQcTask,
    putawayRelease,
    receivingSession,
    recordedQcResult,
  ]);

  if (routeAction && routePlanId && !INBOUND_RECEIVING_ALLOWED_ACTIONS.has(routeAction)) {
    return <Navigate to={ROUTES.INBOUND_RECEIVING.DETAIL(routePlanId)} replace />;
  }

  if (routePlanId && planQuery.error) {
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

  // Prominent amber card reflects ONLY the current active step's blocker (or the
  // terminal explanation). A read-only ribbon click must never raise it.
  const consoleBlockedMessage = terminalActionMessage ?? blockedActionMessage;
  // When the doc is terminal the terminal message always wins; an open
  // completed-step summary must not swallow the terminal explanation.
  const isConsoleSummaryOpen = Boolean(completedStepSummary) && !isCancelledTerminal;
  // The prominent console title is the FOCUSED LINE; `Bước:` stays a separate
  // indicator below it. When a completed-step summary is open the title may show
  // that step instead.
  const consoleTitle = isConsoleSummaryOpen
    ? `Tóm tắt ${completedStepSummary?.stepLabel}`
    : selectedLineLabel ?? 'Chưa chọn dòng';
  // Subordinate action label folded into the `Bước:` indicator.
  const consoleStepActionLabel = nextActionTitle;
  // Single canonical discrepancy trigger lives in the focused-line console. It
  // only appears once the focused line is received (a `confirmedReceiptLine`
  // exists) — discrepancy capture requires one, so showing it earlier (e.g. on
  // gate-in) would be a disabled, meaningless control.
  const showDiscrepancyTrigger = Boolean(confirmedReceiptLine) && !isCancelledTerminal;
  const canReportDiscrepancy = Boolean(confirmedReceiptLine) && !isCancelledTerminal;
  // Once a discrepancy has been filed in-session for the focused line, surface
  // that state near the trigger so the operator can tell it was already reported.
  const filedDiscrepancyStatusLabel = capturedDiscrepancy
    ? vietnameseOperationalLabel(capturedDiscrepancy.status)
    : null;
  const discrepancyTriggerHelper = filedDiscrepancyStatusLabel
    ? `Đã báo sai lệch — ${filedDiscrepancyStatusLabel}.`
    : confirmedReceiptLine
      ? needsDiscrepancyRouting
        ? 'Dòng có sai lệch — mở để chuyển xử lý trước khi QC.'
        : 'Mở báo sai lệch cho dòng đang chọn khi cần điều phối ngoại lệ.'
      : 'Cần xác nhận dòng tiếp nhận trước khi báo sai lệch.';
  // Relabel the trigger once a discrepancy is on file so it reads as a review /
  // update action rather than a first-time report.
  const discrepancyTriggerLabel = filedDiscrepancyStatusLabel
    ? 'Xem/cập nhật sai lệch'
    : 'Báo sai lệch dòng này';

  return (
    <div className="mx-auto w-full max-w-[1536px] space-y-4">
      {plan && (
        <>
          <Link
            to={ROUTES.INBOUND_PLAN.DETAIL(plan.id)}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            data-testid="inbound-receiving-back-to-plan"
          >
            ← Quay lại kế hoạch {plan.businessReference}
          </Link>
          <InboundWorkflowProgressBand
            caption={focusedLineRibbonCaption}
            completedSummaryStepKey={completedSummaryStepKey}
            lineCue={focusedLineStepCue}
            steps={workflowSteps}
            onStepSelect={selectWorkflowStep}
          />
        </>
      )}

      {plan && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Mobile (below xl): rail is rendered SECOND (collapsible `Dòng khác`
              below the pinned console) via order-2; desktop keeps it as the
              always-visible LEFT column via xl:order-1. The console mirrors this
              with order-1 / xl:order-2 so the desktop `[rail | console]` grid is
              preserved while mobile pins the action form to the top. */}
          <div className="order-2 min-w-0 xl:order-1" data-testid="inbound-line-rail-slot">
            <InboundLineRail
              lineStages={lineStages}
              lines={plan.lines}
              selectedLineId={selectedLine?.id ?? null}
              onSelect={(line) => {
                setSelectedLineId(line.id);
                setSelectedReceiptLineId(null);
                setReceiptActualQuantity(String(line.expectedQuantity));
              }}
            />
          </div>

          <div className="order-1 min-w-0 xl:order-2" data-testid="inbound-line-console-slot">
          <InboundLineConsole
            panelRef={actionPanelRef}
            title={consoleTitle}
            stepLabel={activeWorkflowStepLabel}
            stepActionLabel={consoleStepActionLabel}
            blockedMessage={consoleBlockedMessage}
            isSummaryOpen={isConsoleSummaryOpen}
            isTerminal={isCancelledTerminal}
            showDiscrepancyTrigger={showDiscrepancyTrigger}
            canReportDiscrepancy={canReportDiscrepancy}
            discrepancyTriggerHelper={discrepancyTriggerHelper}
            discrepancyTriggerLabel={discrepancyTriggerLabel}
            onOpenDiscrepancy={openDiscrepancyOverlay}
          >
            {terminalActionMessage ? null : completedStepSummary ? (
              <InboundCompletedStepSummary
                summary={completedStepSummary}
                onClose={closeCompletedStepSummary}
              />
            ) : (
              <>
            {activeWorkflowStep === 'gate-in' && (
              <Button asChild>
                <Link to={ROUTES.INBOUND_PLAN.GATE_IN(plan.id)}>Đi tới Vào cổng</Link>
              </Button>
            )}

            {activeWorkflowStep === 'receiving' && !readinessDone && !discrepancyRouteBlockedMessage && (
              <InboundReceivingReadinessPanel
                gateInDone={gateInDone}
                hasPlan={Boolean(plan)}
                isPending={mutations.validateReadiness.isPending}
                isReadinessLoading={readinessBusy}
                onReasonCodeChange={setReadinessReasonCode}
                onSubmit={submitOverride}
                overrideErrorMessage={toPanelErrorMessage(
                  mutations.validateReadiness.error,
                  'Không thể ghi đè kiểm tra sẵn sàng.',
                )}
                readiness={readiness}
                reasonCode={readinessReasonCode}
              />
            )}

            {activeWorkflowStep === 'receiving' && readinessDone && !discrepancyRouteBlockedMessage && (
              <InboundReceivingPanel
                canConfirmReceiptLine={canConfirmReceiptLine}
                canStartReceiving={canStartReceiving}
                confirmReceiptLineErrorMessage={toPanelErrorMessage(
                  mutations.confirmReceiptLine.error,
                  'Không thể xác nhận nhận hàng.',
                )}
                hasPlan={Boolean(plan)}
                isConfirmReceiptLinePending={mutations.confirmReceiptLine.isPending}
                isStartReceivingPending={mutations.startReceivingSession.isPending}
                startReceivingErrorMessage={toPanelErrorMessage(
                  mutations.startReceivingSession.error,
                  'Không thể bắt đầu phiên tiếp nhận.',
                )}
                onReceiptActualQuantityChange={setReceiptActualQuantity}
                onReceiptIdempotencyKeyChange={setReceiptIdempotencyKey}
                onReceiptManualConfirmChange={setReceiptManualConfirm}
                onReceiptRawScanChange={setReceiptRawScan}
                onReceiptReasonCodeChange={setReceiptReasonCode}
                onReceiptLotNumberChange={setReceiptLotNumber}
                onReceiptExpiryDateChange={setReceiptExpiryDate}
                onReceiptSerialNumberChange={setReceiptSerialNumber}
                onReceivingDeviceCodeChange={setReceivingDeviceCode}
                onReceivingSessionKeyChange={setReceivingSessionKey}
                onSubmitReceiptLine={submitReceiptLine}
                onSubmitStartReceiving={submitStartReceiving}
                receiptActualQuantity={receiptActualQuantity}
                receiptIdempotencyKey={receiptIdempotencyKey}
                receiptLineResult={confirmedReceiptLine}
                receiptManualConfirm={receiptManualConfirm}
                receiptRawScan={receiptRawScan}
                receiptReasonCode={receiptReasonCode}
                receiptLotNumber={receiptLotNumber}
                receiptExpiryDate={receiptExpiryDate}
                receiptSerialNumber={receiptSerialNumber}
                skuFlagsLoading={skuFlagsLoading}
                skuLotControlled={skuLotControlled}
                skuExpiryControlled={skuExpiryControlled}
                skuSerialControlled={skuSerialControlled}
                readinessDone={readinessDone}
                receivingDeviceCode={receivingDeviceCode}
                receivingSession={receivingSession ?? null}
                receivingSessionKey={receivingSessionKey}
                selectedLine={selectedLine}
              />
            )}

            {activeWorkflowStep !== 'gate-in' && receiptLinesForSelectedLine.length > 1 && (
              <InboundReceiptLineRail
                receiptLines={receiptLinesForSelectedLine}
                selectedReceiptLineId={confirmedReceiptLine?.id ?? null}
                onSelect={setSelectedReceiptLineId}
              />
            )}

            {activeWorkflowStep === 'qc' && !blockedActionMessage && (
              <InboundQcPanel
                canEvaluateQcTask={canEvaluateQcTask}
                canRecordQcResult={canRecordQcResult}
                confirmedReceiptLine={confirmedReceiptLine}
                evaluatedQcTask={evaluatedQcTask}
                evaluateQcTaskErrorMessage={toPanelErrorMessage(
                  mutations.evaluateQcTask.error,
                  'Không thể đánh giá QC.',
                )}
                recordQcResultErrorMessage={toPanelErrorMessage(
                  mutations.recordQcResult.error,
                  'Không thể ghi nhận kết quả QC.',
                )}
                isEvaluateQcTaskPending={mutations.evaluateQcTask.isPending}
                isRecordQcResultPending={mutations.recordQcResult.isPending}
                onQcAcceptedQuantityChange={setQcAcceptedQuantity}
                onQcDispositionCodeChange={setQcDispositionCode}
                onQcForceRequiredChange={setQcForceRequired}
                onQcInspectedQuantityChange={setQcInspectedQuantity}
                onQcRejectedQuantityChange={setQcRejectedQuantity}
                onQcResultEvidenceRefsChange={setQcResultEvidenceRefs}
                onQcResultIdempotencyKeyChange={setQcResultIdempotencyKey}
                onQcResultReasonCodeChange={setQcResultReasonCode}
                onQcResultReasonNoteChange={setQcResultReasonNote}
                onQcResultStatusChange={setQcResultStatus}
                onQcTaskEvidenceRefsChange={setQcTaskEvidenceRefs}
                onQcTaskIdempotencyKeyChange={setQcTaskIdempotencyKey}
                onQcTaskReasonCodeChange={setQcTaskReasonCode}
                onQcTaskReasonNoteChange={setQcTaskReasonNote}
                onSubmitEvaluateQcTask={submitEvaluateQcTask}
                onSubmitQcResult={submitQcResult}
                qcAcceptedQuantity={qcAcceptedQuantity}
                qcDispositionCode={qcDispositionCode}
                qcForceRequired={qcForceRequired}
                qcInspectedQuantity={qcInspectedQuantity}
                qcNeedsReasonEvidence={qcNeedsReasonEvidence}
                qcQuantityBalanced={qcQuantityBalanced}
                qcRejectedQuantity={qcRejectedQuantity}
                qcResult={recordedQcResult}
                qcResultEvidenceRefs={qcResultEvidenceRefs}
                qcResultIdempotencyKey={qcResultIdempotencyKey}
                qcResultReasonCode={qcResultReasonCode}
                qcResultReasonNote={qcResultReasonNote}
                qcResultStatus={qcResultStatus}
                qcTaskEvidenceRefs={qcTaskEvidenceRefs}
                qcTaskIdempotencyKey={qcTaskIdempotencyKey}
                qcTaskReasonCode={qcTaskReasonCode}
                qcTaskReasonNote={qcTaskReasonNote}
                receivingSession={receivingSession ?? null}
              />
            )}

            {(activeWorkflowStep === 'lpn' || activeWorkflowStep === 'release') &&
              !blockedActionMessage && (
                <InboundReleasePutawayPanel
                  canConfirmInboundLpn={canConfirmInboundLpn}
                  canReleaseInboundToPutaway={canReleaseInboundToPutaway}
                  confirmedInboundLpn={confirmedInboundLpn}
                  confirmedReceiptLine={confirmedReceiptLine}
                  hasConfirmInboundLpnError={Boolean(mutations.confirmInboundLpn.error)}
                  isConfirmInboundLpnPending={mutations.confirmInboundLpn.isPending}
                  isCreatingPutawayTask={
                    putawayMutations.releaseTask.isPending &&
                    putawayMutations.releaseTask.variables?.inboundPutawayReleaseId ===
                      putawayRelease?.id
                  }
                  isReleaseInboundToPutawayPending={mutations.releaseInboundToPutaway.isPending}
                  lpnCode={lpnCode}
                  lpnIdempotencyKey={lpnIdempotencyKey}
                  onLpnCodeChange={setLpnCode}
                  onLpnIdempotencyKeyChange={setLpnIdempotencyKey}
                  onReleaseAttemptLabelOverrideChange={setReleaseAttemptLabelOverride}
                  onReleaseCurrentLocationCodeChange={setReleaseCurrentLocationCode}
                  onReleaseEvidenceRefsChange={setReleaseEvidenceRefs}
                  onReleaseIdempotencyKeyChange={setReleaseIdempotencyKey}
                  onReleaseReasonCodeChange={setReleaseReasonCode}
                  onReleaseRequireLpnChange={setReleaseRequireLpn}
                  onSsccCodeChange={setSsccCode}
                  onSubmitInboundLpn={submitInboundLpn}
                  onSubmitReleaseInboundToPutaway={submitReleaseInboundToPutaway}
                  onReceiveMoreUnitsClick={navigateToReceivingAndFocusSelectedLine}
                  showReceiveMoreUnitsAction={releaseDone && !focusedLineFullyReceived}
                  onReleaseRemainingUnitsClick={navigateToReleaseAndFocusSelectedLine}
                  showReleaseRemainingUnitsAction={
                    releaseDone &&
                    focusedLineFullyReceived &&
                    !focusedLineFullyReleased &&
                    Boolean(nextReleasableUnitForRelease)
                  }
                  putawayReady={putawayReady}
                  putawayRelease={putawayRelease}
                  putawayTaskCode={putawayTaskForRelease?.taskCode ?? null}
                  putawayTaskErrorMessage={toPanelErrorMessage(
                    putawayTaskErrorForRelease,
                    'Không thể tạo tác vụ cất hàng.',
                  )}
                  receivingSession={receivingSession ?? null}
                  releaseAttemptLabelOverride={releaseAttemptLabelOverride}
                  releaseCurrentLocationCode={releaseCurrentLocationCode}
                  releaseErrorMessage={toPanelErrorMessage(
                    mutations.releaseInboundToPutaway.error,
                    'Không thể phát hành sang cất hàng.',
                  )}
                  releaseEvidenceRefs={releaseEvidenceRefs}
                  releaseIdempotencyKey={releaseIdempotencyKey}
                  releaseReasonCode={releaseReasonCode}
                  releaseRequireLpn={releaseRequireLpn}
                  ssccCode={ssccCode}
                />
              )}
              </>
            )}
          </InboundLineConsole>
          </div>
        </div>
      )}

      {plan && (
        <div className="space-y-4">
          <InboundRecentActivity items={recentActivityItems} />
          <InboundTechnicalDetails
            confirmedInboundLpn={confirmedInboundLpn}
            putawayRelease={putawayRelease}
            readiness={readiness}
            receiptLine={confirmedReceiptLine}
            receivingSession={receivingSession ?? null}
          />
        </div>
      )}

      {plan && (
        <InboundDiscrepancySheet
          canCaptureDiscrepancy={canCaptureDiscrepancy}
          confirmedReceiptLine={confirmedReceiptLine}
          discrepancyEvidenceRefs={discrepancyEvidenceRefs}
          discrepancyIdempotencyKey={discrepancyIdempotencyKey}
          discrepancyReasonCode={discrepancyReasonCode}
          discrepancyReasonNote={discrepancyReasonNote}
          discrepancyResult={capturedDiscrepancy}
          discrepancyType={discrepancyType}
          hasCaptureDiscrepancyError={captureDiscrepancyErrorMatchesSelectedLine}
          isCaptureDiscrepancyPending={mutations.captureDiscrepancy.isPending}
          onClose={closeDiscrepancyOverlay}
          onDiscrepancyEvidenceRefsChange={setDiscrepancyEvidenceRefs}
          onDiscrepancyIdempotencyKeyChange={setDiscrepancyIdempotencyKey}
          onDiscrepancyReasonCodeChange={setDiscrepancyReasonCode}
          onDiscrepancyReasonNoteChange={setDiscrepancyReasonNote}
          onDiscrepancyTypeChange={setDiscrepancyType}
          onSubmit={submitDiscrepancy}
          open={isDiscrepancyRoute && !discrepancyRouteBlockedMessage && !isCancelledTerminal}
          selectedLine={selectedLine}
        />
      )}
    </div>
  );
}
