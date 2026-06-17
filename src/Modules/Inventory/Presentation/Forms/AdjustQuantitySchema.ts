import { z } from 'zod';

/** Validation contract for the stock-adjustment form. */
export const adjustQuantitySchema = z.object({
  delta: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .int('Whole units only')
    .refine((n) => n !== 0, 'Adjustment cannot be zero'),
  reason: z.string().min(3, 'Provide a brief reason').max(200),
});

export type AdjustQuantityFormValues = z.infer<typeof adjustQuantitySchema>;
