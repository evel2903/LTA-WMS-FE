import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';

export type ControlValidationCatalogViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface ControlValidationCatalogStateViewProps {
  state: Exclude<ControlValidationCatalogViewState, 'ready'>;
  errorMessage?: string;
}

export function ControlValidationCatalogStateView({
  state,
  errorMessage,
}: ControlValidationCatalogStateViewProps) {
  if (state === 'denied') {
    return (
      <Alert variant="warning" role="status" className="min-h-28 place-content-center py-10 text-center">
        <AlertTitle>Không có quyền</AlertTitle>
        <AlertDescription className="justify-items-center">
          Bạn không có quyền xem danh mục kiểm soát và xác thực.
        </AlertDescription>
      </Alert>
    );
  }
  if (state === 'error') {
    return (
      <Alert variant="destructive" role="alert" className="min-h-28 place-content-center py-10 text-center">
        <AlertTitle>Đã xảy ra lỗi</AlertTitle>
        <AlertDescription className="justify-items-center">
          {errorMessage ?? 'Không thể tải danh mục kiểm soát và xác thực.'}
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
        Chưa có bản ghi danh mục kiểm soát hoặc xác thực.
      </AlertDescription>
    </Alert>
  );
}
