import { describe, expect, it } from 'vitest';

import { nextExceptionAction } from '@modules/Compliance/Application/UseCases/NextExceptionAction';

describe('nextExceptionAction', () => {
  it('maps each state to its single legal next action', () => {
    expect(nextExceptionAction('DETECTED')).toBe('Log');
    expect(nextExceptionAction('LOGGED')).toBe('Assign');
    expect(nextExceptionAction('ASSIGNED')).toBe('Submit');
    expect(nextExceptionAction('IN_REVIEW_PENDING_APPROVAL')).toBe('Resolve');
    expect(nextExceptionAction('RESOLVED')).toBe('Close');
  });

  it('returns null for the terminal CLOSED state', () => {
    expect(nextExceptionAction('CLOSED')).toBeNull();
  });
});
