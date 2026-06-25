import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type AccessViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface AccessStateViewProps {
  state: Exclude<AccessViewState, 'ready'>;
  emptyLabel?: string;
  errorMessage?: string;
}

/**
 * Distinct, non-overlapping UI states (AC3): loading / empty / error /
 * permission-denied. The backend (403) is the source of truth for permission —
 * the FE never invents one.
 */
export function AccessStateView({ state, emptyLabel, errorMessage }: AccessStateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Không có quyền</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">Bạn không có quyền xem hoặc quản trị tài nguyên này.</CardContent>
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
        <CardContent className="text-muted-foreground py-10 text-sm">Loading…</CardContent>
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
