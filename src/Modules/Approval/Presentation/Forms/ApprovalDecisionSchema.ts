import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

/**
 * Decision form for approve/reject. All fields optional — the BE only requires a reason/evidence
 * when the supplied reason code demands it (validated server-side), and surfaces a missing
 * reason/evidence as a BUSINESS_RULE rendered inline.
 */
export const approvalDecisionSchema = z.object({
  reasonCode: optionalText(60),
  reasonNote: optionalText(1000),
  /** Comma-separated evidence references; split into an array on submit. */
  evidenceRefs: optionalText(500),
});

export type ApprovalDecisionFormValues = z.infer<typeof approvalDecisionSchema>;

/** Splits the comma-separated evidence field into a trimmed string[] (undefined when empty). */
export function parseEvidenceRefs(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const refs = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return refs.length > 0 ? refs : undefined;
}
