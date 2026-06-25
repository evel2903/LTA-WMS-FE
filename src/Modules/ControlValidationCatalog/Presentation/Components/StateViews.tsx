import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';

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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Không có quyền</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">Bạn không có quyền xem danh mục kiểm soát và xác thực.</CardContent>
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
          {errorMessage ?? 'Không thể tải danh mục kiểm soát và xác thực.'}
        </CardContent>
      </Card>
    );
  }
  if (state === 'loading') {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-sm">Đang tải...</CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="text-muted-foreground py-10 text-sm">Chưa có bản ghi danh mục kiểm soát hoặc xác thực.</CardContent>
    </Card>
  );
}
