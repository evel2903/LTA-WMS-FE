import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import {
  useInboundOperationalState,
  useInboundPlan,
  useReceivingReadiness,
} from '@modules/Inbound/Application/Queries/UseInboundPlans';
import {
  InboundCompletedStepSummary,
  type InboundCompletedStepSummaryViewModel,
} from '@modules/Inbound/Presentation/Components/InboundCompletedStepSummary';
import { InboundDiscrepancySheet } from '@modules/Inbound/Presentation/Components/InboundDiscrepancySheet';
import { InboundGateInPanel } from '@modules/Inbound/Presentation/Components/InboundGateInPanel';
import { InboundLineConsole } from '@modules/Inbound/Presentation/Components/InboundLineConsole';
import { InboundLineRail } from '@modules/Inbound/Presentation/Components/InboundLineRail';
import { deriveFocusedLineStage } from '@modules/Inbound/Presentation/Components/InboundLineStage';
import { InboundQcPanel } from '@modules/Inbound/Presentation/Components/InboundQcPanel';
import { InboundReadinessPanel } from '@modules/Inbound/Presentation/Components/InboundReadinessPanel';
import { InboundReceivingPanel } from '@modules/Inbound/Presentation/Components/InboundReceivingPanel';
import { InboundReleasePutawayPanel } from '@modules/Inbound/Presentation/Components/InboundReleasePutawayPanel';
import { InboundWorkflowStepper } from '@modules/Inbound/Presentation/Components/InboundWorkflowStepper';
import {
  mapInboundActionToWorkflowStep,
  type InboundWorkflowStep,
  type InboundWorkflowStepKey,
  type InboundWorkflowStepState,
} from '@modules/Inbound/Presentation/Components/InboundWorkflowStepperModel';
import type {
  InboundDiscrepancyType,
  InboundLpn,
  InboundPlan,
  InboundPutawayRelease,
  QcDispositionCode,
  QcResultStatus,
  ReceiptLine,
  ReceivingReadiness,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';

interface DraftLine {
  id: number;
  skuId: string;
  uomId: string;
  expectedQuantity: string;
  externalLineReference: string;
}

let nextDraftLineId = 0;

const initialLine = (): DraftLine => ({
  id: (nextDraftLineId += 1),
  skuId: '',
  uomId: '',
  expectedQuantity: '1',
  externalLineReference: '',
});

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

const INBOUND_ALLOWED_ACTIONS = new Set([
  'receiving',
  'gate-in',
  'qc',
  'lpn',
  'release',
  'discrepancy',
]);

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

function DetailMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border bg-background px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function InboundOperatorHeader({ plan }: { plan: InboundPlan }) {
  const [expanded, setExpanded] = useState(false);

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
  plan,
  putawayRelease,
  readiness,
  receiptLine,
  receivingSession,
}: {
  confirmedInboundLpn: InboundLpn | null;
  plan: InboundPlan;
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
        <DetailMetric label="Plan ID" value={plan.id} />
        <DetailMetric label="CoreFlow" value={plan.coreFlowInstanceId ?? 'Chưa liên kết'} />
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

export function InboundDetailPage() {
  const {
    id: routePlanId,
    action: routeActionParam,
    lineId: routeDiscrepancyLineId,
  } = useParams<{ id: string; action?: string; lineId?: string }>();
  const routeAction = routeDiscrepancyLineId ? 'discrepancy' : routeActionParam;
  const navigate = useNavigate();
  const isCreateRoute = !routePlanId;
  const [selectedId, setSelectedId] = useState<string | null>(routePlanId ?? null);
  const actionPanelRef = useRef<HTMLElement | null>(null);
  const [completedSummaryStepKey, setCompletedSummaryStepKey] =
    useState<InboundWorkflowStepKey | null>(null);
  const [sourceSystem, setSourceSystem] = useState('');
  const [sourceDocumentType, setSourceDocumentType] = useState('ASN');
  const [sourceDocumentNumber, setSourceDocumentNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouseProfileId, setWarehouseProfileId] = useState('');
  const [expectedArrivalAt, setExpectedArrivalAt] = useState('');
  const [lineDrafts, setLineDrafts] = useState<DraftLine[]>(() => [initialLine()]);
  const [gateReference, setGateReference] = useState('');
  const [readinessReasonCode, setReadinessReasonCode] = useState('');
  const [readinessOverridePlanId, setReadinessOverridePlanId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [pendingLineFocusId, setPendingLineFocusId] = useState<string | null>(null);
  const [receivingSessionKey, setReceivingSessionKey] = useState('dock-1');
  const [receivingDeviceCode, setReceivingDeviceCode] = useState('rf-web');
  const [receiptActualQuantity, setReceiptActualQuantity] = useState('1');
  const [receiptRawScan, setReceiptRawScan] = useState('');
  const [receiptManualConfirm, setReceiptManualConfirm] = useState(false);
  const [receiptReasonCode, setReceiptReasonCode] = useState('');
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

  const detailQuery = useInboundPlan(routePlanId ?? null);
  const operationalStateQuery = useInboundOperationalState(routePlanId ?? null);
  const mutations = useInboundMutations();
  const resetValidateReadiness = mutations.validateReadiness.reset;
  const resetStartReceiving = mutations.startReceivingSession.reset;
  const resetConfirmReceiptLine = mutations.confirmReceiptLine.reset;
  const resetConfirmInboundLpn = mutations.confirmInboundLpn.reset;
  const resetReleaseInboundToPutaway = mutations.releaseInboundToPutaway.reset;
  const resetCaptureDiscrepancy = mutations.captureDiscrepancy.reset;
  const resetEvaluateQcTask = mutations.evaluateQcTask.reset;
  const resetRecordQcResult = mutations.recordQcResult.reset;

  const selected = useMemo(
    () =>
      (mutations.recordGateIn.data?.id === selectedId ? mutations.recordGateIn.data : null) ??
      (mutations.createInboundPlan.data?.id === selectedId
        ? mutations.createInboundPlan.data
        : null) ??
      (detailQuery.data?.id === selectedId ? detailQuery.data : null) ??
      null,
    [detailQuery.data, mutations.createInboundPlan.data, mutations.recordGateIn.data, selectedId],
  );
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
    (mutations.startReceivingSession.data?.inboundPlanId === selected?.id
      ? mutations.startReceivingSession.data
      : null) ??
    latestBy(
      operationalState?.receivingSessions.filter((session) => session.inboundPlanId === selected?.id),
      (session) => session.startedAt,
    );
  const selectedLine = useMemo(
    () => selected?.lines.find((line) => line.id === selectedLineId) ?? selected?.lines[0] ?? null,
    [selected?.lines, selectedLineId],
  );
  const lastConfirmedLine = mutations.confirmReceiptLine.data;
  const mutationConfirmedReceiptLine =
    lastConfirmedLine &&
    lastConfirmedLine.inboundPlanId === selected?.id &&
    lastConfirmedLine.inboundPlanLineId === selectedLine?.id
      ? lastConfirmedLine
      : null;
  const confirmedReceiptLine =
    mutationConfirmedReceiptLine ??
    latestBy(
      operationalState?.receiptLines.filter(
        (line) => line.inboundPlanId === selected?.id && line.inboundPlanLineId === selectedLine?.id,
      ),
      (line) => line.receivedAt,
    );
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
    mutations.captureDiscrepancy.data &&
    mutations.captureDiscrepancy.data.receiptLineId === confirmedReceiptLine?.id
      ? mutations.captureDiscrepancy.data
      : null;
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
  const selectedInitialLineId = selected?.lines[0]?.id ?? null;
  const selectedInitialExpectedQuantity = selected?.lines[0]?.expectedQuantity ?? 1;
  const readinessQuery = useReceivingReadiness(selected?.id ?? null);
  const readiness =
    readinessOverridePlanId === selected?.id
      ? (mutations.validateReadiness.data ?? readinessQuery.data ?? null)
      : (readinessQuery.data ?? null);
  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const denied = Boolean(apiError?.isForbidden);
  const detailError =
    detailQuery.error instanceof Error
      ? detailQuery.error.message
      : 'Không thể tải kế hoạch nhập kho.';
  const isCancelledTerminal = selected?.status === 'Cancelled';
  const gateInDone = Boolean(
    selected?.gateInAt || selected?.gateInStatus === 'Recorded' || readiness?.gateInRecorded,
  );
  const readinessDone = Boolean(readiness?.allowed || readiness?.overrideAccepted);
  // Single source of truth for "readiness resolved ApprovalRequired and hasn't been
  // overridden yet" — reused by the stepper state, the step description, and the
  // console header title so the three can't silently diverge (IFB-05).
  const readinessApprovalRequired = !readinessDone && readiness?.decision === 'ApprovalRequired';
  const readinessBusy = readinessQuery.isLoading || readinessQuery.isFetching;
  const canCreate = Boolean(
    sourceSystem.trim() &&
    sourceDocumentNumber.trim() &&
    supplierId.trim() &&
    ownerId.trim() &&
    warehouseId.trim() &&
    lineDrafts.every(
      (line) => line.skuId.trim() && line.uomId.trim() && Number(line.expectedQuantity) > 0,
    ),
  );
  const canGateIn = Boolean(
    selected &&
      !isCancelledTerminal &&
      !gateInDone &&
      !mutations.recordGateIn.isPending &&
      gateReference.trim(),
  );
  const canOverride = Boolean(
    selected &&
      !isCancelledTerminal &&
      !readinessDone &&
      !readinessBusy &&
      !mutations.validateReadiness.isPending &&
      readinessReasonCode.trim(),
  );
  const canStartReceiving = Boolean(
    selected && !isCancelledTerminal && readinessDone && !readinessBusy && receivingSessionKey.trim(),
  );
  const canConfirmReceiptLine = Boolean(
    !isCancelledTerminal &&
    receivingSession &&
    selectedLine &&
    Number(receiptActualQuantity) > 0 &&
    receiptIdempotencyKey.trim() &&
    (receiptManualConfirm ? receiptReasonCode.trim() : receiptRawScan.trim()),
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
            : selected
              ? 'gate-in'
              : 'gate-in';
  const activeWorkflowStep = routeWorkflowStep ?? inferredWorkflowStep;
  const terminalActionMessage = isCancelledTerminal
    ? 'Chứng từ đã hủy. Không thể tiếp tục thao tác nhập kho.'
    : null;
  const blockedActionMessage =
    discrepancyRouteBlockedMessage ??
    (activeWorkflowStep === 'qc'
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
              : !putawayReady
                ? 'Cần trạng thái READY_FOR_PUTAWAY trước khi release.'
                : releaseRequireLpn && !confirmedInboundLpn
                ? 'Cần xác nhận LPN/SSCC trước khi release vì cấu hình đang yêu cầu LPN.'
                : null
          : null);
  const workflowSteps: InboundWorkflowStep[] = [
    {
      key: 'gate-in',
      label: 'Vào cổng',
      description: gateInDone ? 'Đã ghi nhận vào cổng.' : 'Cần ghi nhận xe/hàng vào cổng.',
      state: resolveWorkflowStepState('gate-in', activeWorkflowStep, gateInDone, !selected),
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
            ? 'Readiness cần phê duyệt — nhập mã lý do để ghi đè.'
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
      description: releaseDone ? 'Đã phát hành sang cất hàng.' : 'Release sang công việc cất hàng.',
      state: resolveWorkflowStepState(
        'release',
        activeWorkflowStep,
        releaseDone,
        !confirmedInboundLpn,
      ),
    },
  ];
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
  });
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
                  { label: 'Trạng thái cổng', value: vietnameseOperationalLabel(selected?.gateInStatus ?? 'Recorded') },
                  { label: 'Thời điểm vào cổng', value: formatDateTime(selected?.gateInAt) },
                  { label: 'Tham chiếu cổng', value: selected?.gateReference ?? 'Chưa có' },
                  { label: 'Xe', value: selected?.vehicleNumber ?? 'Chưa có' },
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
    if (routePlanId && selectedId !== routePlanId) {
      setSelectedId(routePlanId);
    }
  }, [routePlanId, selectedId]);

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
      selected?.lines.some((line) => line.id === routeDiscrepancyLineId) &&
      selectedLineId !== routeDiscrepancyLineId
    ) {
      setSelectedLineId(routeDiscrepancyLineId);
    }
  }, [routeDiscrepancyLineId, selected?.lines, selectedLineId]);

  useEffect(() => {
    setCompletedSummaryStepKey(null);
  }, [selected?.id, selectedLine?.id]);

  useEffect(() => {
    setGateReference('');
    setReadinessReasonCode('');
    setReadinessOverridePlanId(null);
    setSelectedLineId(selectedInitialLineId);
    setReceiptActualQuantity(String(selectedInitialExpectedQuantity));
    setReceiptRawScan('');
    setReceiptManualConfirm(false);
    setReceiptReasonCode('');
    setReceiptIdempotencyKey(`receipt-${selected?.id ?? 'none'}-${Date.now()}`);
    setDiscrepancyType('QuantityVariance');
    setDiscrepancyReasonCode('');
    setDiscrepancyReasonNote('');
    setDiscrepancyEvidenceRefs('');
    setDiscrepancyIdempotencyKey(`discrepancy-${selected?.id ?? 'none'}-${Date.now()}`);
    setQcForceRequired(false);
    setQcTaskReasonCode('');
    setQcTaskReasonNote('');
    setQcTaskEvidenceRefs('');
    setQcTaskIdempotencyKey(`qc-task-${selected?.id ?? 'none'}-${Date.now()}`);
    setQcResultStatus('Passed');
    setQcDispositionCode('Release');
    setQcInspectedQuantity(String(selectedInitialExpectedQuantity));
    setQcAcceptedQuantity(String(selectedInitialExpectedQuantity));
    setQcRejectedQuantity('0');
    setQcResultReasonCode('');
    setQcResultReasonNote('');
    setQcResultEvidenceRefs('');
    setQcResultIdempotencyKey(`qc-result-${selected?.id ?? 'none'}-${Date.now()}`);
    setLpnCode('');
    setSsccCode('');
    setLpnIdempotencyKey(`lpn-${selected?.id ?? 'none'}-${Date.now()}`);
    setReleaseCurrentLocationCode('RECEIVING');
    setReleaseRequireLpn(true);
    setReleaseAttemptLabelOverride(false);
    setReleaseReasonCode('');
    setReleaseEvidenceRefs('');
    setReleaseIdempotencyKey(`release-${selected?.id ?? 'none'}-${Date.now()}`);
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
    selected?.id,
    selectedInitialExpectedQuantity,
    selectedInitialLineId,
  ]);

  function updateLine(id: number, patch: Partial<DraftLine>) {
    setLineDrafts((lines) => lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;
    mutations.createInboundPlan.mutate(
      {
        sourceSystem: sourceSystem.trim(),
        sourceDocumentType: sourceDocumentType.trim() || 'ASN',
        sourceDocumentNumber: sourceDocumentNumber.trim(),
        supplierId: supplierId.trim(),
        ownerId: ownerId.trim(),
        warehouseId: warehouseId.trim(),
        warehouseProfileId: warehouseProfileId.trim() || null,
        expectedArrivalAt: expectedArrivalAt ? new Date(expectedArrivalAt).toISOString() : null,
        lines: lineDrafts.map((line, index) => ({
          lineNumber: index + 1,
          skuId: line.skuId.trim(),
          uomId: line.uomId.trim(),
          expectedQuantity: Number(line.expectedQuantity),
          externalLineReference: line.externalLineReference.trim() || null,
        })),
      },
      {
        onSuccess: (plan) => {
          setSelectedId(plan.id);
          void navigate(ROUTES.INBOUND.DETAIL(plan.id));
          setSourceDocumentNumber('');
          setExpectedArrivalAt('');
          setLineDrafts([initialLine()]);
        },
      },
    );
  }

  function submitGateIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canGateIn || mutations.recordGateIn.isPending) return;
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
          setSelectedId(plan.id);
          setGateReference('');
          setReadinessOverridePlanId(null);
          mutations.validateReadiness.reset();
        },
      },
    );
  }

  function submitOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canOverride || mutations.validateReadiness.isPending) return;
    mutations.validateReadiness.mutate(
      {
        id: selected.id,
        input: { attemptOverride: true, reasonCode: readinessReasonCode.trim() },
      },
      { onSuccess: () => setReadinessOverridePlanId(selected.id) },
    );
  }

  function submitStartReceiving(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canStartReceiving) return;
    mutations.startReceivingSession.mutate({
      id: selected.id,
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
    if (!selected || !selectedLine || isCancelledTerminal) return;
    const signalType = confirmedReceiptLine?.discrepancySignals[0];
    // Pre-seed from the line's first signal when present; otherwise reset to the
    // documented default so a no-signal line never inherits the previous line's
    // stale type.
    setDiscrepancyType(signalType ?? 'QuantityVariance');
    setDiscrepancyIdempotencyKey(
      `discrepancy-${confirmedReceiptLine?.id ?? selectedLine.id}-${Date.now()}`,
    );
    void navigate(ROUTES.INBOUND.DISCREPANCY(selected.id, selectedLine.id));
  }

  function navigateToReceivingAndFocusSelectedLine() {
    if (!selected) return;
    const selectedLineFocusId = selectedLine?.id;
    setPendingLineFocusId(selectedLineFocusId ?? null);
    void navigate(ROUTES.INBOUND.ACTION(selected.id, 'receiving'));
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
    // `active`/`skipped` → focus the console on that step's panel. The line rail +
    // console is the navigator now; `waiting`/`blocked` ribbon clicks are INERT so
    // they can never raise the prominent blocked card over an active panel.
    if (step.state === 'active' || step.state === 'skipped') {
      setCompletedSummaryStepKey(null);
      if (selected) {
        void navigate(ROUTES.INBOUND.ACTION(selected.id, step.key));
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
            ? 'Tiếp nhận cần phê duyệt readiness'
            : 'Tiếp nhận đang bị chặn'
        : activeWorkflowStep === 'qc'
          ? 'QC'
          : activeWorkflowStep === 'lpn'
            ? 'LPN/SSCC'
            : 'Release';

  const recentActivityItems = useMemo(() => {
    const items: string[] = [];
    if (gateInDone) {
      items.push(`Vào cổng: ${formatDateTime(selected?.gateInAt)}`);
    }
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
    gateInDone,
    putawayRelease,
    receivingSession,
    recordedQcResult,
    selected?.gateInAt,
  ]);

  if (routeAction && routePlanId && !INBOUND_ALLOWED_ACTIONS.has(routeAction)) {
    return <Navigate to={ROUTES.INBOUND.DETAIL(routePlanId)} replace />;
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
  // gate-in) would be a disabled, meaningless control. It then remains available
  // across receiving/qc/lpn/release as a valid line action.
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
    // Wide-screen cap: the rendered inbound-detail content is centered and capped at
    // 1536px (screen-2xl) so on large monitors (~1600px+ content area) it stops
    // stretching edge-to-edge and gains intentional side margins. Vertical rhythm
    // (space-y-4) is preserved; mobile/standard-desktop are unaffected (below the cap
    // the container is just `w-full`). Applied here at the page's outermost render
    // wrapper, NOT in DashboardLayout.
    <div className="mx-auto w-full max-w-[1536px] space-y-4">
      {selected && (
        <>
          <InboundOperatorHeader plan={selected} />
          <InboundWorkflowProgressBand
            caption={focusedLineRibbonCaption}
            completedSummaryStepKey={completedSummaryStepKey}
            lineCue={focusedLineStepCue}
            steps={workflowSteps}
            onStepSelect={selectWorkflowStep}
          />
        </>
      )}

      {isCreateRoute && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tạo chứng từ nguồn</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitCreate}>
                  <label className="grid gap-1 text-sm">
                    Hệ thống nguồn
                    <Input
                      value={sourceSystem}
                      onChange={(event) => setSourceSystem(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Loại chứng từ nguồn
                    <Input
                      value={sourceDocumentType}
                      onChange={(event) => setSourceDocumentType(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Số chứng từ nguồn
                    <Input
                      value={sourceDocumentNumber}
                      onChange={(event) => setSourceDocumentNumber(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID nhà cung cấp
                    <Input
                      value={supplierId}
                      onChange={(event) => setSupplierId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID chủ hàng
                    <Input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID kho
                    <Input
                      value={warehouseId}
                      onChange={(event) => setWarehouseId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    ID hồ sơ kho
                    <Input
                      value={warehouseProfileId}
                      onChange={(event) => setWarehouseProfileId(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Thời gian đến dự kiến
                    <Input
                      type="datetime-local"
                      value={expectedArrivalAt}
                      onChange={(event) => setExpectedArrivalAt(event.target.value)}
                    />
                  </label>
                  <div className="space-y-3">
                    {lineDrafts.map((line, index) => (
                      <div key={line.id} className="grid gap-3 border-t pt-3 sm:grid-cols-4">
                        <label className="grid gap-1 text-sm">
                          ID SKU
                          <Input
                            value={line.skuId}
                            onChange={(event) => updateLine(line.id, { skuId: event.target.value })}
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          ID đơn vị tính
                          <Input
                            value={line.uomId}
                            onChange={(event) => updateLine(line.id, { uomId: event.target.value })}
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          Số lượng dự kiến
                          <Input
                            type="number"
                            min="0.0001"
                            step="any"
                            value={line.expectedQuantity}
                            onChange={(event) =>
                              updateLine(line.id, { expectedQuantity: event.target.value })
                            }
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          Tham chiếu dòng ngoài
                          <Input
                            value={line.externalLineReference}
                            onChange={(event) =>
                              updateLine(line.id, { externalLineReference: event.target.value })
                            }
                          />
                        </label>
                        {lineDrafts.length > 1 && (
                          <button
                            type="button"
                            className="min-h-10 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted sm:col-span-4"
                            onClick={() =>
                              setLineDrafts((lines) =>
                                lines.filter((draft) => draft.id !== line.id),
                              )
                            }
                          >
                            Xóa dòng {index + 1}
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="min-h-10 w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                      onClick={() => setLineDrafts((lines) => [...lines, initialLine()])}
                    >
                      Thêm dòng
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="min-h-10 w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canCreate || mutations.createInboundPlan.isPending}
                  >
                    Tạo kế hoạch nhập kho
                  </button>
                  {mutations.createInboundPlan.isPending && (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <RefreshCw className="size-4 animate-spin" />
                      Đang tạo chứng từ nguồn
                    </p>
                  )}
                  {mutations.createInboundPlan.data?.isDuplicate && (
                    <p className="text-muted-foreground text-sm">
                      Đã dùng lại kế hoạch nhập kho hiện có.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          )}

      {selected && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Mobile (below xl): rail is rendered SECOND (collapsible `Dòng khác`
              below the pinned console) via order-2; desktop keeps it as the
              always-visible LEFT column via xl:order-1. The console mirrors this
              with order-1 / xl:order-2 so the desktop `[rail | console]` grid is
              preserved while mobile pins the action form to the top. */}
          <div className="order-2 min-w-0 xl:order-1" data-testid="inbound-line-rail-slot">
            <InboundLineRail
              focusedLineStage={focusedLineStage}
              lines={selected.lines}
              selectedLineId={selectedLine?.id ?? null}
              onSelect={(line) => {
                setSelectedLineId(line.id);
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
              <InboundGateInPanel
                gateReference={gateReference}
                hasPlan={Boolean(selected)}
                isGateInDone={gateInDone}
                isPending={mutations.recordGateIn.isPending}
                onGateReferenceChange={setGateReference}
                onSubmit={submitGateIn}
              />
            )}

            {activeWorkflowStep === 'receiving' && !readinessDone && !discrepancyRouteBlockedMessage && (
              <InboundReadinessPanel
                gateInDone={gateInDone}
                hasPlan={Boolean(selected)}
                isPending={mutations.validateReadiness.isPending}
                isReadinessLoading={readinessBusy}
                onReasonCodeChange={setReadinessReasonCode}
                onSubmit={submitOverride}
                readiness={readiness}
                reasonCode={readinessReasonCode}
              />
            )}

            {activeWorkflowStep === 'receiving' && readinessDone && !discrepancyRouteBlockedMessage && (
              <InboundReceivingPanel
                canConfirmReceiptLine={canConfirmReceiptLine}
                canStartReceiving={canStartReceiving}
                hasPlan={Boolean(selected)}
                isConfirmReceiptLinePending={mutations.confirmReceiptLine.isPending}
                isStartReceivingPending={mutations.startReceivingSession.isPending}
                onReceiptActualQuantityChange={setReceiptActualQuantity}
                onReceiptIdempotencyKeyChange={setReceiptIdempotencyKey}
                onReceiptManualConfirmChange={setReceiptManualConfirm}
                onReceiptRawScanChange={setReceiptRawScan}
                onReceiptReasonCodeChange={setReceiptReasonCode}
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
                readinessDone={readinessDone}
                receivingDeviceCode={receivingDeviceCode}
                receivingSession={receivingSession ?? null}
                receivingSessionKey={receivingSessionKey}
                selectedLine={selectedLine}
              />
            )}

            {activeWorkflowStep === 'qc' && !blockedActionMessage && (
              <InboundQcPanel
                canEvaluateQcTask={canEvaluateQcTask}
                canRecordQcResult={canRecordQcResult}
                confirmedReceiptLine={confirmedReceiptLine}
                evaluatedQcTask={evaluatedQcTask}
                hasEvaluateQcTaskError={Boolean(mutations.evaluateQcTask.error)}
                hasRecordQcResultError={Boolean(mutations.recordQcResult.error)}
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
                  putawayReady={putawayReady}
                  putawayRelease={putawayRelease}
                  receivingSession={receivingSession ?? null}
                  releaseAttemptLabelOverride={releaseAttemptLabelOverride}
                  releaseCurrentLocationCode={releaseCurrentLocationCode}
                  releaseErrorMessage={
                    mutations.releaseInboundToPutaway.error instanceof ApiError
                      ? mutations.releaseInboundToPutaway.error.message
                      : mutations.releaseInboundToPutaway.error
                        ? 'Không thể phát hành sang cất hàng.'
                        : null
                  }
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
          <InboundTechnicalDetails
            confirmedInboundLpn={confirmedInboundLpn}
            plan={selected}
            putawayRelease={putawayRelease}
            readiness={readiness}
            receiptLine={confirmedReceiptLine}
            receivingSession={receivingSession ?? null}
          />
        </div>
      )}

      {selected && (
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
