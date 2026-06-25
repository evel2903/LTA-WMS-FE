import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

export type FoundationOverviewViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface FoundationOverviewStateViewProps {
  state: Exclude<FoundationOverviewViewState, 'ready'>;
  errorMessage?: string;
}

export function FoundationOverviewStateView({
  state,
  errorMessage,
}: FoundationOverviewStateViewProps) {
  if (state === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Không có quyền</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">Bạn không có quyền xem mức sẵn sàng nền tảng trong phạm vi hiện tại.</CardContent>
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
          {errorMessage ?? 'Không thể tải mức sẵn sàng nền tảng.'}
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
      <CardContent className="text-muted-foreground py-10 text-sm">Không có dữ liệu nền tảng nào hiển thị trong phạm vi hiện tại.</CardContent>
    </Card>
  );
}

export function NoDataScopeWarning({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {message}
    </div>
  );
}
