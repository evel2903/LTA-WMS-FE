import { z } from 'zod';

export const roleMetadataFormSchema = z.object({
  roleName: z.string().trim().min(1, 'Cần tên vai trò').max(255),
  description: z.string().max(500),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type RoleMetadataFormValues = z.infer<typeof roleMetadataFormSchema>;
