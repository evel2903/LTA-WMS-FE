import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';

export type ComplianceViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface ComplianceStateViewProps {
  state: Exclude<ComplianceViewState, 'ready'>;
  emptyLabel?: string;
  errorMessage?: string;
}

/** Distinct, non-overlapping UI states (AC4): loading / empty / error / permission-denied. */
export function ComplianceStateView({ state, emptyLabel, errorMessage }: ComplianceStateViewProps) {
  if (state === 'denied') {
    return (
      <Alert variant="warning" role="status" className="min-h-28 place-content-center py-10 text-center">
        <AlertTitle>Không có quyền</AlertTitle>
        <AlertDescription className="justify-items-center">
          Bạn không có quyền xem tài nguyên này trong phạm vi hiện tại.
        </AlertDescription>
      </Alert>
    );
  }

  if (state === 'error') {
    return (
      <Alert variant="destructive" role="alert" className="min-h-28 place-content-center py-10 text-center">
        <AlertTitle>Đã xảy ra lỗi</AlertTitle>
        <AlertDescription className="justify-items-center">
          {errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (state === 'loading') {
    return (
      <Alert variant="info" role="status" className="min-h-28 place-content-center py-10 text-center">
        <AlertDescription className="justify-items-center">Đang tải...</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="info" role="status" className="min-h-28 place-content-center py-10 text-center">
      <AlertDescription className="justify-items-center">{emptyLabel ?? 'Chưa có bản ghi.'}</AlertDescription>
    </Alert>
  );
}

/** Read-only JSON viewer for audit before/after snapshots (no editor — V0). */
export function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 grid gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <pre className="bg-muted max-h-60 max-w-full overflow-auto rounded-md p-2 text-xs whitespace-pre-wrap break-words">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  );
}
