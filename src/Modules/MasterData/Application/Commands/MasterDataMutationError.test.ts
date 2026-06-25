import { describe, expect, it } from 'vitest';

import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { ApiError } from '@shared/Services/Http/ApiError';

describe('toMutationErrorMessage', () => {
  it('surfaces the normalized backend message for an ApiError (e.g. duplicate code 409)', () => {
    const conflict = new ApiError({
      status: 409,
      code: 'CONFLICT',
      message: 'Site code already exists.',
    });
    expect(toMutationErrorMessage(conflict)).toBe('Site code already exists.');
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(toMutationErrorMessage(new Error('boom'))).toBe('boom');
    expect(toMutationErrorMessage(undefined)).toBe('Không thể lưu thay đổi. Vui lòng thử lại.');
    expect(toMutationErrorMessage('weird')).toBe('Không thể lưu thay đổi. Vui lòng thử lại.');
  });
});
