import { z } from 'zod';

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const partnerTypeSchema = z.enum(['Supplier', 'Customer', 'Carrier']);
export const partnerStatusSchema = z.enum(['Active', 'Inactive']);

export const partnerFormSchema = z.object({
  partnerCode: requiredText(50, 'Partner code is required'),
  partnerName: requiredText(255, 'Partner name is required'),
  partnerType: partnerTypeSchema,
  status: partnerStatusSchema,
  sourceSystem: requiredText(100, 'Source system is required'),
  externalReference: requiredText(100, 'External reference is required'),
  referenceText: optionalText(255),
});

export const partnerDeactivateSchema = z.object({
  reasonCode: requiredText(64, 'Reason code is required'),
});

export type PartnerFormValues = z.infer<typeof partnerFormSchema>;
export type PartnerDeactivateValues = z.infer<typeof partnerDeactivateSchema>;
