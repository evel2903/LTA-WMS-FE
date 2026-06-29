import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';

export type ProfileViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface ProfileStateViewProps {
  state: Exclude<ProfileViewState, 'ready'>;
  /** Empty-state copy when there is no data but the user has access. */
  emptyLabel?: string;
  /** Error message shown in the error state. */
  errorMessage?: string;
}

const STATE_ALERT_CLASS_NAME = 'min-h-28 place-content-center py-10 text-center';

/**
 * Distinct, non-overlapping UI states (AC5): loading / empty / error /
 * permission-denied. Conflict is a separate state owned by lifecycle actions and
 * the preview panel, not here, so it is never lumped into the generic error.
 */
export function ProfileStateView({ state, emptyLabel, errorMessage }: ProfileStateViewProps) {
  if (state === 'denied') {
    return (
      <Alert variant="warning" role="status" className={STATE_ALERT_CLASS_NAME}>
        <AlertTitle>Không có quyền</AlertTitle>
        <AlertDescription className="justify-items-center">
          Bạn không có quyền xem tài nguyên này trong phạm vi hiện tại.
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
