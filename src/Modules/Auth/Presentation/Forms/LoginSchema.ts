import { z } from 'zod';

/**
 * Zod schema is the single source of truth for the login form. The form's
 * TypeScript type is *inferred* from it — no separate interface to drift.
 * Matches `POST /auth/login` ({ EmailAddress, Password }).
 */
export const loginSchema = z.object({
  emailAddress: z.string().min(1, 'Email là bắt buộc').email('Nhập email hợp lệ').max(255),
  password: z.string().min(1, 'Mật khẩu là bắt buộc').max(255),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
