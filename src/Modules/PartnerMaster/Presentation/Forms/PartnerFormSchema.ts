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
  partnerCode: requiredText(50, 'Cần mã đối tác'),
  partnerName: requiredText(255, 'Cần tên đối tác'),
  partnerType: partnerTypeSchema,
  status: partnerStatusSchema,
  sourceSystem: requiredText(100, 'Cần hệ thống nguồn'),
  externalReference: requiredText(100, 'Cần mã tham chiếu ngoài'),
  referenceText: optionalText(255),
});

export const partnerDeactivateSchema = z.object({
  reasonCode: requiredText(64, 'Cần mã lý do'),
});

export type PartnerFormValues = z.infer<typeof partnerFormSchema>;
export type PartnerDeactivateValues = z.infer<typeof partnerDeactivateSchema>;
