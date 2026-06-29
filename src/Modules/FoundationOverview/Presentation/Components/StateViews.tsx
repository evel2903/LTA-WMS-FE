import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';

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
      <Alert variant="warning" role="status" className="min-h-28 place-content-center py-10 text-center">
        <AlertTitle>Không có quyền</AlertTitle>
        <AlertDescription className="justify-items-center">
          Bạn không có quyền xem mức sẵn sàng nền tảng trong phạm vi hiện tại.
        </AlertDescription>
      </Alert>
    );
  }
  if (state === 'error') {
    return (
      <Alert variant="destructive" role="alert" className="min-h-28 place-content-center py-10 text-center">
        <AlertTitle>Đã xảy ra lỗi</AlertTitle>
        <AlertDescription className="justify-items-center">
          {errorMessage ?? 'Không thể tải mức sẵn sàng nền tảng.'}
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
      <AlertDescription className="justify-items-center">
        Không có dữ liệu nền tảng nào hiển thị trong phạm vi hiện tại.
      </AlertDescription>
    </Alert>
  );
}

export function NoDataScopeWarning({ message }: { message: string }) {
  return (
    <Alert variant="warning" role="status">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
