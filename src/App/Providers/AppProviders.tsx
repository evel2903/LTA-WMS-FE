import { type PropsWithChildren, useState } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ENV } from '@app/Config/Env';
import { createQueryClient } from '@app/Config/QueryClient';
import { ErrorBoundary } from '@shared/Components/Feedback/ErrorBoundary';
import { ThemeProvider } from '@app/Providers/ThemeProvider';
import { Toaster } from '@shared/Components/Ui/Sonner';

/**
 * Global provider stack. Order matters: error boundary outermost, then theme,
 * then server-state provider. Each provider has a single responsibility.
 */
export function AppProviders({ children }: PropsWithChildren) {
  // useState ensures one client instance survives Fast Refresh / re-renders.
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="lta-wms-theme">
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors position="top-right" />
          {!ENV.isProduction && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
