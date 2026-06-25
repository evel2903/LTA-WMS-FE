import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type ReasonCodeViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface StateViewProps {
  state: Exclude<ReasonCodeViewState, 'ready'>;
  emptyLabel?: string;
  errorMessage?: string;
}

/** Distinct, non-overlapping UI states (AC4): loading / empty / error / permission-denied. */
export function ReasonCodeStateView({ state, emptyLabel, errorMessage }: StateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Không có quyền</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">Bạn không có quyền xem hoặc quản trị mã lý do.</CardContent>
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
