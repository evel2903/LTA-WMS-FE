import { ApiError } from '@shared/Services/Http/ApiError';

/**
 * Normalizes a mutation failure into a user-facing message. `ApiError` already
 * carries the backend's normalized message (validation / business-rule /
 * conflict / forbidden), so surface it directly; otherwise fall back generic.
 */
export function toMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể lưu thay đổi. Vui lòng thử lại.';
}

/**
 * Extracts the inline message for a 409 CONFLICT (overlap / serious conflict on
 * activate) so the UI can surface it as a DISTINCT conflict state — not lumped
 * into the generic error toast (AC5). Returns null for every other failure
 * (BUSINESS_RULE / VALIDATION / FORBIDDEN keep their own handling).
 */
export function conflictMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.code === 'CONFLICT') return error.message;
  return null;
}

/** True for a 409 CONFLICT — the lifecycle UI owns this as a distinct state (AC5). */
export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'CONFLICT';
}
