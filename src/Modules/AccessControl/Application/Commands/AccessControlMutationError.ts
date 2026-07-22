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

export interface RoleMetadataStaleDetails {
  Reason: 'ROLE_METADATA_STALE';
  CurrentUpdatedAt: string;
}

/** Narrow discriminator for RH-CON-01 metadata conflicts; generic 409s are unrelated. */
export function roleMetadataStaleDetails(error: unknown): RoleMetadataStaleDetails | null {
  if (!(error instanceof ApiError) || error.status !== 409 || error.code !== 'CONFLICT') return null;
  const details = error.details as Partial<RoleMetadataStaleDetails> | undefined;
  if (
    details?.Reason !== 'ROLE_METADATA_STALE' ||
    typeof details.CurrentUpdatedAt !== 'string' ||
    Number.isNaN(Date.parse(details.CurrentUpdatedAt))
  ) {
    return null;
  }
  return { Reason: details.Reason, CurrentUpdatedAt: details.CurrentUpdatedAt };
}

/**
 * True for ANY HTTP 400 — createRole surfaces this inline, not toasted. Deliberately
 * status-based, not `code === 'VALIDATION'`: the real role_code format check throws BE's
 * `BusinessRuleException` (code `BUSINESS_RULE`), not a class-validator `VALIDATION` 400.
 */
export function isBadRequestError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400;
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
