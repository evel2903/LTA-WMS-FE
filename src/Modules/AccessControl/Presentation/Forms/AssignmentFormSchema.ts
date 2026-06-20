import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

/** Assign-role form: one of the six core roles. */
export const assignRoleFormSchema = z.object({
  roleCode: z.enum([
    'WMS_ADMIN',
    'WAREHOUSE_SUPERVISOR',
    'WAREHOUSE_COORDINATOR',
    'OPERATOR',
    'QC',
    'INVENTORY_ACCOUNTANT',
  ]),
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
        message: 'Không thể vừa chọn "Tất cả" vừa nhập giá trị scope',
      });
    }
    if (!values.includeAll && !hasValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeValueCode'],
        message: 'Cần chọn "Tất cả" hoặc nhập một giá trị scope',
      });
    }
  });

export type AssignDataScopeFormValues = z.infer<typeof assignDataScopeFormSchema>;
