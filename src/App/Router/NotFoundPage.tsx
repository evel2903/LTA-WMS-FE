import { Link } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Button asChild>
        <Link to={ROUTES.DASHBOARD}>Back to dashboard</Link>
      </Button>
    </div>
  );
}
