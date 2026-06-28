import type { FormEvent, ReactNode } from 'react';

import { PlayCircle, ScanLine } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import type {
  InboundPlanLine,
  ReceiptLine,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';

interface InboundReceivingPanelProps {
  canConfirmReceiptLine: boolean;
  canStartReceiving: boolean;
  hasPlan: boolean;
  isConfirmReceiptLinePending: boolean;
  isStartReceivingPending: boolean;
  onReceiptActualQuantityChange: (value: string) => void;
  onReceiptIdempotencyKeyChange: (value: string) => void;
  onReceiptManualConfirmChange: (value: boolean) => void;
  onReceiptRawScanChange: (value: string) => void;
  onReceiptReasonCodeChange: (value: string) => void;
  onReceivingDeviceCodeChange: (value: string) => void;
  onReceivingSessionKeyChange: (value: string) => void;
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
  if (isPending) return 'Đang xác nhận nhận hàng.';
  if (Number(receiptActualQuantity) <= 0) return 'Số lượng thực nhận phải lớn hơn 0.';
  if (receiptManualConfirm && !receiptReasonCode.trim()) {
    return 'Xác nhận thủ công cần mã lý do tiếp nhận.';
  }
  if (!receiptManualConfirm && !receiptRawScan.trim()) {
    return 'Cần quét mã hàng hoặc bật xác nhận thủ công kèm mã lý do.';
  }
  if (!receiptIdempotencyKey.trim()) return 'Cần khóa idempotency để xác nhận dòng.';
  return 'Sẵn sàng xác nhận nhận hàng.';
}

function TechnicalDetails({ children, testId }: { children: ReactNode; testId: string }) {
  return (
    <details className="rounded-md border bg-muted/30 p-3 text-sm" data-testid={testId}>
      <summary className="cursor-pointer font-medium">Chi tiết kỹ thuật</summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
}

export function InboundReceivingPanel({
  canConfirmReceiptLine,
  canStartReceiving,
  hasPlan,
  isConfirmReceiptLinePending,
  isStartReceivingPending,
  onReceiptActualQuantityChange,
  onReceiptIdempotencyKeyChange,
  onReceiptManualConfirmChange,
  onReceiptRawScanChange,
  onReceiptReasonCodeChange,
  onReceivingDeviceCodeChange,
  onReceivingSessionKeyChange,
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

  return (
    <Card data-testid="inbound-receiving-panel">
      <CardHeader>
        <CardTitle className="text-base">Tiếp nhận hàng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={onSubmitStartReceiving}>
          <TechnicalDetails testId="inbound-receiving-session-technical-details">
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
          </TechnicalDetails>
          <p
            className="break-words text-sm text-muted-foreground"
            data-testid="inbound-receiving-start-helper"
          >
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
          <div
            className="rounded-md border bg-muted/40 p-3 text-sm"
            data-testid="inbound-current-line"
          >
            <p className="text-xs font-medium text-muted-foreground">Dòng hàng đang nhận</p>
            {selectedLine ? (
              <div className="mt-1 space-y-1">
                <p className="font-medium text-foreground">
                  Dòng {selectedLine.lineNumber} - {selectedLine.skuCode ?? selectedLine.skuId}
                </p>
                <p className="text-muted-foreground">
                  Dự kiến: {formatQuantity(selectedLine.expectedQuantity)}{' '}
                  {selectedLine.uomCode ?? ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tham chiếu: {selectedLine.externalLineReference ?? 'không có'}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground">Chưa có dòng hàng để nhận.</p>
            )}
          </div>
          <label className="grid gap-1 text-sm" htmlFor="inbound-receipt-actual-quantity">
            Số lượng thực nhận
            <Input
              id="inbound-receipt-actual-quantity"
              name="receiptActualQuantity"
              type="number"
              min="0.0001"
              step="0.0001"
              value={receiptActualQuantity}
              onChange={(event) => onReceiptActualQuantityChange(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-receipt-raw-scan">
            Quét mã hàng
            <Input
              id="inbound-receipt-raw-scan"
              name="receiptRawScan"
              value={receiptRawScan}
              onChange={(event) => onReceiptRawScanChange(event.target.value)}
              disabled={receiptManualConfirm}
            />
          </label>
          <label
            className="flex items-center gap-2 text-sm"
            htmlFor="inbound-receipt-manual-confirm"
          >
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
          <TechnicalDetails testId="inbound-receipt-technical-details">
            <label className="grid gap-1 text-sm" htmlFor="inbound-receipt-idempotency-key">
              Khóa idempotency
              <Input
                id="inbound-receipt-idempotency-key"
                name="receiptIdempotencyKey"
                value={receiptIdempotencyKey}
                onChange={(event) => onReceiptIdempotencyKeyChange(event.target.value)}
              />
            </label>
          </TechnicalDetails>
          <p
            className="break-words text-sm text-muted-foreground"
            data-testid="inbound-receipt-line-helper"
          >
            {receiptLineHelper}
          </p>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canConfirmReceiptLine || isConfirmReceiptLinePending}
          >
            <ScanLine className="size-4" />
            Xác nhận nhận hàng
          </button>
          {receiptLineResult && (
            <p className="break-words text-sm text-muted-foreground">
              Dòng {receiptLineResult.lineNumber}{' '}
              {vietnameseOperationalLabel(receiptLineResult.status)}
              {receiptLineResult.isDuplicate ? ' đã dùng lại' : ''}
              {receiptLineResult.discrepancySignals.length
                ? ` - ${receiptLineResult.discrepancySignals.map(vietnameseOperationalLabel).join(', ')}`
                : ''}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
