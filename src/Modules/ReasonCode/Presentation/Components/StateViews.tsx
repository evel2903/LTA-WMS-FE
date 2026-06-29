import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';

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
      <Alert variant="warning" role="status" className="min-h-28 place-content-center py-10 text-center">
        <AlertTitle>Không có quyền</AlertTitle>
        <AlertDescription className="justify-items-center">
          Bạn không có quyền xem hoặc quản trị mã lý do.
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
