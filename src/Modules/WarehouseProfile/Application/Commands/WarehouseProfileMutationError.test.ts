import { describe, expect, it } from 'vitest';

import {
  conflictMessage,
  isConflictError,
  toMutationErrorMessage,
} from '@modules/WarehouseProfile/Application/Commands/WarehouseProfileMutationError';
import { ApiError } from '@shared/Services/Http/ApiError';

function err(code: ApiError['code'], status: number, message: string): ApiError {
  return new ApiError({ status, code, message });
}

describe('toMutationErrorMessage', () => {
  it('surfaces the normalized backend message for an ApiError', () => {
    expect(toMutationErrorMessage(err('BUSINESS_RULE', 400, 'Cannot activate a retired profile.'))).toBe(
      'Cannot activate a retired profile.',
    );
  });

  it('falls back to a generic message for non-ApiError failures', () => {
    expect(toMutationErrorMessage(new Error('boom'))).toBe('boom');
    expect(toMutationErrorMessage(undefined)).toBe('Unable to save changes. Please try again.');
  });
});

describe('conflictMessage', () => {
  it('returns the message ONLY for a 409 CONFLICT, so conflict is a distinct UI state', () => {
    expect(conflictMessage(err('CONFLICT', 409, 'Overlapping active profile for this scope.'))).toBe(
      'Overlapping active profile for this scope.',
    );
  });

  it('returns null for BUSINESS_RULE / VALIDATION / FORBIDDEN (NOT lumped into the conflict state)', () => {
    expect(conflictMessage(err('BUSINESS_RULE', 400, 'bad transition'))).toBeNull();
    expect(conflictMessage(err('VALIDATION', 400, 'invalid'))).toBeNull();
    expect(conflictMessage(err('FORBIDDEN', 403, 'denied'))).toBeNull();
    expect(conflictMessage(new Error('boom'))).toBeNull();
  });
});

describe('isConflictError', () => {
  it('is true ONLY for a 409 CONFLICT', () => {
    expect(isConflictError(err('CONFLICT', 409, 'overlap'))).toBe(true);
    expect(isConflictError(err('BUSINESS_RULE', 400, 'bad transition'))).toBe(false);
    expect(isConflictError(new Error('boom'))).toBe(false);
  });
});
