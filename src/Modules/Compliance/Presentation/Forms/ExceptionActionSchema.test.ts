import { describe, expect, it } from 'vitest';

import {
  assignExceptionSchema,
  parseEvidenceRefs,
} from '@modules/Compliance/Presentation/Forms/ExceptionActionSchema';

describe('assignExceptionSchema', () => {
  it('rejects when neither user nor role is provided', () => {
    expect(
      assignExceptionSchema.safeParse({ assignedToUserId: '', assignedRoleId: '', ownerId: '' }).success,
    ).toBe(false);
  });
  it('accepts with a user id', () => {
    expect(assignExceptionSchema.safeParse({ assignedToUserId: 'u1' }).success).toBe(true);
  });
  it('accepts with a role id', () => {
    expect(assignExceptionSchema.safeParse({ assignedRoleId: 'r1' }).success).toBe(true);
  });
});

describe('parseEvidenceRefs', () => {
  it('splits a comma-separated string into a trimmed array', () => {
    expect(parseEvidenceRefs('a, b ,c')).toEqual(['a', 'b', 'c']);
  });
  it('returns undefined for empty / whitespace-only input', () => {
    expect(parseEvidenceRefs('')).toBeUndefined();
    expect(parseEvidenceRefs(' , ')).toBeUndefined();
    expect(parseEvidenceRefs(undefined)).toBeUndefined();
  });
});
