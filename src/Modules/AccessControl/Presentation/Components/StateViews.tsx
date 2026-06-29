import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';

export type AccessViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface AccessStateViewProps {
  state: Exclude<AccessViewState, 'ready'>;
  emptyLabel?: string;
  errorMessage?: string;
}

const STATE_ALERT_CLASS_NAME = 'min-h-28 place-content-center py-10 text-center';

/**
 * Distinct, non-overlapping UI states (AC3): loading / empty / error /
 * permission-denied. The backend (403) is the source of truth for permission —
 * the FE never invents one.
 */
export function AccessStateView({ state, emptyLabel, errorMessage }: AccessStateViewProps) {
  if (state === 'denied') {
    return (
      <Alert variant="warning" role="status" className={STATE_ALERT_CLASS_NAME}>
        <AlertTitle>Không có quyền</AlertTitle>
        <AlertDescription className="justify-items-center">
          Bạn không có quyền xem hoặc quản trị tài nguyên này.
        </AlertDescription>
      </Alert>
    );
  }

  if (state === 'error') {
    return (
      <Alert variant="destructive" role="alert" className={STATE_ALERT_CLASS_NAME}>
        <AlertTitle>Đã xảy ra lỗi</AlertTitle>
        <AlertDescription className="justify-items-center">
          {errorMessage ?? 'Đã xảy ra lỗi API không mong muốn.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (state === 'loading') {
    return (
      <Alert variant="info" role="status" className={STATE_ALERT_CLASS_NAME}>
        <AlertDescription className="justify-items-center">Đang tải...</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="info" role="status" className={STATE_ALERT_CLASS_NAME}>
      <AlertDescription className="justify-items-center">{emptyLabel ?? 'Chưa có bản ghi.'}</AlertDescription>
    </Alert>
  );
}
