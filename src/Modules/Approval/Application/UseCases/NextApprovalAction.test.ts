import { describe, expect, it } from 'vitest';

import { nextApprovalAction } from '@modules/Approval/Application/UseCases/NextApprovalAction';

describe('nextApprovalAction', () => {
  it('offers a decision only while PENDING', () => {
    expect(nextApprovalAction('PENDING')).toBe('Decide');
  });
  it('is terminal once decided', () => {
    expect(nextApprovalAction('APPROVED')).toBeNull();
    expect(nextApprovalAction('REJECTED')).toBeNull();
  });
});
