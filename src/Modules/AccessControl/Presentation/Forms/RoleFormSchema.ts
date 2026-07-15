import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

/**
 * Create-role form (RA-03). Server normalizes `role_code` to uppercase and validates
 * `^[A-Z][A-Z0-9_]{1,49}$` (RA-01) — client only checks non-empty/length, letting the
 * backend's 400 surface inline via the form's `error` prop instead of duplicating the regex.
 */
export const createRoleFormSchema = z.object({
  roleCode: z.string().trim().min(1, 'Cần mã vai trò').max(50),
  roleName: z.string().trim().min(1, 'Cần tên vai trò').max(255),
  description: optionalText(500),
});

export type CreateRoleFormValues = z.infer<typeof createRoleFormSchema>;
