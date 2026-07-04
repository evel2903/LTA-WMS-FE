import { useEffect, useRef } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { AlertTriangle, X } from 'lucide-react';

import { Input } from '@shared/Components/Ui/Input';
import { LookupSelect } from '@shared/Components/Ui/LookupSelect';
import { useReasonCodeOptions } from '@modules/ReasonCode/Application/Queries/UseReasonCodeOptions';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { INBOUND_DISCREPANCY_TYPES } from '@modules/Inbound/Domain/Constants/InboundConstants';
import type {
  InboundDiscrepancy,
  InboundDiscrepancyType,
  InboundPlanLine,
  ReceiptLine,
} from '@modules/Inbound/Domain/Types/InboundPlan';

interface InboundDiscrepancySheetProps {
  canCaptureDiscrepancy: boolean;
  confirmedReceiptLine: ReceiptLine | null;
  discrepancyEvidenceRefs: string;
  discrepancyIdempotencyKey: string;
  discrepancyReasonCode: string;
  discrepancyReasonNote: string;
  discrepancyResult: InboundDiscrepancy | null;
  discrepancyType: InboundDiscrepancyType;
  hasCaptureDiscrepancyError: boolean;
  isCaptureDiscrepancyPending: boolean;
  onClose: () => void;
  onDiscrepancyEvidenceRefsChange: (value: string) => void;
  onDiscrepancyIdempotencyKeyChange: (value: string) => void;
  onDiscrepancyReasonCodeChange: (value: string) => void;
  onDiscrepancyReasonNoteChange: (value: string) => void;
  onDiscrepancyTypeChange: (value: InboundDiscrepancyType) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  selectedLine: InboundPlanLine | null;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
}

function hasEvidenceRef(value: string) {
  return (
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean).length > 0
  );
}

function getDiscrepancyHelper({
  confirmedReceiptLine,
  discrepancyEvidenceRefs,
  discrepancyIdempotencyKey,
  discrepancyReasonCode,
  isPending,
  selectedLine,
}: {
  confirmedReceiptLine: ReceiptLine | null;
  discrepancyEvidenceRefs: string;
  discrepancyIdempotencyKey: string;
  discrepancyReasonCode: string;
  isPending: boolean;
  selectedLine: InboundPlanLine | null;
}) {
  if (!selectedLine) return 'Không tìm thấy dòng nhập kho để báo sai lệch.';
  if (!confirmedReceiptLine) return 'Cần xác nhận dòng tiếp nhận trước khi điều phối sai lệch.';
  if (isPending) return 'Đang chuyển xử lý sai lệch.';
  if (!discrepancyReasonCode.trim()) return 'Nhập mã lý do sai lệch.';
  if (!hasEvidenceRef(discrepancyEvidenceRefs)) return 'Nhập tham chiếu bằng chứng sai lệch.';
  if (!discrepancyIdempotencyKey.trim()) return 'Cần khóa idempotency sai lệch.';
  return 'Sẵn sàng chuyển xử lý sai lệch.';
}

