import { ApiError } from '@shared/Services/Http/ApiError';

export function toMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Unable to save changes. Please try again.';
}

/** 409 CONFLICT (duplicate reason code) — surfaced inline at the code field. */
export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'CONFLICT';
}

export function conflictMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.code === 'CONFLICT') return error.message;
  return null;
}

/** 403 FORBIDDEN — demotes the form to read-only (no toast). */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden;
}
