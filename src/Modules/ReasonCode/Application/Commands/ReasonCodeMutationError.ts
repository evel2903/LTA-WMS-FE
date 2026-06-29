import { ApiError } from '@shared/Services/Http/ApiError';

function toUserFacingApiMessage(error: ApiError): string {
  const duplicate = /^Reason code already exists(?::\s*(.+))?$/i.exec(error.message.trim());
  if (duplicate) {
    return duplicate[1] ? `Mã lý do đã tồn tại: ${duplicate[1]}` : 'Mã lý do đã tồn tại.';
  }
  return error.message;
}

export function toMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return toUserFacingApiMessage(error);
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể lưu thay đổi. Vui lòng thử lại.';
}

/** 409 CONFLICT (duplicate reason code) — surfaced inline at the code field. */
export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'CONFLICT';
}

export function conflictMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.code === 'CONFLICT') return toMutationErrorMessage(error);
  return null;
}

/** 403 FORBIDDEN — demotes the form to read-only (no toast). */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.isForbidden;
}
