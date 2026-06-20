import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

/** Assign requires at least one of assignedToUserId / assignedRoleId (mirrors BE guard). */
export const assignExceptionSchema = z
  .object({
    assignedToUserId: optionalText(36),
    assignedRoleId: optionalText(36),
    ownerId: optionalText(36),
  })
  .superRefine((values, ctx) => {
    if (!values.assignedToUserId && !values.assignedRoleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['assignedToUserId'],
        message: 'Cần assignedToUserId hoặc assignedRoleId',
      });
    }
  });

export type AssignExceptionFormValues = z.infer<typeof assignExceptionSchema>;

export const submitExceptionSchema = z.object({
  requireApproval: z.boolean(),
  reasonCode: optionalText(60),
  reasonNote: optionalText(1000),
});

export type SubmitExceptionFormValues = z.infer<typeof submitExceptionSchema>;

export const resolveExceptionSchema = z.object({
  reasonCode: optionalText(60),
  resolutionNote: optionalText(1000),
  /** Comma-separated evidence references; split into an array on submit. */
  evidenceRefs: optionalText(500),
});

export type ResolveExceptionFormValues = z.infer<typeof resolveExceptionSchema>;

/** Splits the comma-separated evidence field into a trimmed string[] (undefined when empty). */
export function parseEvidenceRefs(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const refs = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return refs.length > 0 ? refs : undefined;
}
