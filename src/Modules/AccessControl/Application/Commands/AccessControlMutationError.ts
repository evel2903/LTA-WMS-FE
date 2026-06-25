import { ApiError } from '@shared/Services/Http/ApiError';

/** Normalizes a mutation failure into a user-facing message. */
export function toMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể lưu thay đổi. Vui lòng thử lại.';
}

/** True for a 409 CONFLICT — the assignment UI owns this as a distinct inline state. */
export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'CONFLICT';
}

/** True for a 403 FORBIDDEN — the page demotes to read-only (no toast) instead. */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden;
}

/** Inline message for a 409 CONFLICT; null for every other failure. */
export function conflictMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.code === 'CONFLICT') return error.message;
  return null;
}
