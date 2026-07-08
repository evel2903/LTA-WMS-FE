import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';

export type QueryViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface ResolveListViewStateInput {
  error: unknown;
  isLoading: boolean;
  itemCount: number;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden;
}

export function getNonForbiddenError(error: unknown): unknown {
  if (!error || isForbiddenError(error)) {
    return null;
  }
  return error;
}

export function useResilientQueryData<T>(data: T | undefined): T | undefined {
  const lastData = useRef<T | undefined>(undefined);
  if (data !== undefined) {
    lastData.current = data;
  }
  return data ?? lastData.current;
}

export function resolveListViewState({
  error,
  isLoading,
  itemCount,
}: ResolveListViewStateInput): QueryViewState {
  if (isForbiddenError(error)) {
    return 'denied';
  }
  if (isLoading && itemCount === 0) {
    return 'loading';
  }
  if (error && itemCount === 0) {
    return 'error';
  }
  if (itemCount === 0) {
    return 'empty';
  }
  return 'ready';
}

export function queryErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

interface UseQueryRowGateInput<TData extends { page: number }> {
  requestKey: string;
  isFilterSettled: boolean;
  page: number;
  data: TData | undefined;
  error: unknown;
  isFetching: boolean;
  isPlaceholderData: boolean;
}

/**
 * Gates row-open interactions on a filtered, paginated list query so a row can't be opened
 * while it may still belong to a stale filter/page combination. Stays open once either the
 * current request key has resolved, or the query already holds fresh data for the current
 * page — the latter avoids a flash-disable when nothing has actually gone stale.
 */
export function useQueryRowGate<TData extends { page: number }>({
  requestKey,
  isFilterSettled,
  page,
  data,
  error,
  isFetching,
  isPlaceholderData,
}: UseQueryRowGateInput<TData>): boolean {
  const [activeDataKey, setActiveDataKey] = useState<string | null>(null);
  const hasCurrentData = Boolean(data) && !error && !isPlaceholderData && data?.page === page;

  useEffect(() => {
    if (data && !error && !isPlaceholderData) {
      setActiveDataKey(requestKey);
    }
  }, [data, error, isPlaceholderData, requestKey]);

  return isFilterSettled && !isFetching && (activeDataKey === requestKey || hasCurrentData);
}
