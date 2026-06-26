import type { FormEvent } from 'react';

import { AlertTriangle, PlayCircle, ScanLine } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { INBOUND_DISCREPANCY_TYPES } from '@modules/Inbound/Domain/Constants/InboundConstants';
import type {
  InboundDiscrepancy,
  InboundDiscrepancyType,
  InboundPlanLine,
  ReceiptLine,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';

interface InboundReceivingPanelProps {
  canCaptureDiscrepancy: boolean;
  canConfirmReceiptLine: boolean;
  canStartReceiving: boolean;
  confirmedReceiptLine: ReceiptLine | null;
  discrepancyEvidenceRefs: string;
  discrepancyIdempotencyKey: string;
  discrepancyReasonCode: string;
  discrepancyReasonNote: string;
  discrepancyResult: InboundDiscrepancy | null;
  discrepancyType: InboundDiscrepancyType;
  hasCaptureDiscrepancyError: boolean;
  hasPlan: boolean;
  isCaptureDiscrepancyPending: boolean;
  isConfirmReceiptLinePending: boolean;
  isStartReceivingPending: boolean;
  onDiscrepancyEvidenceRefsChange: (value: string) => void;
  onDiscrepancyIdempotencyKeyChange: (value: string) => void;
  onDiscrepancyReasonCodeChange: (value: string) => void;
  onDiscrepancyReasonNoteChange: (value: string) => void;
  onDiscrepancyTypeChange: (value: InboundDiscrepancyType) => void;
  onReceiptActualQuantityChange: (value: string) => void;
  onReceiptIdempotencyKeyChange: (value: string) => void;
  onReceiptManualConfirmChange: (value: boolean) => void;
  onReceiptRawScanChange: (value: string) => void;
  onReceiptReasonCodeChange: (value: string) => void;
  onReceivingDeviceCodeChange: (value: string) => void;
  onReceivingSessionKeyChange: (value: string) => void;
  onSubmitDiscrepancy: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitReceiptLine: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitStartReceiving: (event: FormEvent<HTMLFormElement>) => void;
  receiptActualQuantity: string;
  receiptIdempotencyKey: string;
  receiptLineResult: ReceiptLine | null;
  receiptManualConfirm: boolean;
  receiptRawScan: string;
  receiptReasonCode: string;
  readinessDone: boolean;
  receivingDeviceCode: string;
  receivingSession: ReceivingSession | null;
  receivingSessionKey: string;
  selectedLine: InboundPlanLine | null;
}

function getStartReceivingHelper({
  hasPlan,
  isPending,
  readinessDone,
  receivingSession,
  receivingSessionKey,
}: {
  hasPlan: boolean;
  isPending: boolean;
  readinessDone: boolean;
  receivingSession: ReceivingSession | null;
  receivingSessionKey: string;
}) {
  if (!hasPlan) return 'Chưa có chứng từ nhập kho để bắt đầu tiếp nhận.';
  if (isPending) return 'Đang bắt đầu phiên tiếp nhận.';
  if (receivingSession) return 'Phiên tiếp nhận đã sẵn sàng; có thể tiếp tục xác nhận dòng.';
  if (!readinessDone) return 'Cần hoàn tất kiểm tra sẵn sàng trước khi bắt đầu tiếp nhận.';
  if (!receivingSessionKey.trim()) return 'Nhập khóa phiên tiếp nhận để bắt đầu.';
  return 'Sẵn sàng bắt đầu phiên tiếp nhận.';
}

function getReceiptLineHelper({
  isPending,
  receiptActualQuantity,
  receiptIdempotencyKey,
  receiptManualConfirm,
  receiptRawScan,
  receiptReasonCode,
  receivingSession,
  selectedLine,
}: {
  isPending: boolean;
  receiptActualQuantity: string;
  receiptIdempotencyKey: string;
  receiptManualConfirm: boolean;
  receiptRawScan: string;
  receiptReasonCode: string;
  receivingSession: ReceivingSession | null;
  selectedLine: InboundPlanLine | null;
}) {
  if (!receivingSession) return 'Cần bắt đầu phiên tiếp nhận trước khi xác nhận dòng.';
  if (!selectedLine) return 'Chưa có dòng nhập kho để xác nhận.';
  if (isPending) return 'Đang xác nhận dòng tiếp nhận.';
  if (Number(receiptActualQuantity) <= 0) return 'Số lượng thực tế phải lớn hơn 0.';
  if (receiptManualConfirm && !receiptReasonCode.trim()) {
    return 'Xác nhận thủ công cần mã lý do tiếp nhận.';
  }
  if (!receiptManualConfirm && !receiptRawScan.trim()) {
    return 'Cần giá trị quét thô hoặc bật xác nhận thủ công kèm mã lý do.';
  }
  if (!receiptIdempotencyKey.trim()) return 'Cần khóa idempotency để xác nhận dòng.';
  return 'Sẵn sàng xác nhận dòng tiếp nhận.';
}

function hasEvidenceRef(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length > 0;
}

function getDiscrepancyHelper({
  confirmedReceiptLine,
  discrepancyEvidenceRefs,
  discrepancyIdempotencyKey,
  discrepancyReasonCode,
  isPending,
  receivingSession,
}: {
  confirmedReceiptLine: ReceiptLine | null;
  discrepancyEvidenceRefs: string;
  discrepancyIdempotencyKey: string;
  discrepancyReasonCode: string;
  isPending: boolean;
  receivingSession: ReceivingSession | null;
}) {
  if (!receivingSession) return 'Cần phiên tiếp nhận trước khi điều phối sai lệch.';
  if (!confirmedReceiptLine) return 'Cần xác nhận dòng tiếp nhận trước khi điều phối sai lệch.';
  if (isPending) return 'Đang chuyển xử lý sai lệch.';
  if (!discrepancyReasonCode.trim()) return 'Nhập mã lý do sai lệch.';
  if (!hasEvidenceRef(discrepancyEvidenceRefs)) return 'Nhập tham chiếu bằng chứng sai lệch.';
  if (!discrepancyIdempotencyKey.trim()) return 'Cần khóa idempotency sai lệch.';
  return 'Sẵn sàng chuyển xử lý sai lệch.';
}

export function InboundReceivingPanel({
  canCaptureDiscrepancy,
  canConfirmReceiptLine,
  canStartReceiving,
  confirmedReceiptLine,
  discrepancyEvidenceRefs,
  discrepancyIdempotencyKey,
  discrepancyReasonCode,
  discrepancyReasonNote,
  discrepancyResult,
  discrepancyType,
  hasCaptureDiscrepancyError,
  hasPlan,
  isCaptureDiscrepancyPending,
  isConfirmReceiptLinePending,
  isStartReceivingPending,
  onDiscrepancyEvidenceRefsChange,
  onDiscrepancyIdempotencyKeyChange,
  onDiscrepancyReasonCodeChange,
  onDiscrepancyReasonNoteChange,
  onDiscrepancyTypeChange,
  onReceiptActualQuantityChange,
  onReceiptIdempotencyKeyChange,
  onReceiptManualConfirmChange,
  onReceiptRawScanChange,
  onReceiptReasonCodeChange,
  onReceivingDeviceCodeChange,
  onReceivingSessionKeyChange,
  onSubmitDiscrepancy,
  onSubmitReceiptLine,
  onSubmitStartReceiving,
  receiptActualQuantity,
  receiptIdempotencyKey,
  receiptLineResult,
  receiptManualConfirm,
  receiptRawScan,
  receiptReasonCode,
  readinessDone,
  receivingDeviceCode,
  receivingSession,
  receivingSessionKey,
  selectedLine,
}: InboundReceivingPanelProps) {
  const startHelper = getStartReceivingHelper({
    hasPlan,
    isPending: isStartReceivingPending,
    readinessDone,
    receivingSession,
    receivingSessionKey,
  });
  const receiptLineHelper = getReceiptLineHelper({
    isPending: isConfirmReceiptLinePending,
    receiptActualQuantity,
    receiptIdempotencyKey,
    receiptManualConfirm,
    receiptRawScan,
    receiptReasonCode,
    receivingSession,
    selectedLine,
  });
  const discrepancyHelper = getDiscrepancyHelper({
    confirmedReceiptLine,
    discrepancyEvidenceRefs,
    discrepancyIdempotencyKey,
    discrepancyReasonCode,
    isPending: isCaptureDiscrepancyPending,
    receivingSession,
  });
  const discrepancyDisabled = !confirmedReceiptLine;

  return (
    <Card data-testid="inbound-receiving-panel">
      <CardHeader>
        <CardTitle className="text-base">Quét tiếp nhận</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={onSubmitStartReceiving}>
          <label className="grid gap-1 text-sm" htmlFor="inbound-receiving-session-key">
            Khóa phiên tiếp nhận
            <Input
              id="inbound-receiving-session-key"
              name="receivingSessionKey"
              value={receivingSessionKey}
              onChange={(event) => onReceivingSessionKeyChange(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-receiving-device-code">
            Mã thiết bị
            <Input
              id="inbound-receiving-device-code"
              name="receivingDeviceCode"
              value={receivingDeviceCode}
              onChange={(event) => onReceivingDeviceCodeChange(event.target.value)}
            />
          </label>
          <p className="break-words text-sm text-muted-foreground" data-testid="inbound-receiving-start-helper">
            {startHelper}
          </p>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canStartReceiving || isStartReceivingPending}
          >
            <PlayCircle className="size-4" />
            Bắt đầu tiếp nhận
          </button>
          {receivingSession && (
            <p className="text-sm text-muted-foreground">
              Phiếu tiếp nhận {receivingSession.receiptNumber}
              {receivingSession.isDuplicate ? ' đã dùng lại' : ' đã sẵn sàng'}.
            </p>
          )}
        </form>

        <form className="space-y-3" onSubmit={onSubmitReceiptLine}>
          <div className="break-words text-sm text-muted-foreground">
            Dòng đã chọn:{' '}
            {selectedLine ? `${selectedLine.lineNumber} - ${selectedLine.skuCode ?? selectedLine.skuId}` : 'Không có'}
          </div>
          <label className="grid gap-1 text-sm" htmlFor="inbound-receipt-actual-quantity">
            Số lượng thực tế
            <Input
              id="inbound-receipt-actual-quantity"
              name="receiptActualQuantity"
              type="number"
              min="0.0001"
              value={receiptActualQuantity}
              onChange={(event) => onReceiptActualQuantityChange(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-receipt-raw-scan">
            Giá trị quét thô
            <Input
              id="inbound-receipt-raw-scan"
              name="receiptRawScan"
              value={receiptRawScan}
              onChange={(event) => onReceiptRawScanChange(event.target.value)}
              disabled={receiptManualConfirm}
            />
          </label>
          <label className="flex items-center gap-2 text-sm" htmlFor="inbound-receipt-manual-confirm">
            <input
              id="inbound-receipt-manual-confirm"
              name="receiptManualConfirm"
              type="checkbox"
              checked={receiptManualConfirm}
              onChange={(event) => onReceiptManualConfirmChange(event.target.checked)}
            />
            Xác nhận thủ công
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-receipt-reason-code">
            Mã lý do tiếp nhận
            <Input
              id="inbound-receipt-reason-code"
              name="receiptReasonCode"
              value={receiptReasonCode}
              onChange={(event) => onReceiptReasonCodeChange(event.target.value)}
              disabled={!receiptManualConfirm}
              placeholder="RC-V1-MANUAL-SCAN"
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-receipt-idempotency-key">
            Khóa idempotency
            <Input
              id="inbound-receipt-idempotency-key"
              name="receiptIdempotencyKey"
              value={receiptIdempotencyKey}
              onChange={(event) => onReceiptIdempotencyKeyChange(event.target.value)}
            />
          </label>
          <p className="break-words text-sm text-muted-foreground" data-testid="inbound-receipt-line-helper">
            {receiptLineHelper}
          </p>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canConfirmReceiptLine || isConfirmReceiptLinePending}
          >
            <ScanLine className="size-4" />
            Xác nhận dòng tiếp nhận
          </button>
          {receiptLineResult && (
            <p className="break-words text-sm text-muted-foreground">
              Dòng {receiptLineResult.lineNumber} {vietnameseOperationalLabel(receiptLineResult.status)}
              {receiptLineResult.isDuplicate ? ' đã dùng lại' : ''}
              {receiptLineResult.discrepancySignals.length
                ? ` - ${receiptLineResult.discrepancySignals.map(vietnameseOperationalLabel).join(', ')}`
                : ''}
            </p>
          )}
        </form>

        <form className="space-y-3 rounded-md border p-3" onSubmit={onSubmitDiscrepancy}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4" />
            Điều phối sai lệch
          </div>
          {confirmedReceiptLine?.discrepancySignals.length ? (
            <div className="break-words text-xs text-muted-foreground">
              Tín hiệu: {confirmedReceiptLine.discrepancySignals.map(vietnameseOperationalLabel).join(', ')}
            </div>
          ) : null}
          <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-type">
            Loại sai lệch
            <select
              id="inbound-discrepancy-type"
              name="discrepancyType"
              value={discrepancyType}
              onChange={(event) => onDiscrepancyTypeChange(event.target.value as InboundDiscrepancyType)}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              disabled={discrepancyDisabled}
            >
              {INBOUND_DISCREPANCY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {vietnameseOperationalLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-reason-code">
            Mã lý do sai lệch
            <Input
              id="inbound-discrepancy-reason-code"
              name="discrepancyReasonCode"
              value={discrepancyReasonCode}
              onChange={(event) => onDiscrepancyReasonCodeChange(event.target.value)}
              placeholder="RC-V1-DISCREPANCY"
              disabled={discrepancyDisabled}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-reason-note">
            Ghi chú lý do sai lệch
            <Input
              id="inbound-discrepancy-reason-note"
              name="discrepancyReasonNote"
              value={discrepancyReasonNote}
              onChange={(event) => onDiscrepancyReasonNoteChange(event.target.value)}
              placeholder="Số lượng lệch so với ASN"
              disabled={discrepancyDisabled}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-evidence-refs">
            Tham chiếu bằng chứng sai lệch
            <Input
              id="inbound-discrepancy-evidence-refs"
              name="discrepancyEvidenceRefs"
              value={discrepancyEvidenceRefs}
              onChange={(event) => onDiscrepancyEvidenceRefsChange(event.target.value)}
              placeholder="photo://dock/over-qty-1"
              disabled={discrepancyDisabled}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-idempotency-key">
            Khóa idempotency sai lệch
            <Input
              id="inbound-discrepancy-idempotency-key"
              name="discrepancyIdempotencyKey"
              value={discrepancyIdempotencyKey}
              onChange={(event) => onDiscrepancyIdempotencyKeyChange(event.target.value)}
              disabled={discrepancyDisabled}
            />
          </label>
          <p className="break-words text-sm text-muted-foreground" data-testid="inbound-discrepancy-helper">
            {discrepancyHelper}
          </p>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canCaptureDiscrepancy || isCaptureDiscrepancyPending}
          >
            <AlertTriangle className="size-4" />
            Chuyển xử lý sai lệch
          </button>
          {discrepancyResult && (
            <p className="break-words text-sm text-muted-foreground">
              Sai lệch {vietnameseOperationalLabel(discrepancyResult.status)} / Ngoại lệ{' '}
              {discrepancyResult.exceptionCaseId}
              {discrepancyResult.status === 'PendingApproval' ? ' / cần phê duyệt' : ''}
            </p>
          )}
          {hasCaptureDiscrepancyError ? (
            <p className="text-sm text-destructive">Không thể chuyển xử lý sai lệch.</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
