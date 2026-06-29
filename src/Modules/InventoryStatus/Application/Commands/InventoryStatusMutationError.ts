import { ApiError } from '@shared/Services/Http/ApiError';

const API_MESSAGE_VI: Record<string, string> = {
  'Reason code is required for this change.': 'Cần mã lý do cho thay đổi này.',
};

function toUserFacingApiMessage(error: ApiError): string {
  return API_MESSAGE_VI[error.message.trim()] ?? error.message;
}

export function toMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return toUserFacingApiMessage(error);
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể lưu thay đổi. Vui lòng thử lại.';
}

/** 403 FORBIDDEN — demotes the form to read-only (no toast). */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden;
}

/**
 * Errors surfaced inline at the form rather than as a toast: a missing/invalid reason code
 * (ownership policy → BUSINESS_RULE), request validation (VALIDATION), or a concurrency
 * conflict (CONFLICT). Single-surface: the notifier skips these and the form shows them.
 */
export function isInlineError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === 'BUSINESS_RULE' || error.code === 'VALIDATION' || error.code === 'CONFLICT')
  );
}

export function inlineMessage(error: unknown): string | null {
  return isInlineError(error) ? toMutationErrorMessage(error) : null;
}
