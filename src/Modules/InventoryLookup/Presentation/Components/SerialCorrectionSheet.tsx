import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Pencil, X } from 'lucide-react';

import { Input } from '@shared/Components/Ui/Input';
import { LookupSelect } from '@shared/Components/Ui/LookupSelect';
import { useReasonCodeOptions } from '@modules/ReasonCode/Application/Queries/UseReasonCodeOptions';
import { useCorrectSerialNumber } from '@modules/InventoryLookup/Application/Commands/UseCorrectSerialNumber';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import type { InventorySerialLookupItem } from '@modules/InventoryLookup/Domain/Entities/InventorySerialLookupItem';

interface SerialCorrectionSheetProps {
  item: InventorySerialLookupItem;
  onClose: () => void;
}

function hasEvidenceRef(value: string) {
  return (
    value
      .split(',')
      .map((ref) => ref.trim())
      .filter(Boolean).length > 0
  );
}

/**
 * Reset-on-item-change is handled by the parent mounting this with
 * `key={item.dimensionId}` — a fresh instance means fresh useState, no manual
 * reset effect needed (matches the IFB-10 InboundDiscrepancySheet focus-trap
 * shape otherwise, but that page lifts form state up; this one is self-contained
 * since it's the only form the InventoryLookup module has).
 */
export function SerialCorrectionSheet({ item, onClose }: SerialCorrectionSheetProps) {
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => `serial-correction-${Date.now()}`);
  const {
    options: reasonCodeOptions,
    isLoading: reasonCodesLoading,
    isError: reasonCodesError,
  } = useReasonCodeOptions({ action: 'Adjust', objectType: 'InventoryMovement' });
  const correctSerialNumber = useCorrectSerialNumber();
  const dialogRef = useRef<HTMLElement>(null);
  // Captured at render time (before this component's own autoFocus commits) so
  // closing restores focus to whatever triggered the sheet — the "Sửa serial"
  // button, which (unlike IFB-10's route-triggered InboundDiscrepancySheet)
  // stays mounted the whole time since this sheet opens via local state, not
  // navigation.
  const triggerElementRef = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

  useEffect(() => {
    const triggerElement = triggerElementRef.current;
    return () => {
      triggerElement?.focus();
    };
  }, []);

  const currentSerialLabel = item.serialNumber || '(chưa có)';
  const trimmedNewSerial = newSerialNumber.trim();
  const isSameSerial = trimmedNewSerial !== '' && trimmedNewSerial === (item.serialNumber ?? '');
  const canSubmit =
    Boolean(trimmedNewSerial) &&
    !isSameSerial &&
    Boolean(reasonCode.trim()) &&
    hasEvidenceRef(evidenceRefs) &&
    Boolean(idempotencyKey.trim()) &&
    !correctSerialNumber.isPending;

  function getHelper() {
    if (correctSerialNumber.isPending) return 'Đang gửi yêu cầu sửa serial.';
    if (!trimmedNewSerial) return 'Nhập số serial mới.';
    if (isSameSerial) return 'Số serial mới phải khác số hiện tại.';
    if (!reasonCode.trim()) return 'Chọn mã lý do.';
    if (!hasEvidenceRef(evidenceRefs)) return 'Nhập tham chiếu bằng chứng.';
    if (!idempotencyKey.trim()) return 'Cần khóa idempotency.';
    return 'Sẵn sàng gửi yêu cầu sửa serial.';
  }

  useEffect(() => {
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
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    correctSerialNumber.mutate(
      {
        dimensionId: item.dimensionId,
        newSerialNumber: trimmedNewSerial,
        reasonCode: reasonCode.trim(),
        evidenceRefs: evidenceRefs
          .split(',')
          .map((ref) => ref.trim())
          .filter(Boolean),
        idempotencyKey: idempotencyKey.trim(),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm md:items-center md:p-6"
      data-testid="serial-correction-overlay"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Đóng sửa serial"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        aria-labelledby="serial-correction-title"
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl border bg-card shadow-lg md:max-w-lg md:rounded-md"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 id="serial-correction-title" className="text-base font-semibold">
              Sửa serial
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.skuCode} — {item.warehouseCode} / {item.locationCode}
            </p>
          </div>
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-md border hover:bg-muted"
            onClick={onClose}
            aria-label="Đóng sửa serial"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm" htmlFor="serial-correction-current">
              Serial hiện tại
              <Input id="serial-correction-current" value={currentSerialLabel} disabled readOnly />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="serial-correction-new-serial">
              Serial mới
              <Input
                id="serial-correction-new-serial"
                value={newSerialNumber}
                onChange={(event) => setNewSerialNumber(event.target.value)}
                placeholder="SN-CORRECTED-0001"
                autoFocus
              />
            </label>
            <LookupSelect
              id="serial-correction-reason-code"
              name="reasonCode"
              label="Mã lý do"
              value={reasonCode}
              placeholder="Chọn mã lý do"
              options={reasonCodeOptions}
              isLoading={reasonCodesLoading}
              isError={reasonCodesError}
              emptyMessage="Chưa có mã lý do khả dụng."
              errorMessage="Không tải được danh sách mã lý do."
              onChange={setReasonCode}
            />
            <label className="grid gap-1 text-sm" htmlFor="serial-correction-evidence-refs">
              Mã tham chiếu bằng chứng
              <Input
                id="serial-correction-evidence-refs"
                value={evidenceRefs}
                onChange={(event) => setEvidenceRefs(event.target.value)}
                placeholder="photo://label-corrected-1"
              />
            </label>
            <label className="grid gap-1 text-sm" htmlFor="serial-correction-idempotency-key">
              Khóa idempotency
              <Input
                id="serial-correction-idempotency-key"
                value={idempotencyKey}
                onChange={(event) => setIdempotencyKey(event.target.value)}
              />
            </label>
            <p className="break-words text-sm text-muted-foreground" data-testid="serial-correction-helper">
              {getHelper()}
            </p>
            <button
              type="submit"
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit}
            >
              <Pencil className="size-4" />
              Gửi yêu cầu sửa serial
            </button>
            {correctSerialNumber.isError ? (
              <p className="text-sm text-destructive">{toMutationErrorMessage(correctSerialNumber.error)}</p>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  );
}
