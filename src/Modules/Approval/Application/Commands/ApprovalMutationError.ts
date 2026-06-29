import { ApiError } from '@shared/Services/Http/ApiError';

const API_MESSAGE_VI: Record<string, string> = {
  'Request already decided': 'Yêu cầu đã được quyết định',
};

function toUserFacingApiMessage(error: ApiError): string {
  return API_MESSAGE_VI[error.message.trim()] ?? error.message;
}

/** Normalizes a mutation failure into a user-facing message. */
export function toMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return toUserFacingApiMessage(error);
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể hoàn tất quyết định. Vui lòng thử lại.';
}

/** 403 FORBIDDEN — self-approval / permission / out-of-scope. Demotes the panel to read-only. */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden;
}

/**
 * BUSINESS_RULE — a blocked decision: already-decided ("Request already decided") or a
 * missing/invalid reason / evidence-required. Surfaced INLINE at the action, never a toast.
 */
export function isBlockedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'BUSINESS_RULE';
}

/** Inline message for a blocked decision; null for everything else. */
export function blockedMessage(error: unknown): string | null {
  return isBlockedError(error) && error instanceof ApiError ? toMutationErrorMessage(error) : null;
}
