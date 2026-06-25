export type LocationProfileViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface LocationProfileStateViewProps {
  state: Exclude<LocationProfileViewState, 'ready'>;
  errorMessage?: string;
}

export function LocationProfileStateView({ state, errorMessage }: LocationProfileStateViewProps) {
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
    <div className="space-y-2 py-10">
      <h2 className="text-base font-medium">{title}</h2>
      <p
        className={state === 'error' ? 'text-destructive text-sm' : 'text-muted-foreground text-sm'}
      >
        {message}
      </p>
    </div>
  );
}
