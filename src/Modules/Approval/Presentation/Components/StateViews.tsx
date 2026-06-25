import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type ApprovalViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface ApprovalStateViewProps {
  state: Exclude<ApprovalViewState, 'ready'>;
  emptyLabel?: string;
  errorMessage?: string;
}

/** Distinct, non-overlapping UI states (AC4): loading / empty / error / permission-denied. */
export function ApprovalStateView({ state, emptyLabel, errorMessage }: ApprovalStateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Không có quyền</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">Bạn không có quyền xem yêu cầu phê duyệt trong phạm vi hiện tại.</CardContent>
      </Card>
    );
  }
  if (state === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đã xảy ra lỗi</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive text-sm">
          {errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.'}
        </CardContent>
      </Card>
    );
  }
  if (state === 'loading') {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-sm">Đang tải…</CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-sm">
        {emptyLabel ?? 'Chưa có bản ghi.'}
      </CardContent>
    </Card>
  );
}

/** Read-only JSON viewer for the request scope / evidence refs (no editor — V0). */
export function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <pre className="bg-muted max-h-60 overflow-auto rounded-md p-2 text-xs">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  );
}
