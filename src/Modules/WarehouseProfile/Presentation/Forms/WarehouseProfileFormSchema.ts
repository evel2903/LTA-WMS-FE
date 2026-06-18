import { z } from 'zod';

import { buildPreviewContextFromProfile } from '@modules/WarehouseProfile/Application/UseCases/BuildPreviewContextUseCase';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

/**
 * Warehouse-profile create/update form. There is intentionally NO `status` field
 * — create always yields DRAFT on the backend and status only changes via
 * activate/deactivate. The six scope axes are optional (absent = wildcard).
 */
export const warehouseProfileFormSchema = z
  .object({
    profileCode: requiredText(80, 'Profile code is required'),
    profileName: requiredText(255, 'Profile name is required'),
    warehouseTypeCode: requiredText(50, 'Warehouse type code is required'),
    effectiveFrom: requiredText(40, 'Effective from is required'),
    effectiveTo: optionalText(40),
    // Six V0 configuration axes (architecture 5.3).
    warehouseId: optionalText(36),
    zoneId: optionalText(36),
    locationType: optionalText(50),
    ownerId: optionalText(36),
    skuId: optionalText(36),
    itemClass: optionalText(50),
    orderType: optionalText(50),
    customerId: optionalText(36),
    supplierId: optionalText(36),
  })
  .superRefine((values, ctx) => {
    if (values.effectiveTo && values.effectiveTo <= values.effectiveFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effectiveTo'],
        message: 'Effective to must be after effective from',
      });
    }
  });

export type WarehouseProfileFormValues = z.infer<typeof warehouseProfileFormSchema>;

export const assignmentFormSchema = z
  .object({
    assignmentType: z.enum(['WAREHOUSE_TYPE', 'WAREHOUSE']),
    warehouseTypeCode: optionalText(50),
    warehouseId: optionalText(36),
  })
  .superRefine((values, ctx) => {
    if (values.assignmentType === 'WAREHOUSE' && !values.warehouseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['warehouseId'],
        message: 'Warehouse is required for a warehouse assignment',
      });
    }
    if (values.assignmentType === 'WAREHOUSE_TYPE' && !values.warehouseTypeCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['warehouseTypeCode'],
        message: 'Warehouse type code is required for a warehouse-type assignment',
      });
    }
  });

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

/**
 * Preview context form — warehouseTypeCode is the only required axis (architecture 5.3).
 * No `profileId`: the merged BE preview request rejects it (forbidNonWhitelisted), so the
 * self-check resolves by scope only (contract divergence — see Dev Notes).
 */
export const previewContextFormSchema = z.object({
  warehouseTypeCode: requiredText(50, 'Warehouse type code is required'),
  warehouseId: optionalText(36),
  zoneId: optionalText(36),
  locationType: optionalText(50),
  ownerId: optionalText(36),
  skuId: optionalText(36),
  itemClass: optionalText(50),
  orderType: optionalText(50),
  customerId: optionalText(36),
  supplierId: optionalText(36),
  reasonCode: optionalText(100),
  // Optional as-of evaluation time (ISO). `attributes` (free-form JSON) is supported
  // by the contract/mapper but intentionally not surfaced in V0 — a JSON object
  // editor is out of scope (consistent with the read-only condition/action decision).
  evaluatedAt: optionalText(40),
});

export type PreviewContextFormValues = z.infer<typeof previewContextFormSchema>;

/**
 * Projects a profile's six-axis scope into preview-form defaults so an admin can
 * run a scope-based "Preview this profile" self-check pre-filled from the
 * selected profile. Reuses the Application projection (single source of the scope
 * mapping) and renders wildcard `null` axes as empty strings — the form binds
 * these to `<input value>`, so a raw `null` would surface as the literal "null".
 * No `profileId` (contract divergence — see Dev Notes); resolution is by scope.
 */
export function buildPreviewFormDefaults(
  profile: WarehouseProfile,
): Partial<PreviewContextFormValues> {
  const context = buildPreviewContextFromProfile(profile);
  return {
    warehouseTypeCode: context.warehouseTypeCode ?? '',
    warehouseId: context.warehouseId ?? '',
    zoneId: context.zoneId ?? '',
    locationType: context.locationType ?? '',
    ownerId: context.ownerId ?? '',
    skuId: context.skuId ?? '',
    itemClass: context.itemClass ?? '',
    orderType: context.orderType ?? '',
    customerId: context.customerId ?? '',
    supplierId: context.supplierId ?? '',
  };
}
