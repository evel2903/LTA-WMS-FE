import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { cn } from '@shared/Utils/Cn';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import { useInboundPlan, useReceivingReadiness } from '@modules/Inbound/Application/Queries/UseInboundPlans';
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
  QcDispositionCode,
  QcResultStatus,
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
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{vietnameseOperationalLabel(value)}</span>;
}

const INBOUND_ALLOWED_ACTIONS = new Set(['receiving', 'gate-in', 'qc', 'lpn', 'release']);

function resolveWorkflowStepState(
  stepKey: InboundWorkflowStepKey,
  activeStep: InboundWorkflowStepKey,
  done: boolean,
  blocked = false,
): InboundWorkflowStepState {
  if (stepKey === activeStep) return 'active';
  if (done) return 'done';
  if (blocked) return 'blocked';
  return 'waiting';
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
  const [releaseIdempotencyKey, setReleaseIdempotencyKey] = useState(
    () => `release-${Date.now()}`,
  );

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
    detailQuery.error instanceof Error ? detailQuery.error.message : 'Không thể tải kế hoạch nhập kho.';
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
  const qcDone = Boolean(recordedQcResult || (evaluatedQcTask && !evaluatedQcTask.required));
  const releaseDone = Boolean(putawayRelease);
  const inferredWorkflowStep: InboundWorkflowStepKey = releaseDone
    ? 'release'
    : recordedQcResult || putawayReady || confirmedInboundLpn
      ? 'release'
      : evaluatedQcTask || confirmedReceiptLine
        ? 'qc'
        : receivingSession || readinessDone
          ? 'receiving'
          : gateInDone
            ? 'readiness'
            : selected
              ? 'gate-in'
              : 'plan';
  const activeWorkflowStep = routeWorkflowStep ?? inferredWorkflowStep;
  const workflowSteps: InboundWorkflowStep[] = [
    {
      key: 'plan',
      label: 'Kế hoạch',
      description: selected ? 'Kế hoạch nhập kho đã được tải.' : 'Đang chờ dữ liệu kế hoạch.',
      state: resolveWorkflowStepState('plan', activeWorkflowStep, Boolean(selected)),
    },
    {
      key: 'gate-in',
      label: 'Vào cổng',
      description: gateInDone ? 'Đã ghi nhận vào cổng.' : 'Cần ghi nhận xe/hàng vào cổng.',
      state: resolveWorkflowStepState('gate-in', activeWorkflowStep, gateInDone, !selected),
    },
    {
      key: 'readiness',
      label: 'Kiểm tra sẵn sàng / override',
      description:
        readiness?.allowed || readiness?.overrideAccepted
          ? 'Điều kiện tiếp nhận đã sẵn sàng.'
          : 'Xem kết quả kiểm tra sẵn sàng ở phần vận hành bên dưới.',
      state: resolveWorkflowStepState('readiness', activeWorkflowStep, readinessDone, !gateInDone),
    },
    {
      key: 'receiving',
      label: 'Tiếp nhận',
      description: receivingDone
        ? 'Đã xác nhận ít nhất một dòng tiếp nhận trong phiên hiện tại.'
        : 'Bắt đầu phiên và xác nhận dòng tiếp nhận.',
      state: resolveWorkflowStepState('receiving', activeWorkflowStep, receivingDone, !readinessDone),
    },
    {
      key: 'qc',
      label: 'QC',
      description: qcDone ? 'QC đã có kết quả hoặc được bỏ qua.' : 'Đánh giá QC sau khi có dòng tiếp nhận.',
      state: resolveWorkflowStepState('qc', activeWorkflowStep, qcDone, !receivingDone),
    },
    {
      key: 'release',
      label: 'Release cất hàng',
      description: releaseDone ? 'Đã phát hành sang cất hàng.' : 'Xác nhận LPN/SSCC và phát hành sang cất hàng.',
      state: resolveWorkflowStepState('release', activeWorkflowStep, releaseDone, !putawayReady),
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
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 space-y-4">
        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chi tiết chứng từ nhập kho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={selected.status} />
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
              <InboundWorkflowStepper steps={workflowSteps} />
              <div className="overflow-x-auto">
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
                            setLineDrafts((lines) => lines.filter((draft) => draft.id !== line.id))
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
                  <p className="text-muted-foreground text-sm">Đã dùng lại kế hoạch nhập kho hiện có.</p>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        <InboundGateInPanel
          gateReference={gateReference}
          hasPlan={Boolean(selected)}
          isGateInDone={gateInDone}
          isPending={mutations.recordGateIn.isPending}
          onGateReferenceChange={setGateReference}
          onSubmit={submitGateIn}
        />

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
      </aside>
    </div>
  );
}
