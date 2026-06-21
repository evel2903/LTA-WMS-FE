import { useRef } from 'react';

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
