import type { FormEvent } from 'react';

import { ClipboardCheck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import {
  QC_DISPOSITION_CODES,
  QC_RESULT_STATUSES,
} from '@modules/Inbound/Domain/Constants/InboundConstants';
import type {
  QcDispositionCode,
  QcResult,
  QcResultStatus,
  QcTask,
  ReceiptLine,
  ReceivingSession,
} from '@modules/Inbound/Domain/Types/InboundPlan';

interface InboundQcPanelProps {
  canEvaluateQcTask: boolean;
  canRecordQcResult: boolean;
  confirmedReceiptLine: ReceiptLine | null;
  evaluatedQcTask: QcTask | null;
  hasEvaluateQcTaskError: boolean;
  hasRecordQcResultError: boolean;
  isEvaluateQcTaskPending: boolean;
  isRecordQcResultPending: boolean;
  onQcAcceptedQuantityChange: (value: string) => void;
  onQcDispositionCodeChange: (value: QcDispositionCode) => void;
  onQcForceRequiredChange: (value: boolean) => void;
  onQcInspectedQuantityChange: (value: string) => void;
  onQcRejectedQuantityChange: (value: string) => void;
  onQcResultEvidenceRefsChange: (value: string) => void;
  onQcResultIdempotencyKeyChange: (value: string) => void;
  onQcResultReasonCodeChange: (value: string) => void;
  onQcResultReasonNoteChange: (value: string) => void;
  onQcResultStatusChange: (value: QcResultStatus) => void;
  onQcTaskEvidenceRefsChange: (value: string) => void;
  onQcTaskIdempotencyKeyChange: (value: string) => void;
  onQcTaskReasonCodeChange: (value: string) => void;
  onQcTaskReasonNoteChange: (value: string) => void;
  onSubmitEvaluateQcTask: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitQcResult: (event: FormEvent<HTMLFormElement>) => void;
  qcAcceptedQuantity: string;
  qcDispositionCode: QcDispositionCode;
  qcForceRequired: boolean;
  qcInspectedQuantity: string;
  qcNeedsReasonEvidence: boolean;
  qcQuantityBalanced: boolean;
  qcRejectedQuantity: string;
  qcResult: QcResult | null;
  qcResultEvidenceRefs: string;
  qcResultIdempotencyKey: string;
  qcResultReasonCode: string;
  qcResultReasonNote: string;
  qcResultStatus: QcResultStatus;
  qcTaskEvidenceRefs: string;
  qcTaskIdempotencyKey: string;
  qcTaskReasonCode: string;
  qcTaskReasonNote: string;
  receivingSession: ReceivingSession | null;
}

function getEvaluateQcHelper({
  confirmedReceiptLine,
  isPending,
  qcTaskIdempotencyKey,
  receivingSession,
}: {
  confirmedReceiptLine: ReceiptLine | null;
  isPending: boolean;
  qcTaskIdempotencyKey: string;
  receivingSession: ReceivingSession | null;
}) {
  if (!receivingSession) return 'Cần phiên tiếp nhận trước khi đánh giá QC.';
  if (!confirmedReceiptLine) return 'Cần xác nhận dòng tiếp nhận trước khi đánh giá QC.';
  if (isPending) return 'Đang đánh giá tác vụ QC.';
  if (!qcTaskIdempotencyKey.trim()) return 'Cần khóa idempotency tác vụ QC.';
  return 'Sẵn sàng đánh giá QC cho dòng đã tiếp nhận.';
}

function hasEvidenceRef(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length > 0;
}

function getRecordQcHelper({
  evaluatedQcTask,
  isPending,
  qcInspectedQuantity,
  qcNeedsReasonEvidence,
  qcQuantityBalanced,
  qcRejectedQuantity,
  qcResultEvidenceRefs,
  qcResultIdempotencyKey,
  qcResultReasonCode,
}: {
  evaluatedQcTask: QcTask | null;
  isPending: boolean;
  qcInspectedQuantity: string;
  qcNeedsReasonEvidence: boolean;
  qcQuantityBalanced: boolean;
  qcRejectedQuantity: string;
  qcResultEvidenceRefs: string;
  qcResultIdempotencyKey: string;
  qcResultReasonCode: string;
}) {
  if (!evaluatedQcTask) return 'Cần đánh giá QC trước khi ghi nhận kết quả.';
  if (!evaluatedQcTask.required) return 'QC không bắt buộc cho dòng này; không cần ghi kết quả.';
  if (isPending) return 'Đang ghi nhận kết quả QC.';
  if (!qcResultIdempotencyKey.trim()) return 'Cần khóa idempotency kết quả QC.';
  if (Number(qcInspectedQuantity) <= 0) return 'Số lượng đã kiểm phải lớn hơn 0.';
  if (Number(qcRejectedQuantity) < 0) return 'Số lượng loại không được âm.';
  if (!qcQuantityBalanced) return 'Số lượng đạt và loại phải bằng số lượng đã kiểm.';
  if (qcNeedsReasonEvidence && !qcResultReasonCode.trim()) return 'Kết quả QC này cần mã lý do.';
  if (qcNeedsReasonEvidence && !hasEvidenceRef(qcResultEvidenceRefs)) {
    return 'Kết quả QC này cần tham chiếu bằng chứng.';
  }
  return 'Sẵn sàng ghi nhận kết quả QC.';
}

export function InboundQcPanel({
  canEvaluateQcTask,
  canRecordQcResult,
  confirmedReceiptLine,
  evaluatedQcTask,
  hasEvaluateQcTaskError,
  hasRecordQcResultError,
  isEvaluateQcTaskPending,
  isRecordQcResultPending,
  onQcAcceptedQuantityChange,
  onQcDispositionCodeChange,
  onQcForceRequiredChange,
  onQcInspectedQuantityChange,
  onQcRejectedQuantityChange,
  onQcResultEvidenceRefsChange,
  onQcResultIdempotencyKeyChange,
  onQcResultReasonCodeChange,
  onQcResultReasonNoteChange,
  onQcResultStatusChange,
  onQcTaskEvidenceRefsChange,
  onQcTaskIdempotencyKeyChange,
  onQcTaskReasonCodeChange,
  onQcTaskReasonNoteChange,
  onSubmitEvaluateQcTask,
  onSubmitQcResult,
  qcAcceptedQuantity,
  qcDispositionCode,
  qcForceRequired,
  qcInspectedQuantity,
  qcNeedsReasonEvidence,
  qcQuantityBalanced,
  qcRejectedQuantity,
  qcResult,
  qcResultEvidenceRefs,
  qcResultIdempotencyKey,
  qcResultReasonCode,
  qcResultReasonNote,
  qcResultStatus,
  qcTaskEvidenceRefs,
  qcTaskIdempotencyKey,
  qcTaskReasonCode,
  qcTaskReasonNote,
  receivingSession,
}: InboundQcPanelProps) {
  const evaluateHelper = getEvaluateQcHelper({
    confirmedReceiptLine,
    isPending: isEvaluateQcTaskPending,
    qcTaskIdempotencyKey,
    receivingSession,
  });
  const recordHelper = getRecordQcHelper({
    evaluatedQcTask,
    isPending: isRecordQcResultPending,
    qcInspectedQuantity,
    qcNeedsReasonEvidence,
    qcQuantityBalanced,
    qcRejectedQuantity,
    qcResultEvidenceRefs,
    qcResultIdempotencyKey,
    qcResultReasonCode,
  });
  const qcResultDisabled = !evaluatedQcTask?.required;

  return (
    <Card data-testid="inbound-qc-panel">
      <CardHeader>
        <CardTitle className="text-base">Tác vụ QC và kết quả</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={onSubmitEvaluateQcTask}>
          <label className="flex items-center gap-2 text-sm" htmlFor="inbound-qc-force-required">
            <input
              id="inbound-qc-force-required"
              name="qcForceRequired"
              type="checkbox"
              checked={qcForceRequired}
              onChange={(event) => onQcForceRequiredChange(event.target.checked)}
            />
            Bắt buộc QC
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-qc-task-reason-code">
            Mã lý do kích hoạt QC
            <Input
              id="inbound-qc-task-reason-code"
              name="qcTaskReasonCode"
              value={qcTaskReasonCode}
              onChange={(event) => onQcTaskReasonCodeChange(event.target.value)}
              placeholder="RC-V1-DISCREPANCY"
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-qc-task-reason-note">
            Ghi chú lý do kích hoạt QC
            <Input
              id="inbound-qc-task-reason-note"
              name="qcTaskReasonNote"
              value={qcTaskReasonNote}
              onChange={(event) => onQcTaskReasonNoteChange(event.target.value)}
              placeholder="Hồ sơ hoặc sai lệch yêu cầu QC"
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-qc-task-evidence-refs">
            Tham chiếu bằng chứng kích hoạt QC
            <Input
              id="inbound-qc-task-evidence-refs"
              name="qcTaskEvidenceRefs"
              value={qcTaskEvidenceRefs}
              onChange={(event) => onQcTaskEvidenceRefsChange(event.target.value)}
              placeholder="photo://dock/qc-trigger-1"
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-qc-task-idempotency-key">
            Khóa idempotency tác vụ QC
            <Input
              id="inbound-qc-task-idempotency-key"
              name="qcTaskIdempotencyKey"
              value={qcTaskIdempotencyKey}
              onChange={(event) => onQcTaskIdempotencyKeyChange(event.target.value)}
            />
          </label>
          <p className="break-words text-sm text-muted-foreground" data-testid="inbound-qc-task-helper">
            {evaluateHelper}
          </p>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canEvaluateQcTask || isEvaluateQcTaskPending}
          >
            <ClipboardCheck className="size-4" />
            Đánh giá QC
          </button>
        </form>

        {evaluatedQcTask && (
          <div className="break-words text-sm text-muted-foreground">
            QC {evaluatedQcTask.taskStatus} / {evaluatedQcTask.inventoryStatusCode} /{' '}
            {evaluatedQcTask.required ? evaluatedQcTask.triggerReason : 'Đã bỏ qua'}
          </div>
        )}

        <form className="space-y-3 border-t pt-3" onSubmit={onSubmitQcResult}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm" htmlFor="inbound-qc-result-status">
              Trạng thái kết quả QC
              <select
                id="inbound-qc-result-status"
                name="qcResultStatus"
                value={qcResultStatus}
                onChange={(event) => onQcResultStatusChange(event.target.value as QcResultStatus)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
                disabled={qcResultDisabled}
              >
                {QC_RESULT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {vietnameseOperationalLabel(status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm" htmlFor="inbound-qc-disposition-code">
              Hướng xử lý QC
              <select
                id="inbound-qc-disposition-code"
                name="qcDispositionCode"
                value={qcDispositionCode}
                onChange={(event) => onQcDispositionCodeChange(event.target.value as QcDispositionCode)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
                disabled={qcResultDisabled}
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
            <label className="grid gap-1 text-sm" htmlFor="inbound-qc-inspected-quantity">
              Số lượng đã kiểm
              <Input
                id="inbound-qc-inspected-quantity"
                name="qcInspectedQuantity"
                type="number"
                min="0.0001"
                value={qcInspectedQuantity}
                onChange={(event) => onQcInspectedQuantityChange(event.target.value)}
                disabled={qcResultDisabled}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="inbound-qc-accepted-quantity">
              Số lượng đạt
              <Input
                id="inbound-qc-accepted-quantity"
                name="qcAcceptedQuantity"
                type="number"
                min="0"
                value={qcAcceptedQuantity}
                onChange={(event) => onQcAcceptedQuantityChange(event.target.value)}
                disabled={qcResultDisabled}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="inbound-qc-rejected-quantity">
              Số lượng loại
              <Input
                id="inbound-qc-rejected-quantity"
                name="qcRejectedQuantity"
                type="number"
                min="0"
                value={qcRejectedQuantity}
                onChange={(event) => onQcRejectedQuantityChange(event.target.value)}
                disabled={qcResultDisabled}
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm" htmlFor="inbound-qc-result-reason-code">
            Mã lý do kết quả QC
            <Input
              id="inbound-qc-result-reason-code"
              name="qcResultReasonCode"
              value={qcResultReasonCode}
              onChange={(event) => onQcResultReasonCodeChange(event.target.value)}
              placeholder="RC-V1-DISCREPANCY"
              disabled={qcResultDisabled}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-qc-result-reason-note">
            Ghi chú lý do kết quả QC
            <Input
              id="inbound-qc-result-reason-note"
              name="qcResultReasonNote"
              value={qcResultReasonNote}
              onChange={(event) => onQcResultReasonNoteChange(event.target.value)}
              placeholder="Đơn vị bị loại do hư hỏng"
              disabled={qcResultDisabled}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-qc-result-evidence-refs">
            Tham chiếu bằng chứng kết quả QC
            <Input
              id="inbound-qc-result-evidence-refs"
              name="qcResultEvidenceRefs"
              value={qcResultEvidenceRefs}
              onChange={(event) => onQcResultEvidenceRefsChange(event.target.value)}
              placeholder="photo://qc/damaged-2"
              disabled={qcResultDisabled}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="inbound-qc-result-idempotency-key">
            Khóa idempotency kết quả QC
            <Input
              id="inbound-qc-result-idempotency-key"
              name="qcResultIdempotencyKey"
              value={qcResultIdempotencyKey}
              onChange={(event) => onQcResultIdempotencyKeyChange(event.target.value)}
              disabled={qcResultDisabled}
            />
          </label>
          <p className="break-words text-sm text-muted-foreground" data-testid="inbound-qc-result-helper">
            {recordHelper}
          </p>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canRecordQcResult || isRecordQcResultPending}
          >
            <ClipboardCheck className="size-4" />
            Ghi nhận kết quả QC
          </button>
        </form>

        {qcResult && (
          <p className="break-words text-sm text-muted-foreground">
            Kết quả QC {qcResult.resultStatus} / mục tiêu {qcResult.targetInventoryStatusCode}
          </p>
        )}
        {hasEvaluateQcTaskError ? (
          <p className="text-sm text-destructive">Không thể đánh giá QC.</p>
        ) : null}
        {hasRecordQcResultError ? (
          <p className="text-sm text-destructive">Không thể ghi nhận kết quả QC.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
