import { describe, expect, it } from 'vitest';

import {
  approvalDecisionSchema,
  parseEvidenceRefs,
} from '@modules/Approval/Presentation/Forms/ApprovalDecisionSchema';

describe('approvalDecisionSchema', () => {
  it('accepts an empty decision (reason is optional)', () => {
    const parsed = approvalDecisionSchema.safeParse({ reasonCode: '', reasonNote: '', evidenceRefs: '' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reasonCode).toBeUndefined();
  });
  it('accepts a reason code + note', () => {
    expect(
      approvalDecisionSchema.safeParse({ reasonCode: 'RC-APPROVE', reasonNote: 'looks good' }).success,
    ).toBe(true);
  });
  it('rejects an over-long reason code', () => {
    expect(approvalDecisionSchema.safeParse({ reasonCode: 'x'.repeat(61) }).success).toBe(false);
  });
});

describe('parseEvidenceRefs', () => {
  it('splits a comma list into trimmed refs', () => {
    expect(parseEvidenceRefs('doc-1, doc-2 ,doc-3')).toEqual(['doc-1', 'doc-2', 'doc-3']);
  });
  it('returns undefined for empty/blank input', () => {
    expect(parseEvidenceRefs('')).toBeUndefined();
    expect(parseEvidenceRefs(undefined)).toBeUndefined();
    expect(parseEvidenceRefs('  ,  ')).toBeUndefined();
  });
});
