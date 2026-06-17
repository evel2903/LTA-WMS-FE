import { z } from 'zod';

/**
 * Single source of truth for the register form. Matches `POST /auth/register`
 * constraints: names ≤ 100, email valid ≤ 255, password ≤ 255, all required.
 */
export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  emailAddress: z.string().min(1, 'Email is required').email('Enter a valid email').max(255),
  password: z.string().min(6, 'At least 6 characters').max(255),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
