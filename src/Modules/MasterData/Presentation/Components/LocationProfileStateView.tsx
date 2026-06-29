import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';

export type LocationProfileViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface LocationProfileStateViewProps {
  state: Exclude<LocationProfileViewState, 'ready'>;
  errorMessage?: string;
}

export function LocationProfileStateView({ state, errorMessage }: LocationProfileStateViewProps) {
  const variant =
    state === 'denied' || state === 'empty'
      ? 'warning'
      : state === 'error'
        ? 'destructive'
        : 'info';
  const title =
    state === 'denied'
      ? 'Không có quyền'
      : state === 'error'
        ? 'Không thể tải hồ sơ vị trí'
        : state === 'loading'
          ? 'Đang tải hồ sơ vị trí'
          : 'Chưa có hồ sơ vị trí';
  const message =
    state === 'denied'
      ? 'Bạn không có quyền xem hồ sơ vị trí trong phạm vi này.'
      : state === 'error'
        ? (errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.')
        : state === 'loading'
          ? 'Đang tải hồ sơ vị trí...'
          : 'Không có hồ sơ vị trí phù hợp với bộ lọc hiện tại.';

  return (
    <div className="py-8">
      <Alert role={state === 'error' ? 'alert' : 'status'} variant={variant}>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
