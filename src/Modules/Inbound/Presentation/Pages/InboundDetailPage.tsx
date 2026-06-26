import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { cn } from '@shared/Utils/Cn';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import {
  useInboundPlan,
  useReceivingReadiness,
} from '@modules/Inbound/Application/Queries/UseInboundPlans';
import { InboundGateInPanel } from '@modules/Inbound/Presentation/Components/InboundGateInPanel';
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
  InboundPlanLine,
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

const INBOUND_ALLOWED_ACTIONS = new Set(['receiving', 'gate-in', 'qc', 'lpn', 'release']);

function resolveWorkflowStepState(
  stepKey: InboundWorkflowStepKey,
  activeStep: InboundWorkflowStepKey,
  done: boolean,
  blocked = false,
): InboundWorkflowStepState {
  if (done) return 'done';
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
  return (
    <Card data-testid="inbound-operator-header">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg">Nhập kho {plan.businessReference}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              ASN {plan.sourceDocumentNumber || plan.businessReference}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={plan.status} />
            <StatusBadge value={plan.gateInStatus} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 md:grid-cols-4">
          <DetailMetric label="ASN" value={plan.sourceDocumentNumber || plan.businessReference} />
          <DetailMetric label="Nhà cung cấp" value={plan.supplierCode ?? 'Chưa có mã'} />
          <DetailMetric label="Kho" value={plan.warehouseCode ?? 'Chưa có mã'} />
          <DetailMetric label="Trạng thái" value={vietnameseOperationalLabel(plan.status)} />
        </dl>
      </CardContent>
    </Card>
  );
}

function InboundLineQueue({
  lines,
  onSelect,
  selectedLineId,
}: {
  lines: InboundPlanLine[];
  onSelect: (line: InboundPlanLine) => void;
  selectedLineId: string | null;
}) {
  return (
    <Card data-testid="inbound-line-queue">
      <CardHeader>
        <CardTitle className="text-base">Danh sách dòng còn lại</CardTitle>
        <p className="text-sm text-muted-foreground">
          Chọn dòng để hệ thống tự điền số lượng dự kiến vào phần tiếp nhận.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.map((line) => {
          const isSelected = line.id === selectedLineId;
          return (
            <button
              key={line.id}
              type="button"
              className={cn(
                'min-h-11 w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted',
                isSelected && 'border-primary bg-primary/5',
              )}
              onClick={() => onSelect(line)}
              aria-pressed={isSelected}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium">
                  Dòng {line.lineNumber} - {line.skuCode ?? line.skuId}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatQuantity(line.expectedQuantity)} {line.uomCode ?? ''}
                </span>
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                Tham chiếu: {line.externalLineReference ?? 'không có'}
              </span>
            </button>
          );
        })}
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
        <DetailMetric label="Readiness" value={readiness?.decision ?? 'Chưa kiểm tra'} />
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

function NextActionShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section data-testid="inbound-next-action-panel" className="min-w-0 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Hệ thống chỉ hiển thị hành động cần xử lý ngay ở bước hiện tại.
        </p>
      </div>
      {children}
    </section>
  );
}

