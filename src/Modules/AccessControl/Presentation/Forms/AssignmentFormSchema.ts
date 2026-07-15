import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

/**
 * Assign-role form: any role code (core or custom, RA-03) — the actual choice set is
 * constrained by whatever `availableRoles` the caller renders in the select, not by this
 * schema (a hand-typed closed enum here would silently reject valid custom roles).
 */
export const assignRoleFormSchema = z.object({
  roleCode: z.string().min(1, 'Cần chọn vai trò'),
});

export type AssignRoleFormValues = z.infer<typeof assignRoleFormSchema>;

/**
 * Assign-data-scope form. Either `includeAll` (unrestricted) OR a concrete value
 * (code/id) — mirrors the backend BUSINESS_RULE so validation fails fast in the UI.
 */
export const assignDataScopeFormSchema = z
  .object({
    scopeType: z.enum(['WAREHOUSE', 'ZONE', 'OWNER', 'CUSTOMER']),
    includeAll: z.boolean(),
    scopeValueCode: optionalText(100),
    scopeValueId: optionalText(36),
  })
  .superRefine((values, ctx) => {
    const hasValue = Boolean(values.scopeValueCode || values.scopeValueId);
    if (values.includeAll && hasValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeValueCode'],
        message: 'Không thể vừa chọn "Tất cả" vừa nhập giá trị phạm vi',
      });
    }
    if (!values.includeAll && !hasValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeValueCode'],
        message: 'Cần chọn "Tất cả" hoặc nhập một giá trị phạm vi',
      });
    }
  });

export type AssignDataScopeFormValues = z.infer<typeof assignDataScopeFormSchema>;
