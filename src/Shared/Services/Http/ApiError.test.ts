import { describe, expect, it } from 'vitest';

import { ApiError } from './ApiError';

describe('ApiError', () => {
  it('falls back to Vietnamese copy when backend message is missing or blank', () => {
    expect(ApiError.fromBody(500).message).toBe('Đã xảy ra lỗi không mong muốn.');
    expect(ApiError.fromBody(500, { Errors: [{ Code: 'UNKNOWN', Message: '' }] }).message).toBe(
      'Đã xảy ra lỗi không mong muốn.',
    );
    expect(ApiError.fromBody(500, { Errors: [{ Code: 'UNKNOWN', Message: '   ' }] }).message).toBe(
      'Đã xảy ra lỗi không mong muốn.',
    );
  });

  it('keeps backend message when it is present', () => {
    expect(ApiError.fromBody(409, { Errors: [{ Code: 'CONFLICT', Message: 'Trùng mã.' }] }).message).toBe(
      'Trùng mã.',
    );
  });
});