function InboundBlockedActionHelper({ message }: { message: string }) {
  return (
    <Card data-testid="inbound-action-blocked">
      <CardHeader>
        <CardTitle className="text-base">Thao tác chưa sẵn sàng</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export function InboundDetailPage() {
  const { id: routePlanId, action: routeAction } = useParams<{ id: string; action: string }>();
  const navigate = useNavigate();
  const isCreateRoute = !routePlanId;
  const [selectedId, setSelectedId] = useState<string | null>(routePlanId ?? null);
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
  const receivingSession =
    mutations.startReceivingSession.data?.inboundPlanId === selected?.id
      ? mutations.startReceivingSession.data
      : null;
  const selectedLine = useMemo(
    () => selected?.lines.find((line) => line.id === selectedLineId) ?? selected?.lines[0] ?? null,
    [selected?.lines, selectedLineId],
  );
  const lastConfirmedLine = mutations.confirmReceiptLine.data;
  const confirmedReceiptLine =
    lastConfirmedLine &&
    lastConfirmedLine.inboundPlanId === selected?.id &&
    lastConfirmedLine.inboundPlanLineId === selectedLine?.id
      ? lastConfirmedLine
      : null;
  const evaluatedQcTask =
    mutations.evaluateQcTask.data &&
    confirmedReceiptLine?.id === mutations.evaluateQcTask.data.receiptLineId
      ? mutations.evaluateQcTask.data
      : null;
  const recordedQcResult =
    mutations.recordQcResult.data && evaluatedQcTask?.id === mutations.recordQcResult.data.qcTaskId
      ? mutations.recordQcResult.data
      : null;
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
    mutations.confirmInboundLpn.data &&
    mutations.confirmInboundLpn.data.receiptLineId === confirmedReceiptLine?.id
      ? mutations.confirmInboundLpn.data
      : null;
  const putawayRelease =
    mutations.releaseInboundToPutaway.data &&
    mutations.releaseInboundToPutaway.data.receiptLineId === confirmedReceiptLine?.id
      ? mutations.releaseInboundToPutaway.data
      : null;
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
  const gateInDone = Boolean(
    selected?.gateInAt || selected?.gateInStatus === 'Recorded' || readiness?.gateInRecorded,
  );
  const readinessDone = Boolean(readiness?.allowed || readiness?.overrideAccepted);
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
    selected && !gateInDone && !mutations.recordGateIn.isPending && gateReference.trim(),
  );
  const canOverride = Boolean(
    selected &&
    !readinessDone &&
    !readinessBusy &&
    !mutations.validateReadiness.isPending &&
    readinessReasonCode.trim(),
  );
  const canStartReceiving = Boolean(
    selected && readinessDone && !readinessBusy && receivingSessionKey.trim(),
  );
  const canConfirmReceiptLine = Boolean(
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
    receivingSession &&
    confirmedReceiptLine &&
    discrepancyReasonCode.trim() &&
    discrepancyEvidenceRefList.length > 0 &&
    discrepancyIdempotencyKey.trim(),
  );
  const canEvaluateQcTask = Boolean(
    receivingSession && confirmedReceiptLine && qcTaskIdempotencyKey.trim(),
  );
  const qcInspectedQty = Number(qcInspectedQuantity);
  const qcAcceptedQty = Number(qcAcceptedQuantity);
  const qcRejectedQty = Number(qcRejectedQuantity);
  const qcQuantityBalanced = Math.abs(qcAcceptedQty + qcRejectedQty - qcInspectedQty) < 0.000001;
  const qcNeedsReasonEvidence =
    qcResultStatus !== 'Passed' || qcDispositionCode !== 'Release' || qcRejectedQty > 0;
  const canRecordQcResult = Boolean(
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
    receivingSession && confirmedReceiptLine && lpnCode.trim() && lpnIdempotencyKey.trim(),
  );
  const canReleaseInboundToPutaway = Boolean(
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
  const qcDone = Boolean(recordedQcResult || (evaluatedQcTask && !evaluatedQcTask.required));
  const lpnDone = Boolean(confirmedInboundLpn);
  const releaseDone = Boolean(putawayRelease);
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
  const blockedActionMessage =
    activeWorkflowStep === 'qc'
      ? !receivingSession
        ? 'Cần bắt đầu phiên tiếp nhận trước khi QC.'
        : !confirmedReceiptLine
          ? 'Cần xác nhận dòng tiếp nhận trước khi QC.'
          : needsDiscrepancyRouting
            ? 'Dòng tiếp nhận đang có sai lệch, cần chuyển xử lý sai lệch trước khi QC.'
            : null
      : activeWorkflowStep === 'lpn'
        ? !receivingSession
          ? 'Cần bắt đầu phiên tiếp nhận trước khi xác nhận LPN/Pallet.'
          : !confirmedReceiptLine
            ? 'Cần xác nhận dòng tiếp nhận trước khi xác nhận LPN/Pallet.'
            : !putawayReady
              ? 'Cần QC đưa dòng về READY_FOR_PUTAWAY trước khi xác nhận LPN/Pallet.'
              : null
        : activeWorkflowStep === 'release'
          ? !receivingSession
            ? 'Cần bắt đầu phiên tiếp nhận trước khi release.'
            : !confirmedReceiptLine
              ? 'Cần xác nhận dòng tiếp nhận trước khi release.'
              : !putawayReady
                ? 'Cần trạng thái READY_FOR_PUTAWAY trước khi release.'
                : releaseRequireLpn && !confirmedInboundLpn
                  ? 'Cần xác nhận LPN/Pallet trước khi release vì cấu hình đang yêu cầu LPN.'
                  : null
          : null;
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
          : 'Đang bị chặn bởi kiểm tra sẵn sàng.',
      state: resolveWorkflowStepState(
        'receiving',
        activeWorkflowStep,
        receivingDone && !needsDiscrepancyRouting,
        !readinessDone,
      ),
    },
    {
      key: 'qc',
      label: 'QC',
      description: qcDone
        ? 'QC đã có kết quả hoặc được bỏ qua.'
        : 'Đánh giá QC sau khi có dòng tiếp nhận.',
      state: resolveWorkflowStepState('qc', activeWorkflowStep, qcDone, !receivingDone),
    },
    {
      key: 'lpn',
      label: 'LPN/Pallet',
      description: lpnDone ? 'Đã xác nhận LPN/Pallet.' : 'Xác nhận LPN/Pallet sau QC.',
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

  useEffect(() => {
    if (routePlanId && selectedId !== routePlanId) {
      setSelectedId(routePlanId);
    }
  }, [routePlanId, selectedId]);

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
        },
      },
    );
  }

  function submitEvaluateQcTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingSession || !confirmedReceiptLine || !canEvaluateQcTask) return;
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
          : 'Tiếp nhận đang bị chặn'
        : activeWorkflowStep === 'qc'
          ? 'QC'
          : activeWorkflowStep === 'lpn'
            ? 'LPN/Pallet'
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
          : 'QC: được bỏ qua theo rule hiện tại',
      );
    }
    if (recordedQcResult) {
      items.push(`Kết quả QC: ${vietnameseOperationalLabel(recordedQcResult.resultStatus)}`);
    }
    if (confirmedInboundLpn) {
      items.push(`LPN/Pallet: ${confirmedInboundLpn.lpnCode}`);
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

  return (
    <div className="space-y-4">
      {selected && <InboundOperatorHeader plan={selected} />}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 space-y-4">
          {selected && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kế hoạch và dòng hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={selected.status} />
                  <StatusBadge value={selected.gateInStatus} />
                  <span className="text-muted-foreground text-sm">
                    {selected.businessReference}
                  </span>
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
                <InboundWorkflowStepper steps={workflowSteps} />
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2">Dòng</th>
                        <th className="py-2">SKU</th>
                        <th className="py-2">UOM</th>
                        <th className="py-2 text-right">Dự kiến</th>
                        <th className="py-2 text-right">Tham chiếu ngoài</th>
                        <th className="py-2 text-right">Tiếp nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.lines.map((line) => (
                        <tr key={line.id} className="border-b last:border-0">
                          <td className="py-2">{line.lineNumber}</td>
                          <td className="py-2">{line.skuCode ?? line.skuId}</td>
                          <td className="py-2">{line.uomCode ?? line.uomId}</td>
                          <td className="py-2 text-right">{line.expectedQuantity}</td>
                          <td className="py-2 text-right">{line.externalLineReference ?? '-'}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              className={cn(
                                'min-h-10 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted',
                                selectedLine?.id === line.id && 'border-primary bg-primary/5',
                              )}
                              onClick={() => {
                                setSelectedLineId(line.id);
                                setReceiptActualQuantity(String(line.expectedQuantity));
                              }}
                            >
                              Chọn dòng {line.lineNumber}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="min-w-0 space-y-4">
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
                            min="1"
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

          <NextActionShell title={nextActionTitle}>
            {blockedActionMessage && <InboundBlockedActionHelper message={blockedActionMessage} />}

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

            {activeWorkflowStep === 'receiving' && !readinessDone && (
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

            {activeWorkflowStep === 'receiving' && readinessDone && (
              <InboundReceivingPanel
                canCaptureDiscrepancy={canCaptureDiscrepancy}
                canConfirmReceiptLine={canConfirmReceiptLine}
                canStartReceiving={canStartReceiving}
                confirmedReceiptLine={confirmedReceiptLine}
                discrepancyEvidenceRefs={discrepancyEvidenceRefs}
                discrepancyIdempotencyKey={discrepancyIdempotencyKey}
                discrepancyReasonCode={discrepancyReasonCode}
                discrepancyReasonNote={discrepancyReasonNote}
                discrepancyResult={capturedDiscrepancy}
                discrepancyType={discrepancyType}
                hasCaptureDiscrepancyError={captureDiscrepancyErrorMatchesSelectedLine}
                hasPlan={Boolean(selected)}
                isCaptureDiscrepancyPending={mutations.captureDiscrepancy.isPending}
                isConfirmReceiptLinePending={mutations.confirmReceiptLine.isPending}
                isStartReceivingPending={mutations.startReceivingSession.isPending}
                onDiscrepancyEvidenceRefsChange={setDiscrepancyEvidenceRefs}
                onDiscrepancyIdempotencyKeyChange={setDiscrepancyIdempotencyKey}
                onDiscrepancyReasonCodeChange={setDiscrepancyReasonCode}
                onDiscrepancyReasonNoteChange={setDiscrepancyReasonNote}
                onDiscrepancyTypeChange={setDiscrepancyType}
                onReceiptActualQuantityChange={setReceiptActualQuantity}
                onReceiptIdempotencyKeyChange={setReceiptIdempotencyKey}
                onReceiptManualConfirmChange={setReceiptManualConfirm}
                onReceiptRawScanChange={setReceiptRawScan}
                onReceiptReasonCodeChange={setReceiptReasonCode}
                onReceivingDeviceCodeChange={setReceivingDeviceCode}
                onReceivingSessionKeyChange={setReceivingSessionKey}
                onSubmitDiscrepancy={submitDiscrepancy}
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
          </NextActionShell>

          {selected && (
            <>
              <InboundLineQueue
                lines={selected.lines}
                selectedLineId={selectedLine?.id ?? null}
                onSelect={(line) => {
                  setSelectedLineId(line.id);
                  setReceiptActualQuantity(String(line.expectedQuantity));
                }}
              />
              <InboundRecentActivity items={recentActivityItems} />
              <InboundTechnicalDetails
                confirmedInboundLpn={confirmedInboundLpn}
                plan={selected}
                putawayRelease={putawayRelease}
                readiness={readiness}
                receiptLine={confirmedReceiptLine}
                receivingSession={receivingSession ?? null}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
