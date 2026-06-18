import { z } from 'zod';

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalNonNegativeInt = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().nonnegative().optional(),
);

export const masterDataStatusSchema = z.enum(['Active', 'Inactive']);
export const skuStatusSchema = z.enum(['Draft', 'Active', 'Blocked', 'Discontinued']);

// ── Owner ─────────────────────────────────────────────────────────────────────

export const ownerFormSchema = z.object({
  ownerCode: requiredText(50, 'Owner code is required'),
  ownerName: requiredText(255, 'Owner name is required'),
  status: masterDataStatusSchema,
  sourceSystem: optionalText(100),
  referenceId: optionalText(100),
});

// ── Uom ─────────────────────────────────────────────────────────────────────

export const uomFormSchema = z.object({
  uomCode: requiredText(50, 'UOM code is required'),
  uomName: requiredText(255, 'UOM name is required'),
  status: masterDataStatusSchema,
  uomType: optionalText(50),
  decimalPrecision: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().int().min(0, 'Min 0').max(6, 'Max 6').optional(),
  ),
  sourceSystem: optionalText(100),
  referenceId: optionalText(100),
});

// ── Sku (with control-flag policy superRefine, mirroring BE BUSINESS_RULE) ────

export const skuFormSchema = z
  .object({
    skuCode: requiredText(80, 'SKU code is required'),
    skuName: requiredText(255, 'SKU name is required'),
    itemClass: requiredText(50, 'Item class is required'),
    itemStatus: skuStatusSchema,
    baseUomId: requiredText(36, 'Base UOM is required'),
    inventoryUomId: requiredText(36, 'Inventory UOM is required'),
    defaultOwnerId: optionalText(36),
    lotControlled: z.boolean().optional().default(false),
    expiryControlled: z.boolean().optional().default(false),
    serialControlled: z.boolean().optional().default(false),
    ownerControlled: z.boolean().optional().default(false),
    lpnControlled: z.boolean().optional().default(false),
    temperatureControlled: z.boolean().optional().default(false),
    dgControlled: z.boolean().optional().default(false),
    customsControlled: z.boolean().optional().default(false),
    qcRequired: z.boolean().optional().default(false),
    bondedFlag: z.boolean().optional().default(false),
    temperatureClass: optionalText(50),
    dgClass: optionalText(50),
    shelfLifeDays: optionalNonNegativeInt,
    minRemainingShelfLifeDays: optionalNonNegativeInt,
    sourceSystem: optionalText(100),
    referenceId: optionalText(100),
  })
  .superRefine((values, ctx) => {
    if (values.ownerControlled && !values.defaultOwnerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultOwnerId'],
        message: 'Default owner is required when owner controlled',
      });
    }
    if (values.expiryControlled && !(values.shelfLifeDays && values.shelfLifeDays > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shelfLifeDays'],
        message: 'Shelf life days must be greater than 0 when expiry controlled',
      });
    }
    if (values.temperatureControlled && !values.temperatureClass) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['temperatureClass'],
        message: 'Temperature class is required when temperature controlled',
      });
    }
    if (values.dgControlled && !values.dgClass) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dgClass'],
        message: 'DG class is required when DG controlled',
      });
    }
    if (values.customsControlled && !values.bondedFlag) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bondedFlag'],
        message: 'Bonded flag must be true when customs controlled',
      });
    }
  });

// ── SkuBarcode ────────────────────────────────────────────────────────────────

export const skuBarcodeFormSchema = z.object({
  skuId: requiredText(36, 'SKU is required'),
  uomId: requiredText(36, 'UOM is required'),
  barcodeValue: requiredText(120, 'Barcode value is required'),
  barcodeType: requiredText(30, 'Barcode type is required'),
  status: masterDataStatusSchema,
  ownerId: optionalText(36),
  packCode: optionalText(50),
  isPrimary: z.boolean().optional().default(false),
});

// ── UomConversion ─────────────────────────────────────────────────────────────

export const uomConversionFormSchema = z
  .object({
    skuId: requiredText(36, 'SKU is required'),
    fromUomId: requiredText(36, 'From UOM is required'),
    toUomId: requiredText(36, 'To UOM is required'),
    factor: z.coerce.number().min(0.000001, 'Factor must be greater than 0'),
    effectiveFrom: requiredText(40, 'Effective from is required'),
    status: masterDataStatusSchema,
    effectiveTo: optionalText(40),
  })
  .superRefine((values, ctx) => {
    if (values.fromUomId && values.toUomId && values.fromUomId === values.toUomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toUomId'],
        message: 'From and To UOM must differ',
      });
    }
  });

// ── ItemCoverage ──────────────────────────────────────────────────────────────

const optionalNonNegativeNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().nonnegative().optional(),
);

export const itemCoverageFormSchema = z
  .object({
    skuId: requiredText(36, 'SKU is required'),
    warehouseId: requiredText(36, 'Warehouse is required'),
    status: masterDataStatusSchema,
    ownerId: optionalText(36),
    minQty: optionalNonNegativeNumber,
    maxQty: optionalNonNegativeNumber,
    standardQty: optionalNonNegativeNumber,
    multipleQty: optionalNonNegativeNumber,
    leadTimeDays: optionalNonNegativeInt,
  })
  .superRefine((values, ctx) => {
    if (
      values.minQty !== undefined &&
      values.maxQty !== undefined &&
      values.maxQty < values.minQty
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxQty'],
        message: 'Max quantity must be greater than or equal to Min quantity',
      });
    }
    if (values.multipleQty !== undefined && values.multipleQty <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['multipleQty'],
        message: 'Multiple quantity must be greater than 0',
      });
    }
  });

export type OwnerFormValues = z.infer<typeof ownerFormSchema>;
export type UomFormValues = z.infer<typeof uomFormSchema>;
export type SkuFormValues = z.infer<typeof skuFormSchema>;
export type SkuBarcodeFormValues = z.infer<typeof skuBarcodeFormSchema>;
export type UomConversionFormValues = z.infer<typeof uomConversionFormSchema>;
export type ItemCoverageFormValues = z.infer<typeof itemCoverageFormSchema>;
