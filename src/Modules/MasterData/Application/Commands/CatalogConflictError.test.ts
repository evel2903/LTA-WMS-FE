import { describe, expect, it } from 'vitest';

import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { ApiError } from '@shared/Services/Http/ApiError';

describe('conflictMessage', () => {
  it('returns the message for an ApiError with code CONFLICT', () => {
    const conflict = new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'Owner code already exists',
    });
    expect(conflictMessage(conflict)).toBe('Owner code already exists');
  });

  it('returns null for an ApiError with a non-conflict code', () => {
    const validation = new ApiError({
      status: 400,
      code: 'VALIDATION',
      message: 'Invalid payload',
    });
    expect(conflictMessage(validation)).toBeNull();
  });

  it('returns null for a plain Error and undefined', () => {
    expect(conflictMessage(new Error('boom'))).toBeNull();
    expect(conflictMessage(undefined)).toBeNull();
    expect(conflictMessage('weird')).toBeNull();
  });
});
