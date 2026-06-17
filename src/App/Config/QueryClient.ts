import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@shared/Services/Http/ApiError';

/**
 * Single shared QueryClient. Server-state defaults live here so individual
 * queries stay declarative. Do NOT put client/UI state in TanStack Query —
 * that belongs in Zustand stores.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry auth / client errors; retry transient server errors twice.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
