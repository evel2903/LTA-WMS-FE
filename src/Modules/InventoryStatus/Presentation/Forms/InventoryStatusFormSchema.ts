import { z } from 'zod';

/**
 * Controlled edit of an inventory status's behaviour flags. A valid `reasonCode` is mandatory
 * (ownership policy requires a reason for (Update, InventoryStatus); the BE validates it against
 * the C3 catalog). Status code / display name / stage group are read-only and not part of the form.
 */
export const inventoryStatusFormSchema = z.object({
  allowsAllocation: z.boolean(),
  allowsPick: z.boolean(),
  hold: z.boolean(),
  isTerminal: z.boolean(),
  isMilestone: z.boolean(),
  sortOrder: z.coerce.number().int('Sort order must be a whole number').min(0, 'Sort order must be ≥ 0'),
  status: z.enum(['Active', 'Inactive']),
  reasonCode: z.string().trim().min(1, 'Reason code is required').max(60),
});

export type InventoryStatusFormValues = z.infer<typeof inventoryStatusFormSchema>;
