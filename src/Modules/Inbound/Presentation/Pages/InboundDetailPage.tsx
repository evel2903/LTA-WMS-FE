import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  PlayCircle,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { cn } from '@shared/Utils/Cn';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useInboundMutations } from '@modules/Inbound/Application/Commands/UseInboundMutations';
import { useInboundPlan, useReceivingReadiness } from '@modules/Inbound/Application/Queries/UseInboundPlans';
import {
  INBOUND_DISCREPANCY_TYPES,
  QC_DISPOSITION_CODES,
  QC_RESULT_STATUSES,
} from '@modules/Inbound/Domain/Constants/InboundConstants';
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
  const canGateIn = Boolean(selected && gateReference.trim());
  const canOverride = Boolean(selected && readinessReasonCode.trim());
  const canStartReceiving = Boolean(selected && receivingSessionKey.trim());
  const canConfirmReceiptLine = Boolean(
    receivingSession &&
    selectedLine &&
    Number(receiptActualQuantity) > 0 &&
    receiptIdempotencyKey.trim() &&
    (receiptManualConfirm ? receiptReasonCode.trim() : true),
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
  const qcQuantityBalanced = qcAcceptedQty + qcRejectedQty === qcInspectedQty;
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
    if (!selected || !canGateIn) return;
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
    if (!selected || !canOverride) return;
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
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-4">
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
                              'rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted',
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
              {readinessQuery.isLoading ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Đang kiểm tra sẵn sàng
                </p>
              ) : readiness ? (
                <p
                  className={cn(
                    'text-sm',
                    readiness.allowed ? 'text-emerald-700' : 'text-muted-foreground',
                  )}
                >
                  {readiness.overrideAccepted ? 'Ghi đè đã được chấp nhận' : readiness.reason}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>

      <aside className="space-y-4">
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
                          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted sm:col-span-4"
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
                    className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                    onClick={() => setLineDrafts((lines) => [...lines, initialLine()])}
                  >
                    Thêm dòng
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vào cổng và kiểm tra sẵn sàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={submitGateIn}>
              <label className="grid gap-1 text-sm">
                Tham chiếu cổng
                <Input
                  value={gateReference}
                  onChange={(event) => setGateReference(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canGateIn || mutations.recordGateIn.isPending}
              >
                Ghi nhận vào cổng
              </button>
            </form>

            <form className="space-y-3" onSubmit={submitOverride}>
              <label className="grid gap-1 text-sm">
                Mã lý do sẵn sàng
                <Input
                  value={readinessReasonCode}
                  onChange={(event) => setReadinessReasonCode(event.target.value)}
                  placeholder="RC-V1-HANDOFF"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canOverride || mutations.validateReadiness.isPending}
              >
                Ghi đè kiểm tra sẵn sàng
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quét tiếp nhận</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={submitStartReceiving}>
              <label className="grid gap-1 text-sm">
                Khóa phiên tiếp nhận
                <Input
                  value={receivingSessionKey}
                  onChange={(event) => setReceivingSessionKey(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Mã thiết bị
                <Input
                  value={receivingDeviceCode}
                  onChange={(event) => setReceivingDeviceCode(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canStartReceiving || mutations.startReceivingSession.isPending}
              >
                <PlayCircle className="size-4" />
                Bắt đầu tiếp nhận
              </button>
              {receivingSession && (
                <p className="text-muted-foreground text-sm">
                  Phiếu tiếp nhận {receivingSession.receiptNumber}
                  {receivingSession.isDuplicate ? ' đã dùng lại' : ' đã sẵn sàng'}.
                </p>
              )}
            </form>

            <form className="space-y-3" onSubmit={submitReceiptLine}>
              <div className="text-muted-foreground text-sm">
                Dòng đã chọn:{' '}
                {selectedLine
                  ? `${selectedLine.lineNumber} - ${selectedLine.skuCode ?? selectedLine.skuId}`
                  : 'Không có'}
              </div>
              <label className="grid gap-1 text-sm">
                Số lượng thực tế
                <Input
                  type="number"
                  min="0.0001"
                  value={receiptActualQuantity}
                  onChange={(event) => setReceiptActualQuantity(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Giá trị quét thô
                <Input
                  value={receiptRawScan}
                  onChange={(event) => setReceiptRawScan(event.target.value)}
                  disabled={receiptManualConfirm}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={receiptManualConfirm}
                  onChange={(event) => setReceiptManualConfirm(event.target.checked)}
                />
                Xác nhận thủ công
              </label>
              <label className="grid gap-1 text-sm">
                Mã lý do tiếp nhận
                <Input
                  value={receiptReasonCode}
                  onChange={(event) => setReceiptReasonCode(event.target.value)}
                  disabled={!receiptManualConfirm}
                  placeholder="RC-V1-MANUAL-SCAN"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Khóa idempotency
                <Input
                  value={receiptIdempotencyKey}
                  onChange={(event) => setReceiptIdempotencyKey(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canConfirmReceiptLine || mutations.confirmReceiptLine.isPending}
              >
                <ScanLine className="size-4" />
                Xác nhận dòng tiếp nhận
              </button>
              {mutations.confirmReceiptLine.data && (
                <p className="text-muted-foreground text-sm">
                  Dòng {mutations.confirmReceiptLine.data.lineNumber}{' '}
                  {vietnameseOperationalLabel(mutations.confirmReceiptLine.data.status)}
                  {mutations.confirmReceiptLine.data.isDuplicate ? ' đã dùng lại' : ''}
                  {mutations.confirmReceiptLine.data.discrepancySignals.length
                    ? ` - ${mutations.confirmReceiptLine.data.discrepancySignals.map(vietnameseOperationalLabel).join(', ')}`
                    : ''}
                </p>
              )}
            </form>

            {confirmedReceiptLine && (
              <>
                <form className="space-y-3 rounded-md border p-3" onSubmit={submitDiscrepancy}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="size-4" />
                    Điều phối sai lệch
                  </div>
                  {confirmedReceiptLine.discrepancySignals.length > 0 && (
                    <div className="text-muted-foreground text-xs">
                      Tín hiệu:{' '}
                      {confirmedReceiptLine.discrepancySignals.map(vietnameseOperationalLabel).join(', ')}
                    </div>
                  )}
                  <label className="grid gap-1 text-sm">
                    Loại sai lệch
                    <select
                      value={discrepancyType}
                      onChange={(event) =>
                        setDiscrepancyType(event.target.value as InboundDiscrepancyType)
                      }
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {INBOUND_DISCREPANCY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {vietnameseOperationalLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    Mã lý do sai lệch
                    <Input
                      value={discrepancyReasonCode}
                      onChange={(event) => setDiscrepancyReasonCode(event.target.value)}
                      placeholder="RC-V1-DISCREPANCY"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Ghi chú lý do sai lệch
                    <Input
                      value={discrepancyReasonNote}
                      onChange={(event) => setDiscrepancyReasonNote(event.target.value)}
                      placeholder="Số lượng lệch so với ASN"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Tham chiếu bằng chứng sai lệch
                    <Input
                      value={discrepancyEvidenceRefs}
                      onChange={(event) => setDiscrepancyEvidenceRefs(event.target.value)}
                      placeholder="photo://dock/over-qty-1"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Khóa idempotency sai lệch
                    <Input
                      value={discrepancyIdempotencyKey}
                      onChange={(event) => setDiscrepancyIdempotencyKey(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canCaptureDiscrepancy || mutations.captureDiscrepancy.isPending}
                  >
                    <AlertTriangle className="size-4" />
                    Chuyển xử lý sai lệch
                  </button>
                  {mutations.captureDiscrepancy.data && (
                    <p className="text-muted-foreground text-sm">
                      Sai lệch {vietnameseOperationalLabel(mutations.captureDiscrepancy.data.status)} / Ngoại lệ{' '}
                      {mutations.captureDiscrepancy.data.exceptionCaseId}
                      {mutations.captureDiscrepancy.data.status === 'PendingApproval'
                        ? ' / cần phê duyệt'
                        : ''}
                    </p>
                  )}
                  {mutations.captureDiscrepancy.error ? (
                    <p className="text-destructive text-sm">Không thể chuyển xử lý sai lệch.</p>
                  ) : null}
                </form>

                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ClipboardCheck className="size-4" />
                    Tác vụ QC và kết quả
                  </div>
                  <form className="space-y-3" onSubmit={submitEvaluateQcTask}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={qcForceRequired}
                        onChange={(event) => setQcForceRequired(event.target.checked)}
                      />
                      Bắt buộc QC
                    </label>
                    <label className="grid gap-1 text-sm">
                      Mã lý do kích hoạt QC
                      <Input
                        value={qcTaskReasonCode}
                        onChange={(event) => setQcTaskReasonCode(event.target.value)}
                        placeholder="RC-V1-DISCREPANCY"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Ghi chú lý do kích hoạt QC
                      <Input
                        value={qcTaskReasonNote}
                        onChange={(event) => setQcTaskReasonNote(event.target.value)}
                        placeholder="Hồ sơ hoặc sai lệch yêu cầu QC"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Tham chiếu bằng chứng kích hoạt QC
                      <Input
                        value={qcTaskEvidenceRefs}
                        onChange={(event) => setQcTaskEvidenceRefs(event.target.value)}
                        placeholder="photo://dock/qc-trigger-1"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Khóa idempotency tác vụ QC
                      <Input
                        value={qcTaskIdempotencyKey}
                        onChange={(event) => setQcTaskIdempotencyKey(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canEvaluateQcTask || mutations.evaluateQcTask.isPending}
                    >
                      <ClipboardCheck className="size-4" />
                      Đánh giá QC
                    </button>
                  </form>

                  {evaluatedQcTask && (
                    <div className="text-muted-foreground text-sm">
                      QC {evaluatedQcTask.taskStatus} / {evaluatedQcTask.inventoryStatusCode} /{' '}
                      {evaluatedQcTask.required ? evaluatedQcTask.triggerReason : 'Đã bỏ qua'}
                    </div>
                  )}

                  {evaluatedQcTask?.required && (
                    <form className="space-y-3 border-t pt-3" onSubmit={submitQcResult}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm">
                          Trạng thái kết quả QC
                          <select
                            value={qcResultStatus}
                            onChange={(event) =>
                              setQcResultStatus(event.target.value as QcResultStatus)
                            }
                            className="rounded-md border bg-background px-3 py-2 text-sm"
                          >
                            {QC_RESULT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {vietnameseOperationalLabel(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm">
                          Hướng xử lý QC
                          <select
                            value={qcDispositionCode}
                            onChange={(event) =>
                              setQcDispositionCode(event.target.value as QcDispositionCode)
                            }
                            className="rounded-md border bg-background px-3 py-2 text-sm"
                          >
                            {QC_DISPOSITION_CODES.map((code) => (
                              <option key={code} value={code}>
                                {vietnameseOperationalLabel(code)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="grid gap-1 text-sm">
                          Số lượng đã kiểm
                          <Input
                            type="number"
                            min="0.0001"
                            value={qcInspectedQuantity}
                            onChange={(event) => setQcInspectedQuantity(event.target.value)}
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          Số lượng đạt
                          <Input
                            type="number"
                            min="0"
                            value={qcAcceptedQuantity}
                            onChange={(event) => setQcAcceptedQuantity(event.target.value)}
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          Số lượng loại
                          <Input
                            type="number"
                            min="0"
                            value={qcRejectedQuantity}
                            onChange={(event) => setQcRejectedQuantity(event.target.value)}
                          />
                        </label>
                      </div>
                      <label className="grid gap-1 text-sm">
                        Mã lý do kết quả QC
                        <Input
                          value={qcResultReasonCode}
                          onChange={(event) => setQcResultReasonCode(event.target.value)}
                          placeholder="RC-V1-DISCREPANCY"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Ghi chú lý do kết quả QC
                        <Input
                          value={qcResultReasonNote}
                          onChange={(event) => setQcResultReasonNote(event.target.value)}
                          placeholder="Đơn vị bị loại do hư hỏng"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Tham chiếu bằng chứng kết quả QC
                        <Input
                          value={qcResultEvidenceRefs}
                          onChange={(event) => setQcResultEvidenceRefs(event.target.value)}
                          placeholder="photo://qc/damaged-2"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Khóa idempotency kết quả QC
                        <Input
                          value={qcResultIdempotencyKey}
                          onChange={(event) => setQcResultIdempotencyKey(event.target.value)}
                        />
                      </label>
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canRecordQcResult || mutations.recordQcResult.isPending}
                      >
                        <ClipboardCheck className="size-4" />
                        Ghi nhận kết quả QC
                      </button>
                    </form>
                  )}

                  {recordedQcResult && (
                    <p className="text-muted-foreground text-sm">
                      Kết quả QC {recordedQcResult.resultStatus} / mục tiêu{' '}
                      {recordedQcResult.targetInventoryStatusCode}
                    </p>
                  )}
                  {mutations.evaluateQcTask.error ? (
                    <p className="text-destructive text-sm">Không thể đánh giá QC.</p>
                  ) : null}
                  {mutations.recordQcResult.error ? (
                    <p className="text-destructive text-sm">Không thể ghi nhận kết quả QC.</p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <PackageCheck className="size-4" />
                    LPN/SSCC và phát hành cất hàng
                  </div>
                  <form className="space-y-3" onSubmit={submitInboundLpn}>
                    <label className="grid gap-1 text-sm">
                      Mã LPN
                      <Input value={lpnCode} onChange={(event) => setLpnCode(event.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Mã SSCC
                      <Input value={ssccCode} onChange={(event) => setSsccCode(event.target.value)} />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Khóa idempotency LPN
                      <Input
                        value={lpnIdempotencyKey}
                        onChange={(event) => setLpnIdempotencyKey(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canConfirmInboundLpn || mutations.confirmInboundLpn.isPending}
                    >
                      <PackageCheck className="size-4" />
                      Xác nhận LPN/SSCC
                    </button>
                  </form>

                  {confirmedInboundLpn && (
                    <p className="text-muted-foreground text-sm">
                      LPN {confirmedInboundLpn.lpnCode}
                      {confirmedInboundLpn.ssccCode ? ` / ${confirmedInboundLpn.ssccCode}` : ''}
                      {confirmedInboundLpn.isDuplicate ? ' đã dùng lại' : ''}
                    </p>
                  )}

                  <form className="space-y-3 border-t pt-3" onSubmit={submitReleaseInboundToPutaway}>
                    <label className="grid gap-1 text-sm">
                      Mã vị trí hiện tại
                      <Input
                        value={releaseCurrentLocationCode}
                        onChange={(event) => setReleaseCurrentLocationCode(event.target.value)}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={releaseRequireLpn}
                        onChange={(event) => setReleaseRequireLpn(event.target.checked)}
                      />
                      Yêu cầu LPN
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={releaseAttemptLabelOverride}
                        onChange={(event) => setReleaseAttemptLabelOverride(event.target.checked)}
                      />
                      Ghi đè nhãn
                    </label>
                    <label className="grid gap-1 text-sm">
                      Mã lý do phát hành
                      <Input
                        value={releaseReasonCode}
                        onChange={(event) => setReleaseReasonCode(event.target.value)}
                        placeholder="RC-V1-LABEL-OVERRIDE"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Tham chiếu bằng chứng phát hành
                      <Input
                        value={releaseEvidenceRefs}
                        onChange={(event) => setReleaseEvidenceRefs(event.target.value)}
                        placeholder="photo://label/override-1"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Khóa idempotency phát hành
                      <Input
                        value={releaseIdempotencyKey}
                        onChange={(event) => setReleaseIdempotencyKey(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        !canReleaseInboundToPutaway ||
                        mutations.releaseInboundToPutaway.isPending
                      }
                    >
                      <PackageCheck className="size-4" />
                      Phát hành sang cất hàng
                    </button>
                  </form>

                  {putawayRelease && (
                    <p className="text-muted-foreground text-sm">
                      Đã phát hành {putawayRelease.quantity} {putawayRelease.uomCode ?? putawayRelease.uomId} /{' '}
                      {putawayRelease.inventoryStatusCode}
                      {putawayRelease.currentLocationCode
                        ? ` / ${putawayRelease.currentLocationCode}`
                        : ''}
                    </p>
                  )}
                  {mutations.confirmInboundLpn.error ? (
                    <p className="text-destructive text-sm">Không thể xác nhận LPN/SSCC.</p>
                  ) : null}
                  {mutations.releaseInboundToPutaway.error ? (
                    <p className="text-destructive text-sm">
                      {mutations.releaseInboundToPutaway.error instanceof ApiError
                        ? mutations.releaseInboundToPutaway.error.message
                        : 'Không thể phát hành sang cất hàng.'}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
