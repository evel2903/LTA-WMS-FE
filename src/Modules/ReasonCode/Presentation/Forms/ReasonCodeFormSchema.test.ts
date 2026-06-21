import { describe, expect, it } from 'vitest';

import {
  reasonCodeFormSchema,
  type ReasonCodeFormValues,
} from '@modules/ReasonCode/Presentation/Forms/ReasonCodeFormSchema';

const base: ReasonCodeFormValues = {
  reasonCode: 'RC-X',
  reasonGroup: 'MANUAL_FIX',
  description: '',
  appliesToActions: ['Update'],
  appliesToObjects: ['SKU'],
  evidenceRequired: false,
  approvalRequired: false,
  allowedRoleCodes: [],
  status: 'ACTIVE',
  effectiveFrom: '',
  effectiveTo: '',
};

describe('reasonCodeFormSchema', () => {
  it('accepts a valid payload', () => {
    expect(reasonCodeFormSchema.safeParse(base).success).toBe(true);
  });
  it('rejects empty appliesToActions', () => {
    expect(reasonCodeFormSchema.safeParse({ ...base, appliesToActions: [] }).success).toBe(false);
  });
  it('rejects empty appliesToObjects', () => {
    expect(reasonCodeFormSchema.safeParse({ ...base, appliesToObjects: [] }).success).toBe(false);
  });
  it('rejects effectiveTo not after effectiveFrom', () => {
    const result = reasonCodeFormSchema.safeParse({
      ...base,
      effectiveFrom: '2026-06-21',
      effectiveTo: '2026-06-20',
    });
    expect(result.success).toBe(false);
  });
  it('requires a non-empty reason code', () => {
    expect(reasonCodeFormSchema.safeParse({ ...base, reasonCode: '' }).success).toBe(false);
  });
});
