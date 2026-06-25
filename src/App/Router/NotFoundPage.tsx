import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-3xl font-bold">Không tìm thấy trang</h1>
      <Button asChild>
        <Link to={ROUTES.DASHBOARD}>Quay lại bảng điều khiển</Link>
      </Button>
    </div>
  );
}
