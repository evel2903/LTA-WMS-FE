import { ApiError } from '@shared/Services/Http/ApiError';

/**
 * Extracts the inline message for a 409 conflict (e.g. a duplicate code) so a
 * page can surface it next to the offending field (AC3). Returns null for any
 * other failure, which keeps the global toast as the sole handler for those.
 */
export function conflictMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.code === 'CONFLICT') return error.message;
  return null;
}
