import { Outlet } from 'react-router-dom';

import { ENV } from '@app/Config/Env';

/** Centered, minimal shell for unauthenticated pages (login, forgot password). */
export function AuthLayout() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{ENV.appName}</h1>
          <p className="text-muted-foreground text-sm">Hệ thống quản lý kho</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
