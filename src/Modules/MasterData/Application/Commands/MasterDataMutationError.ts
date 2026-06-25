import { ApiError } from '@shared/Services/Http/ApiError';

/**
 * Normalizes a mutation failure into a user-facing message. `ApiError` already
 * carries the backend's normalized message (e.g. a 409 duplicate-code conflict),
 * so surface it directly; otherwise fall back to a generic message.
 */
export function toMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể lưu thay đổi. Vui lòng thử lại.';
}