function TechnicalDetails({
  children,
  testId,
}: {
  children: ReactNode;
  testId: string;
}) {
  return (
    <details className="rounded-md border bg-muted/30 p-3 text-sm" data-testid={testId}>
      <summary className="cursor-pointer font-medium">Chi tiết kỹ thuật</summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

export function InboundDiscrepancySheet({
  canCaptureDiscrepancy,
  confirmedReceiptLine,
  discrepancyEvidenceRefs,
  discrepancyIdempotencyKey,
  discrepancyReasonCode,
  discrepancyReasonNote,
  discrepancyResult,
  discrepancyType,
  hasCaptureDiscrepancyError,
  isCaptureDiscrepancyPending,
  onClose,
  onDiscrepancyEvidenceRefsChange,
  onDiscrepancyIdempotencyKeyChange,
  onDiscrepancyReasonCodeChange,
  onDiscrepancyReasonNoteChange,
  onDiscrepancyTypeChange,
  onSubmit,
  open,
  selectedLine,
}: InboundDiscrepancySheetProps) {
  const {
    options: reasonCodeOptions,
    isLoading: reasonCodesLoading,
    isError: reasonCodesError,
  } = useReasonCodeOptions();
  const helper = getDiscrepancyHelper({
    confirmedReceiptLine,
    discrepancyEvidenceRefs,
    discrepancyIdempotencyKey,
    discrepancyReasonCode,
    isPending: isCaptureDiscrepancyPending,
    selectedLine,
  });
  const actualQuantityLabel = confirmedReceiptLine
    ? `${formatQuantity(confirmedReceiptLine.actualQuantity)} ${confirmedReceiptLine.uomCode ?? ''}`.trim()
    : 'Chưa có dữ liệu thực nhận trong phiên này';

  // Focus-restore-on-close is NOT handled here: `onClose` (wired to
  // `closeDiscrepancyOverlay` in InboundDetailPage.tsx) always navigates back
  // to the receiving route and focuses `actionPanelRef` (the always-visible
  // line console) via its own effect — a deliberate, fixed target rather than
  // "whatever had focus before," since this modal opens via a ROUTE (a direct
  // URL load has no "previous focus" to return to). Adding a second, competing
  // restore-focus-on-unmount effect here would race that existing mechanism.
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm md:items-center md:p-6"
      data-testid="inbound-discrepancy-overlay"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Đóng báo sai lệch"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        aria-labelledby="inbound-discrepancy-title"
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl border bg-card shadow-lg md:max-w-2xl md:rounded-md"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 id="inbound-discrepancy-title" className="text-base font-semibold">
              Báo sai lệch
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chỉ ghi nhận mã lý do và mã tham chiếu bằng chứng, không tải file trong bước này.
            </p>
          </div>
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-md border hover:bg-muted"
            onClick={onClose}
            aria-label="Đóng báo sai lệch"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4">
          <div
            className="mb-4 grid gap-2 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-3"
            data-testid="inbound-discrepancy-context"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground">Dòng</p>
              <p className="font-semibold">
                {selectedLine
                  ? `${selectedLine.lineNumber} - ${selectedLine.skuCode ?? selectedLine.skuId}`
                  : 'Không tìm thấy'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Dự kiến</p>
              <p className="font-semibold">
                {selectedLine
                  ? `${formatQuantity(selectedLine.expectedQuantity)} ${selectedLine.uomCode ?? ''}`.trim()
                  : 'Không có dữ liệu'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Thực nhận</p>
              <p className="font-semibold">{actualQuantityLabel}</p>
            </div>
          </div>

          <form className="space-y-3" onSubmit={onSubmit}>
            {confirmedReceiptLine?.discrepancySignals.length ? (
              <div className="break-words rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Tín hiệu:{' '}
                {confirmedReceiptLine.discrepancySignals.map(vietnameseOperationalLabel).join(', ')}
              </div>
            ) : null}
            <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-type">
              Loại sai lệch
              <select
                id="inbound-discrepancy-type"
                name="discrepancyType"
                value={discrepancyType}
                onChange={(event) =>
                  onDiscrepancyTypeChange(event.target.value as InboundDiscrepancyType)
                }
                className="min-h-10 rounded-md border bg-background px-3 py-2 text-sm"
                disabled={!confirmedReceiptLine}
              >
                {INBOUND_DISCREPANCY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {vietnameseOperationalLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <LookupSelect
              id="inbound-discrepancy-reason-code"
              name="discrepancyReasonCode"
              label="Mã lý do sai lệch"
              value={discrepancyReasonCode}
              placeholder="Chọn mã lý do"
              options={reasonCodeOptions}
              isLoading={reasonCodesLoading}
              isError={reasonCodesError}
              emptyMessage="Chưa có mã lý do khả dụng."
              errorMessage="Không tải được danh sách mã lý do."
              autoFocus
              disabled={!confirmedReceiptLine}
              onChange={onDiscrepancyReasonCodeChange}
            />
            <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-reason-note">
              Ghi chú sai lệch
              <Input
                id="inbound-discrepancy-reason-note"
                name="discrepancyReasonNote"
                value={discrepancyReasonNote}
                onChange={(event) => onDiscrepancyReasonNoteChange(event.target.value)}
                placeholder="Số lượng lệch so với ASN"
                disabled={!confirmedReceiptLine}
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-evidence-refs">
              Mã tham chiếu bằng chứng
              <Input
                id="inbound-discrepancy-evidence-refs"
                name="discrepancyEvidenceRefs"
                value={discrepancyEvidenceRefs}
                onChange={(event) => onDiscrepancyEvidenceRefsChange(event.target.value)}
                placeholder="photo://dock/over-qty-1"
                disabled={!confirmedReceiptLine}
              />
            </label>
            <TechnicalDetails testId="inbound-discrepancy-technical-details">
              <label className="grid gap-1 text-sm" htmlFor="inbound-discrepancy-idempotency-key">
                Khóa idempotency sai lệch
                <Input
                  id="inbound-discrepancy-idempotency-key"
                  name="discrepancyIdempotencyKey"
                  value={discrepancyIdempotencyKey}
                  onChange={(event) => onDiscrepancyIdempotencyKeyChange(event.target.value)}
                  disabled={!confirmedReceiptLine}
                />
              </label>
            </TechnicalDetails>
            <p
              className="break-words text-sm text-muted-foreground"
              data-testid="inbound-discrepancy-helper"
            >
              {helper}
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
        </div>
      </section>
    </div>
  );
}
