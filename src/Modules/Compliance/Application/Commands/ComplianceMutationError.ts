import { ApiError } from '@shared/Services/Http/ApiError';

/** Normalizes a mutation failure into a user-facing message. */
export function toMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
}

/** 409 CONFLICT — surfaced inline as a distinct state. */
export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'CONFLICT';
}

/** 403 FORBIDDEN — demotes the panel to read-only (no toast). */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden;
}

/**
 * BUSINESS_RULE — a lifecycle-blocked transition (missing reason/evidence/approval, or an
 * illegal `INVALID_EXCEPTION_TRANSITION`). Surfaced INLINE at the action, never a toast.
 */
export function isBlockedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'BUSINESS_RULE';
}

/** Inline message for a lifecycle-blocked transition; null for everything else. */
export function blockedMessage(error: unknown): string | null {
  return isBlockedError(error) && error instanceof ApiError ? error.message : null;
}
