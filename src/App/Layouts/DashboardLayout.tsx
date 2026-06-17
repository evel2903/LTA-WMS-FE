import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from '@app/Layouts/Components/Sidebar';
import { Topbar } from '@app/Layouts/Components/Topbar';
import { PageSpinner } from '@shared/Components/Feedback/Spinner';

/**
 * Primary authenticated shell: fixed sidebar + topbar + scrollable content.
 * Route content streams into the <Outlet>; Suspense covers lazy module chunks.
 */
export function DashboardLayout() {
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
