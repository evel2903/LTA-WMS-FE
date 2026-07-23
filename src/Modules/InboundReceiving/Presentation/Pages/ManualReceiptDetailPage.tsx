import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { ApiError } from '@shared/Services/Http/ApiError';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import { useInboundReceivingMutations } from '@modules/InboundReceiving/Application/Commands/UseInboundReceivingMutations';
import { useReceiptOperationalState } from '@modules/InboundReceiving/Application/Queries/UseInboundReceivingState';
import {
  INBOUND_DISCREPANCY_TYPES,
  QC_DISPOSITION_CODES,
  QC_RESULT_STATUSES,
} from '@modules/InboundReceiving/Domain/Constants/InboundReceivingConstants';
import type {
  InboundDiscrepancyType,
  QcDispositionCode,
  QcResultStatus,
} from '@modules/InboundReceiving/Domain/Types/Receipt';
import { useManualReceiptLookups } from '@modules/InboundReceiving/Presentation/Components/UseManualReceiptLookups';
import { usePartner } from '@modules/PartnerMaster/Application/Queries/UsePartners';
import { useWarehouseProfile } from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles';
import { usePutawayMutations } from '@modules/Putaway/Application/Commands/UsePutawayMutations';
import { usePutawayTasks } from '@modules/Putaway/Application/Queries/UsePutawayTasks';

function nextIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function formatQuantity(value: number | null) {
  if (value === null) return 'Không khai báo';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
}

function latestBy<T>(items: T[], timestamp: (item: T) => string): T | null {
  return [...items].sort((a, b) => timestamp(b).localeCompare(timestamp(a)))[0] ?? null;
}

function FormError({ visible }: { visible: boolean }) {
  return visible ? (
    <p role="alert" className="text-sm text-destructive">
      Thao tác chưa thành công. Kiểm tra dữ liệu và trạng thái nghiệp vụ rồi thử lại.
    </p>
  ) : null;
}

