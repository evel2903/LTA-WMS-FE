import { z } from 'zod';

/**
 * Single source of truth for the register form. Matches `POST /auth/register`
 * constraints: names ≤ 100, email valid ≤ 255, password ≤ 255, all required.
 */
export const registerSchema = z.object({
  firstName: z.string().min(1, 'Tên là bắt buộc').max(100),
  lastName: z.string().min(1, 'Họ là bắt buộc').max(100),
  emailAddress: z.string().min(1, 'Email là bắt buộc').email('Nhập email hợp lệ').max(255),
  password: z.string().min(6, 'Tối thiểu 6 ký tự').max(255),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