export function ManualReceiptDetailPage() {
  const { receiptId } = useParams<{ receiptId: string }>();
  const query = useReceiptOperationalState(receiptId ?? null);
  const mutations = useInboundReceivingMutations(null);
  const putawayMutations = usePutawayMutations();
  const lookups = useManualReceiptLookups();

  const [selectedLineId, setSelectedLineId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [uomId, setUomId] = useState('');
  const [actualQuantity, setActualQuantity] = useState('');
  const [expectedQuantity, setExpectedQuantity] = useState('');
  const [manualConfirm, setManualConfirm] = useState(false);
  const [lineReasonCode, setLineReasonCode] = useState('');
  const [lineReasonNote, setLineReasonNote] = useState('');
  const [rawScan, setRawScan] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [lineKey, setLineKey] = useState(() => nextIdempotencyKey('manual-line'));

  const [forceQc, setForceQc] = useState(false);
  const [qcTaskKey, setQcTaskKey] = useState(() => nextIdempotencyKey('manual-qc-task'));
  const [qcResultStatus, setQcResultStatus] = useState<QcResultStatus>('Passed');
  const [qcDisposition, setQcDisposition] = useState<QcDispositionCode>('Release');
  const [inspectedQuantity, setInspectedQuantity] = useState('');
  const [acceptedQuantity, setAcceptedQuantity] = useState('');
  const [rejectedQuantity, setRejectedQuantity] = useState('0');
  const [qcReasonCode, setQcReasonCode] = useState('');
  const [qcReasonNote, setQcReasonNote] = useState('');
  const [qcEvidenceRefs, setQcEvidenceRefs] = useState('');
  const [qcResultKey, setQcResultKey] = useState(() => nextIdempotencyKey('manual-qc-result'));

  const [lpnCode, setLpnCode] = useState('');
  const [ssccCode, setSsccCode] = useState('');
  const [lpnQuantity, setLpnQuantity] = useState('');
  const [lpnReasonCode, setLpnReasonCode] = useState('');
  const [lpnReasonNote, setLpnReasonNote] = useState('');
  const [lpnEvidenceRefs, setLpnEvidenceRefs] = useState('');
  const [lpnKey, setLpnKey] = useState(() => nextIdempotencyKey('manual-lpn'));

  const [discrepancyType, setDiscrepancyType] = useState<InboundDiscrepancyType>('DamagedGoods');
  const [discrepancyReasonCode, setDiscrepancyReasonCode] = useState('');
  const [discrepancyReasonNote, setDiscrepancyReasonNote] = useState('');
  const [discrepancyEvidenceRefs, setDiscrepancyEvidenceRefs] = useState('');
  const [discrepancyKey, setDiscrepancyKey] = useState(() =>
    nextIdempotencyKey('manual-discrepancy'),
  );

  const [currentLocationCode, setCurrentLocationCode] = useState('RECEIVING');
  const [requireLpn, setRequireLpn] = useState(false);
  const [attemptLabelOverride, setAttemptLabelOverride] = useState(false);
  const [releaseReasonCode, setReleaseReasonCode] = useState('');
  const [releaseReasonNote, setReleaseReasonNote] = useState('');
  const [releaseEvidenceRefs, setReleaseEvidenceRefs] = useState('');
  const [releaseKey, setReleaseKey] = useState(() => nextIdempotencyKey('manual-release'));
  const initializedLineId = useRef<string | null>(null);
  const pendingSelectedLineId = useRef<string | null>(null);

  const state = query.data;
  const supplierQuery = usePartner(state?.receipt.supplierId ?? null);
  const warehouseProfileQuery = useWarehouseProfile(state?.receipt.warehouseProfileId ?? null);
  const receiptLines = useMemo(() => state?.receiptLines ?? [], [state?.receiptLines]);
  const selectedLine =
    receiptLines.find((line) => line.id === selectedLineId) ??
    (pendingSelectedLineId.current ? null : receiptLines[0] ?? null);

  useEffect(() => {
    if (pendingSelectedLineId.current) {
      if (receiptLines.some((line) => line.id === pendingSelectedLineId.current)) {
        setSelectedLineId(pendingSelectedLineId.current);
        pendingSelectedLineId.current = null;
      }
      return;
    }
    if (!selectedLineId && receiptLines[0]) setSelectedLineId(receiptLines[0].id);
    if (selectedLineId && !receiptLines.some((line) => line.id === selectedLineId)) {
      setSelectedLineId(receiptLines[0]?.id ?? '');
    }
  }, [receiptLines, selectedLineId]);

  useEffect(() => {
    if (!selectedLine) {
      initializedLineId.current = null;
      return;
    }
    if (initializedLineId.current === selectedLine.id) return;
    const quantity = String(selectedLine.actualQuantity);
    setInspectedQuantity(quantity);
    setAcceptedQuantity(quantity);
    setRejectedQuantity('0');
    setLpnQuantity(quantity);
    setForceQc(false);
    setQcTaskKey(nextIdempotencyKey('manual-qc-task'));
    setQcResultStatus('Passed');
    setQcDisposition('Release');
    setQcReasonCode('');
    setQcReasonNote('');
    setQcEvidenceRefs('');
    setQcResultKey(nextIdempotencyKey('manual-qc-result'));
    setLpnCode('');
    setSsccCode('');
    setLpnReasonCode('');
    setLpnReasonNote('');
    setLpnEvidenceRefs('');
    setLpnKey(nextIdempotencyKey('manual-lpn'));
    setDiscrepancyType('DamagedGoods');
    setDiscrepancyReasonCode('');
    setDiscrepancyReasonNote('');
    setDiscrepancyEvidenceRefs('');
    setDiscrepancyKey(nextIdempotencyKey('manual-discrepancy'));
    setCurrentLocationCode('RECEIVING');
    setRequireLpn(false);
    setAttemptLabelOverride(false);
    setReleaseReasonCode('');
    setReleaseReasonNote('');
    setReleaseEvidenceRefs('');
    setReleaseKey(nextIdempotencyKey('manual-release'));
    initializedLineId.current = selectedLine.id;
  }, [selectedLine]);

  useEffect(() => {
    if (selectedLine?.expectedQuantity === null && discrepancyType === 'QuantityVariance') {
      setDiscrepancyType('DamagedGoods');
    }
  }, [discrepancyType, selectedLine?.expectedQuantity]);

  const selectedQcTask = selectedLine
    ? latestBy(
        state?.qcTasks.filter((task) => task.receiptLineId === selectedLine.id) ?? [],
        (task) => task.createdAt,
      )
    : null;
  const selectedQcResult = selectedLine
    ? latestBy(
        state?.qcResults.filter((result) => result.receiptLineId === selectedLine.id) ?? [],
        (result) => result.recordedAt,
      )
    : null;
  const selectedLpn = selectedLine
    ? latestBy(
        state?.lpns.filter((lpn) => lpn.receiptLineId === selectedLine.id) ?? [],
        (lpn) => lpn.confirmedAt,
      )
    : null;
  const selectedRelease = selectedLine
    ? latestBy(
        state?.releases.filter((release) => release.receiptLineId === selectedLine.id) ?? [],
        (release) => release.releasedAt,
      )
    : null;
  const putawayTaskQuery = usePutawayTasks(
    {
      page: 1,
      pageSize: 1,
      inboundPutawayReleaseId: selectedRelease?.id,
    },
    Boolean(selectedRelease),
  );
  const selectedPutawayTask = putawayTaskQuery.data?.items[0] ?? null;

  if (!receiptId) {
    return <p role="alert">Đường dẫn phiếu nhập kho không hợp lệ.</p>;
  }
  const resolvedReceiptId = receiptId;

  if (query.isLoading) {
    return <p>Đang tải phiếu nhập kho...</p>;
  }

  if (query.error || !state) {
    const error = query.error instanceof ApiError ? query.error : null;
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">
          {error?.isForbidden ? 'Từ chối quyền truy cập' : 'Không thể tải phiếu nhập kho'}
        </h1>
        <Button asChild variant="secondary">
          <Link to={ROUTES.INBOUND_RECEIVING.ROOT}>Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const { receipt } = state;
  const isPlannedReceipt = Boolean(receipt.inboundPlanId);
  const supplierLabel =
    receipt.supplierCode || receipt.supplierName
      ? [receipt.supplierCode, receipt.supplierName].filter(Boolean).join(' - ')
      : supplierQuery.data
        ? `${supplierQuery.data.partnerCode} - ${supplierQuery.data.partnerName}`
        : supplierQuery.isLoading
          ? 'Đang tải...'
          : 'Không xác định';
  const warehouseProfileLabel = !receipt.warehouseProfileId
    ? 'Không chọn'
    : warehouseProfileQuery.data
      ? `${warehouseProfileQuery.data.profileCode} - ${warehouseProfileQuery.data.profileName}`
      : warehouseProfileQuery.isLoading
        ? 'Đang tải...'
        : 'Không xác định';
  const lineActual = Number(actualQuantity);
  const lineExpected = toOptionalNumber(expectedQuantity);
  const canConfirmLine =
    Boolean(skuId && uomId && lineKey.trim()) &&
    Number.isFinite(lineActual) &&
    lineActual > 0 &&
    (lineExpected === null || (Number.isFinite(lineExpected) && lineExpected > 0)) &&
    (manualConfirm ? Boolean(lineReasonCode.trim()) : Boolean(rawScan.trim()));
  const inspected = Number(inspectedQuantity);
  const accepted = Number(acceptedQuantity);
  const rejected = Number(rejectedQuantity);
  const qcBalanced =
    Number.isFinite(inspected) &&
    inspected > 0 &&
    Number.isFinite(accepted) &&
    accepted >= 0 &&
    Number.isFinite(rejected) &&
    rejected >= 0 &&
    Math.abs(accepted + rejected - inspected) < 0.000001;

  function submitLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canConfirmLine) return;
    mutations.confirmReceiptLine.mutate(
      {
        receiptId: resolvedReceiptId,
        input: {
          inboundPlanLineId: null,
          skuId,
          uomId,
          actualQuantity: lineActual,
          expectedQuantity: lineExpected,
          manualConfirm,
          reasonCode: manualConfirm ? lineReasonCode.trim() : null,
          reasonNote: lineReasonNote.trim() || null,
          lotNumber: lotNumber.trim() || null,
          expiryDate: expiryDate || null,
          serialNumber: serialNumber.trim() || null,
          idempotencyKey: lineKey,
          scanEvidence:
            !manualConfirm && rawScan.trim()
              ? {
                  rawValue: rawScan.trim(),
                  scanType: 'ManualReceiptEvidence',
                  scanResult: 'Accepted',
                  resolvedSkuId: skuId,
                  resolvedUomId: uomId,
                }
              : null,
        },
      },
      {
        onSuccess: (line) => {
          pendingSelectedLineId.current = line.id;
          setSelectedLineId(line.id);
          setActualQuantity('');
          setExpectedQuantity('');
          setManualConfirm(false);
          setLineReasonCode('');
          setLineReasonNote('');
          setRawScan('');
          setLotNumber('');
          setExpiryDate('');
          setSerialNumber('');
          setLineKey(nextIdempotencyKey('manual-line'));
        },
      },
    );
  }

  function submitQcTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLine || !qcTaskKey.trim()) return;
    mutations.evaluateQcTask.mutate(
      {
        receiptId: resolvedReceiptId,
        input: {
          receiptLineId: selectedLine.id,
          forceRequired: forceQc,
          idempotencyKey: qcTaskKey,
        },
      },
      { onSuccess: () => setQcTaskKey(nextIdempotencyKey('manual-qc-task')) },
    );
  }

  function submitQcResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedQcTask?.required || !qcBalanced || !qcResultKey.trim()) return;
    mutations.recordQcResult.mutate(
      {
        qcTaskId: selectedQcTask.id,
        input: {
          resultStatus: qcResultStatus,
          dispositionCode: qcDisposition,
          inspectedQuantity: inspected,
          acceptedQuantity: accepted,
          rejectedQuantity: rejected,
          reasonCode: qcReasonCode.trim() || null,
          reasonNote: qcReasonNote.trim() || null,
          evidenceRefs: qcEvidenceRefs
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          idempotencyKey: qcResultKey,
        },
      },
      { onSuccess: () => setQcResultKey(nextIdempotencyKey('manual-qc-result')) },
    );
  }

  function submitLpn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = toOptionalNumber(lpnQuantity);
    if (!selectedLine || !lpnCode.trim() || !lpnKey.trim()) return;
    mutations.confirmInboundLpn.mutate(
      {
        receiptId: resolvedReceiptId,
        receiptLineId: selectedLine.id,
        input: {
          lpnCode: lpnCode.trim(),
          ssccCode: ssccCode.trim() || null,
          quantity,
          reasonCode: lpnReasonCode.trim() || null,
          reasonNote: lpnReasonNote.trim() || null,
          evidenceRefs: lpnEvidenceRefs
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          idempotencyKey: lpnKey,
        },
      },
      {
        onSuccess: () => {
          setLpnCode('');
          setSsccCode('');
          setLpnReasonCode('');
          setLpnReasonNote('');
          setLpnEvidenceRefs('');
          setLpnKey(nextIdempotencyKey('manual-lpn'));
        },
      },
    );
  }

  function submitDiscrepancy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLine || !discrepancyReasonCode.trim() || !discrepancyKey.trim()) return;
    mutations.captureDiscrepancy.mutate(
      {
        receiptId: resolvedReceiptId,
        input: {
          receiptLineId: selectedLine.id,
          discrepancyType,
          reasonCode: discrepancyReasonCode.trim(),
          reasonNote: discrepancyReasonNote.trim() || null,
          evidenceRefs: discrepancyEvidenceRefs
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          idempotencyKey: discrepancyKey,
        },
      },
      { onSuccess: () => setDiscrepancyKey(nextIdempotencyKey('manual-discrepancy')) },
    );
  }

  function submitRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLine || selectedRelease || !currentLocationCode.trim() || !releaseKey.trim()) return;
    mutations.releaseInboundToPutaway.mutate(
      {
        receiptId: resolvedReceiptId,
        receiptLineId: selectedLine.id,
        input: {
          currentLocationCode: currentLocationCode.trim(),
          requireLpn,
          attemptLabelOverride,
          reasonCode: releaseReasonCode.trim() || null,
          reasonNote: releaseReasonNote.trim() || null,
          evidenceRefs: releaseEvidenceRefs
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          idempotencyKey: releaseKey,
        },
      },
      {
        onSuccess: (release) => {
          setReleaseKey(nextIdempotencyKey('manual-release'));
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

  function retryPutawayTask() {
    if (!selectedRelease) return;
    putawayMutations.releaseTask.mutate({
      inboundPutawayReleaseId: selectedRelease.id,
      sourceLocationId: selectedRelease.currentLocationId,
      sourceLocationCode: selectedRelease.currentLocationCode,
      idempotencyKey: `putaway-release-${selectedRelease.id}`,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Phiếu nhập kho</p>
          <h1 className="text-2xl font-semibold">{receipt.receiptNumber}</h1>
          <p className="text-sm text-muted-foreground">{receipt.businessReference}</p>
        </div>
        <Button asChild variant="secondary">
          <Link to={ROUTES.INBOUND_RECEIVING.ROOT}>Danh sách phiếu</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin tiếp nhận</CardTitle>
          <CardDescription>
            {isPlannedReceipt
              ? 'Phiếu có kế hoạch chỉ được xem tại đây; mọi thao tác tiếp nhận thực hiện trong console kế hoạch.'
              : 'Sẵn sàng tiếp nhận: Không áp dụng kiểm tra gate-in/kế hoạch đối với phiếu thủ công.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-muted-foreground">Nguồn: </span>
            {isPlannedReceipt ? 'Kế hoạch' : 'Thủ công'}
          </div>
          <div>
            <span className="text-muted-foreground">Kho: </span>
            {receipt.warehouseCode ?? receipt.warehouseId}
          </div>
          <div>
            <span className="text-muted-foreground">Chủ hàng: </span>
            {receipt.ownerCode ?? receipt.ownerId}
          </div>
          <div>
            <span className="text-muted-foreground">Trạng thái: </span>
            {vietnameseOperationalLabel(receipt.status)}
          </div>
          <div className="break-all">
            <span className="text-muted-foreground">Nhà cung cấp: </span>
            {supplierLabel}
          </div>
          <div className="break-all">
            <span className="text-muted-foreground">Hồ sơ kho: </span>
            {warehouseProfileLabel}
          </div>
          <div>
            <span className="text-muted-foreground">Phiên mở: </span>
            {state.receivingSessions.filter((session) => session.status === 'Open').length}
          </div>
          <div>
            <span className="text-muted-foreground">Số dòng: </span>
            {receiptLines.length}
          </div>
        </CardContent>
      </Card>

      {isPlannedReceipt && receipt.inboundPlanId ? (
        <Card>
          <CardHeader>
            <CardTitle>Phiếu sinh từ kế hoạch</CardTitle>
            <CardDescription>
              Dùng console kế hoạch để giữ đầy đủ dòng dự kiến và kiểm soát gate-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={ROUTES.INBOUND_RECEIVING.DETAIL(receipt.inboundPlanId)}>
                Mở console kế hoạch
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Xác nhận dòng thực nhận</CardTitle>
            <CardDescription>
              SKU và đơn vị tính là bắt buộc; số lượng dự kiến có thể để trống.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 lg:grid-cols-4" onSubmit={submitLine}>
              <ComboboxSelect
                id="manual-line-sku"
                name="skuId"
                label="SKU"
                value={skuId}
                placeholder="Chọn SKU"
                options={lookups.skuOptions}
                isLoading={lookups.skuQuery.isLoading}
                isError={lookups.skuQuery.isError}
                emptyMessage="Chưa có SKU hoạt động."
                errorMessage="Không tải được SKU."
                searchValue={lookups.skuSearch}
                searchPlaceholder="Tìm theo mã hoặc tên SKU..."
                onSearchChange={lookups.setSkuSearch}
                onChange={setSkuId}
              />
              <ComboboxSelect
                id="manual-line-uom"
                name="uomId"
                label="Đơn vị tính"
                value={uomId}
                placeholder="Chọn đơn vị tính"
                options={lookups.uomOptions}
                isLoading={lookups.uomQuery.isLoading}
                isError={lookups.uomQuery.isError}
                emptyMessage="Chưa có đơn vị tính hoạt động."
                errorMessage="Không tải được đơn vị tính."
                searchValue={lookups.uomSearch}
                searchPlaceholder="Tìm theo mã hoặc tên đơn vị tính..."
                onSearchChange={lookups.setUomSearch}
                onChange={setUomId}
              />
              <label className="grid gap-1 text-sm" htmlFor="manual-line-actual">
                Số lượng thực nhận
                <Input
                  id="manual-line-actual"
                  name="actualQuantity"
                  type="number"
                  min="0.0001"
                  step="any"
                  value={actualQuantity}
                  onChange={(event) => setActualQuantity(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm" htmlFor="manual-line-expected">
                Số lượng dự kiến (không bắt buộc)
                <Input
                  id="manual-line-expected"
                  name="expectedQuantity"
                  type="number"
                  min="0.0001"
                  step="any"
                  value={expectedQuantity}
                  onChange={(event) => setExpectedQuantity(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm lg:col-span-2" htmlFor="manual-line-scan">
                Dữ liệu quét thô (không bắt buộc)
                <Input
                  id="manual-line-scan"
                  name="rawScan"
                  value={rawScan}
                  onChange={(event) => setRawScan(event.target.value)}
                />
              </label>
              <label
                className="flex items-center gap-2 text-sm lg:col-span-2"
                htmlFor="manual-line-confirm"
              >
                <input
                  id="manual-line-confirm"
                  name="manualConfirm"
                  type="checkbox"
                  checked={manualConfirm}
                  onChange={(event) => setManualConfirm(event.target.checked)}
                />
                Xác nhận thủ công (cần mã lý do Override)
              </label>
              {manualConfirm ? (
                <>
                  <ReasonCodeSelect
                    id="manual-line-reason-code"
                    name="lineReasonCode"
                    label="Mã lý do xác nhận thủ công"
                    value={lineReasonCode}
                    action="Override"
                    objectType="Receipt"
                    onChange={setLineReasonCode}
                  />
                  <label className="grid gap-1 text-sm" htmlFor="manual-line-reason-note">
                    Ghi chú xác nhận thủ công
                    <Input
                      id="manual-line-reason-note"
                      name="lineReasonNote"
                      value={lineReasonNote}
                      onChange={(event) => setLineReasonNote(event.target.value)}
                    />
                  </label>
                </>
              ) : null}
              <label className="grid gap-1 text-sm" htmlFor="manual-line-lot">
                Số lô
                <Input
                  id="manual-line-lot"
                  name="lotNumber"
                  value={lotNumber}
                  onChange={(event) => setLotNumber(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm" htmlFor="manual-line-expiry">
                Hạn dùng
                <Input
                  id="manual-line-expiry"
                  name="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm lg:col-span-2" htmlFor="manual-line-serial">
                Serial
                <Input
                  id="manual-line-serial"
                  name="serialNumber"
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value)}
                />
              </label>
              <details className="rounded-md border bg-muted/30 p-3 text-sm lg:col-span-2">
                <summary className="cursor-pointer font-medium">Chi tiết kỹ thuật</summary>
                <p className="mt-2 break-all text-muted-foreground">Idempotency: {lineKey}</p>
              </details>
              <FormError visible={Boolean(mutations.confirmReceiptLine.error)} />
              <div className="flex items-end lg:col-span-4">
                <Button
                  type="submit"
                  disabled={!canConfirmLine || mutations.confirmReceiptLine.isPending}
                >
                  {mutations.confirmReceiptLine.isPending
                    ? 'Đang xác nhận...'
                    : 'Xác nhận dòng thực nhận'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dòng đã tiếp nhận</CardTitle>
          <CardDescription>
            {isPlannedReceipt
              ? 'Dữ liệu chỉ đọc. Mở console kế hoạch để thực hiện nghiệp vụ.'
              : 'Chọn một dòng để thực hiện QC, LPN, sai lệch hoặc bàn giao cất hàng.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receiptLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dòng thực nhận.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dòng</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Dự kiến</TableHead>
                  <TableHead>Thực nhận</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Chọn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptLines.map((line) => (
                  <TableRow
                    key={line.id}
                    data-state={selectedLine?.id === line.id ? 'selected' : undefined}
                  >
                    <TableCell>{line.lineNumber}</TableCell>
                    <TableCell>{line.skuCode ?? line.skuId}</TableCell>
                    <TableCell>
                      {formatQuantity(line.expectedQuantity)} {line.uomCode ?? ''}
                    </TableCell>
                    <TableCell>
                      {formatQuantity(line.actualQuantity)} {line.uomCode ?? ''}
                    </TableCell>
                    <TableCell>{vietnameseOperationalLabel(line.status)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedLine?.id === line.id ? 'default' : 'secondary'}
                        onClick={() => {
                          pendingSelectedLineId.current = null;
                          setSelectedLineId(line.id);
                        }}
                      >
                        {selectedLine?.id === line.id ? 'Đang chọn' : 'Chọn'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedLine && !isPlannedReceipt ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>QC cho dòng {selectedLine.lineNumber}</CardTitle>
              <CardDescription>
                Tác vụ mới nhất:{' '}
                {selectedQcTask
                  ? vietnameseOperationalLabel(selectedQcTask.taskStatus)
                  : 'Chưa đánh giá'}
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-3" onSubmit={submitQcTask}>
                <label className="flex items-center gap-2 text-sm" htmlFor="manual-qc-required">
                  <input
                    id="manual-qc-required"
                    name="forceQc"
                    type="checkbox"
                    checked={forceQc}
                    onChange={(event) => setForceQc(event.target.checked)}
                  />
                  Bắt buộc kiểm tra QC
                </label>
                <Button type="submit" disabled={mutations.evaluateQcTask.isPending}>
                  {mutations.evaluateQcTask.isPending ? 'Đang đánh giá...' : 'Đánh giá yêu cầu QC'}
                </Button>
                <FormError visible={Boolean(mutations.evaluateQcTask.error)} />
              </form>

              {selectedQcTask?.required ? (
                <form className="space-y-3 border-t pt-4" onSubmit={submitQcResult}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm" htmlFor="manual-qc-status">
                      Kết quả
                      <select
                        id="manual-qc-status"
                        name="qcResultStatus"
                        value={qcResultStatus}
                        className="min-h-10 rounded-md border bg-background px-3 py-2 text-sm"
                        onChange={(event) =>
                          setQcResultStatus(event.target.value as QcResultStatus)
                        }
                      >
                        {QC_RESULT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {vietnameseOperationalLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm" htmlFor="manual-qc-disposition">
                      Hướng xử lý
                      <select
                        id="manual-qc-disposition"
                        name="qcDisposition"
                        value={qcDisposition}
                        className="min-h-10 rounded-md border bg-background px-3 py-2 text-sm"
                        onChange={(event) =>
                          setQcDisposition(event.target.value as QcDispositionCode)
                        }
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
                    <label className="grid gap-1 text-sm" htmlFor="manual-qc-inspected">
                      Đã kiểm
                      <Input
                        id="manual-qc-inspected"
                        name="inspectedQuantity"
                        type="number"
                        min="0.0001"
                        step="any"
                        value={inspectedQuantity}
                        onChange={(event) => setInspectedQuantity(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm" htmlFor="manual-qc-accepted">
                      Đạt
                      <Input
                        id="manual-qc-accepted"
                        name="acceptedQuantity"
                        type="number"
                        min="0"
                        step="any"
                        value={acceptedQuantity}
                        onChange={(event) => setAcceptedQuantity(event.target.value)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm" htmlFor="manual-qc-rejected">
                      Loại
                      <Input
                        id="manual-qc-rejected"
                        name="rejectedQuantity"
                        type="number"
                        min="0"
                        step="any"
                        value={rejectedQuantity}
                        onChange={(event) => setRejectedQuantity(event.target.value)}
                      />
                    </label>
                  </div>
                  <ReasonCodeSelect
                    id="manual-qc-reason"
                    name="qcReasonCode"
                    label="Mã lý do"
                    value={qcReasonCode}
                    action="Update"
                    objectType="QcTask"
                    optional
                    onChange={setQcReasonCode}
                  />
                  <label className="grid gap-1 text-sm" htmlFor="manual-qc-note">
                    Ghi chú
                    <Input
                      id="manual-qc-note"
                      name="qcReasonNote"
                      value={qcReasonNote}
                      onChange={(event) => setQcReasonNote(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm" htmlFor="manual-qc-evidence">
                    Tham chiếu bằng chứng (phân tách bằng dấu phẩy)
                    <Input
                      id="manual-qc-evidence"
                      name="qcEvidenceRefs"
                      value={qcEvidenceRefs}
                      onChange={(event) => setQcEvidenceRefs(event.target.value)}
                    />
                  </label>
                  <Button
                    type="submit"
                    disabled={!qcBalanced || mutations.recordQcResult.isPending}
                  >
                    {mutations.recordQcResult.isPending
                      ? 'Đang ghi nhận...'
                      : 'Ghi nhận kết quả QC'}
                  </Button>
                  <FormError visible={Boolean(mutations.recordQcResult.error)} />
                </form>
              ) : selectedQcTask ? (
                <p className="rounded-md border bg-muted/30 p-3 text-sm">
                  QC không bắt buộc; dòng có thể chuyển bước tiếp theo.
                </p>
              ) : null}
              {selectedQcResult ? (
                <p className="text-sm text-muted-foreground">
                  Kết quả mới nhất: {vietnameseOperationalLabel(selectedQcResult.resultStatus)} /{' '}
                  {selectedQcResult.targetInventoryStatusCode}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Xác nhận LPN</CardTitle>
              <CardDescription>LPN mới nhất: {selectedLpn?.lpnCode ?? 'Chưa có'}.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submitLpn}>
                <label className="grid gap-1 text-sm" htmlFor="manual-lpn-code">
                  Mã LPN
                  <Input
                    id="manual-lpn-code"
                    name="lpnCode"
                    value={lpnCode}
                    onChange={(event) => setLpnCode(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm" htmlFor="manual-lpn-sscc">
                  Mã SSCC (18 chữ số)
                  <Input
                    id="manual-lpn-sscc"
                    name="ssccCode"
                    inputMode="numeric"
                    maxLength={18}
                    value={ssccCode}
                    onChange={(event) => setSsccCode(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm" htmlFor="manual-lpn-quantity">
                  Số lượng
                  <Input
                    id="manual-lpn-quantity"
                    name="lpnQuantity"
                    type="number"
                    min="0.0001"
                    step="any"
                    value={lpnQuantity}
                    onChange={(event) => setLpnQuantity(event.target.value)}
                  />
                </label>
                <ReasonCodeSelect
                  id="manual-lpn-reason"
                  name="lpnReasonCode"
                  label="Lý do LPN"
                  value={lpnReasonCode}
                  action="Update"
                  objectType="Receipt"
                  optional
                  onChange={setLpnReasonCode}
                />
                <label className="grid gap-1 text-sm" htmlFor="manual-lpn-note">
                  Ghi chú
                  <Input
                    id="manual-lpn-note"
                    name="lpnReasonNote"
                    value={lpnReasonNote}
                    onChange={(event) => setLpnReasonNote(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm" htmlFor="manual-lpn-evidence">
                  Bằng chứng LPN (phân tách bằng dấu phẩy)
                  <Input
                    id="manual-lpn-evidence"
                    name="lpnEvidenceRefs"
                    value={lpnEvidenceRefs}
                    onChange={(event) => setLpnEvidenceRefs(event.target.value)}
                  />
                </label>
                <Button
                  type="submit"
                  disabled={!lpnCode.trim() || mutations.confirmInboundLpn.isPending}
                >
                  {mutations.confirmInboundLpn.isPending ? 'Đang xác nhận...' : 'Xác nhận LPN'}
                </Button>
                <FormError visible={Boolean(mutations.confirmInboundLpn.error)} />
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Báo sai lệch</CardTitle>
              <CardDescription>
                Sai lệch số lượng chỉ áp dụng khi dòng có số lượng dự kiến.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submitDiscrepancy}>
                <label className="grid gap-1 text-sm" htmlFor="manual-discrepancy-type">
                  Loại sai lệch
                  <select
                    id="manual-discrepancy-type"
                    name="discrepancyType"
                    value={discrepancyType}
                    className="min-h-10 rounded-md border bg-background px-3 py-2 text-sm"
                    onChange={(event) =>
                      setDiscrepancyType(event.target.value as InboundDiscrepancyType)
                    }
                  >
                    {INBOUND_DISCREPANCY_TYPES.map((type) => (
                      <option
                        key={type}
                        value={type}
                        disabled={
                          type === 'QuantityVariance' && selectedLine.expectedQuantity === null
                        }
                      >
                        {vietnameseOperationalLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <ReasonCodeSelect
                  id="manual-discrepancy-reason"
                  name="discrepancyReasonCode"
                  label="Lý do sai lệch"
                  value={discrepancyReasonCode}
                  action="Update"
                  objectType="Receipt"
                  onChange={setDiscrepancyReasonCode}
                />
                <label className="grid gap-1 text-sm" htmlFor="manual-discrepancy-note">
                  Ghi chú
                  <Input
                    id="manual-discrepancy-note"
                    name="discrepancyReasonNote"
                    value={discrepancyReasonNote}
                    onChange={(event) => setDiscrepancyReasonNote(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm" htmlFor="manual-discrepancy-evidence">
                  Bằng chứng sai lệch (phân tách bằng dấu phẩy)
                  <Input
                    id="manual-discrepancy-evidence"
                    name="discrepancyEvidenceRefs"
                    value={discrepancyEvidenceRefs}
                    onChange={(event) => setDiscrepancyEvidenceRefs(event.target.value)}
                  />
                </label>
                <Button
                  type="submit"
                  disabled={!discrepancyReasonCode.trim() || mutations.captureDiscrepancy.isPending}
                >
                  {mutations.captureDiscrepancy.isPending
                    ? 'Đang ghi nhận...'
                    : 'Ghi nhận sai lệch'}
                </Button>
                <FormError visible={Boolean(mutations.captureDiscrepancy.error)} />
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bàn giao cất hàng</CardTitle>
              <CardDescription>
                {selectedRelease
                  ? `Đã bàn giao tới ${selectedRelease.currentLocationCode ?? 'vị trí tiếp nhận'}.`
                  : 'Chưa bàn giao.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submitRelease}>
                <label className="grid gap-1 text-sm" htmlFor="manual-release-location">
                  Vị trí hiện tại
                  <Input
                    id="manual-release-location"
                    name="currentLocationCode"
                    value={currentLocationCode}
                    onChange={(event) => setCurrentLocationCode(event.target.value)}
                  />
                </label>
                <label
                  className="flex items-center gap-2 text-sm"
                  htmlFor="manual-release-require-lpn"
                >
                  <input
                    id="manual-release-require-lpn"
                    name="requireLpn"
                    type="checkbox"
                    checked={requireLpn}
                    onChange={(event) => setRequireLpn(event.target.checked)}
                  />
                  Yêu cầu có LPN trước khi bàn giao
                </label>
                <label
                  className="flex items-center gap-2 text-sm"
                  htmlFor="manual-release-label-override"
                >
                  <input
                    id="manual-release-label-override"
                    name="attemptLabelOverride"
                    type="checkbox"
                    checked={attemptLabelOverride}
                    onChange={(event) => setAttemptLabelOverride(event.target.checked)}
                  />
                  Yêu cầu ghi đè chặn nhãn khi có thẩm quyền
                </label>
                <ReasonCodeSelect
                  id="manual-release-reason"
                  name="releaseReasonCode"
                  label="Mã lý do"
                  value={releaseReasonCode}
                  action="Update"
                  objectType="Receipt"
                  optional
                  onChange={setReleaseReasonCode}
                />
                <label className="grid gap-1 text-sm" htmlFor="manual-release-note">
                  Ghi chú
                  <Input
                    id="manual-release-note"
                    name="releaseReasonNote"
                    value={releaseReasonNote}
                    onChange={(event) => setReleaseReasonNote(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm" htmlFor="manual-release-evidence">
                  Tham chiếu bằng chứng (phân tách bằng dấu phẩy)
                  <Input
                    id="manual-release-evidence"
                    name="releaseEvidenceRefs"
                    value={releaseEvidenceRefs}
                    onChange={(event) => setReleaseEvidenceRefs(event.target.value)}
                  />
                </label>
                <Button
                  type="submit"
                  disabled={
                    Boolean(selectedRelease) ||
                    !currentLocationCode.trim() ||
                    mutations.releaseInboundToPutaway.isPending
                  }
                >
                  {mutations.releaseInboundToPutaway.isPending
                    ? 'Đang bàn giao...'
                    : 'Bàn giao cất hàng'}
                </Button>
                <FormError visible={Boolean(mutations.releaseInboundToPutaway.error)} />
              </form>
              {selectedRelease ? (
                <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                  {selectedPutawayTask ? (
                    <p>
                      Tác vụ cất hàng: <strong>{selectedPutawayTask.taskCode}</strong> ·{' '}
                      {vietnameseOperationalLabel(selectedPutawayTask.taskStatus)}
                    </p>
                  ) : putawayTaskQuery.isLoading || putawayMutations.releaseTask.isPending ? (
                    <p>Đang tạo tác vụ cất hàng...</p>
                  ) : (
                    <>
                      <p role={putawayMutations.releaseTask.error ? 'alert' : undefined}>
                        Chưa tạo được tác vụ cất hàng cho lần bàn giao này.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={retryPutawayTask}
                        disabled={putawayMutations.releaseTask.isPending}
                      >
                        Thử tạo lại tác vụ cất hàng
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
