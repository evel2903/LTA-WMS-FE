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
  ownerCode: requiredText(50, 'Cần mã chủ hàng'),
  ownerName: requiredText(255, 'Cần tên chủ hàng'),
  status: masterDataStatusSchema,
  sourceSystem: optionalText(100),
  referenceId: optionalText(100),
});

// ── Uom ─────────────────────────────────────────────────────────────────────

export const uomFormSchema = z.object({
  uomCode: requiredText(50, 'Cần mã đơn vị tính'),
  uomName: requiredText(255, 'Cần tên đơn vị tính'),
  status: masterDataStatusSchema,
  uomType: optionalText(50),
  decimalPrecision: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().int().min(0, 'Tối thiểu 0').max(6, 'Tối đa 6').optional(),
  ),
  sourceSystem: optionalText(100),
  referenceId: optionalText(100),
});

// ── Sku (with control-flag policy superRefine, mirroring BE BUSINESS_RULE) ────

export const skuFormSchema = z
  .object({
    skuCode: requiredText(80, 'Cần mã SKU'),
    skuName: requiredText(255, 'Cần tên SKU'),
    itemClass: requiredText(50, 'Cần phân lớp hàng'),
    itemStatus: skuStatusSchema,
    baseUomId: requiredText(36, 'Cần đơn vị tính cơ sở'),
    inventoryUomId: requiredText(36, 'Cần đơn vị tính tồn kho'),
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
        message: 'Cần chủ hàng mặc định khi bật kiểm soát chủ hàng',
      });
    }
    if (values.expiryControlled && !(values.shelfLifeDays && values.shelfLifeDays > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['shelfLifeDays'],
        message: 'Số ngày hạn dùng phải lớn hơn 0 khi bật kiểm soát hạn dùng',
      });
    }
    if (values.temperatureControlled && !values.temperatureClass) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['temperatureClass'],
        message: 'Cần nhóm nhiệt độ khi bật kiểm soát nhiệt độ',
      });
    }
    if (values.dgControlled && !values.dgClass) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dgClass'],
        message: 'Cần nhóm hàng nguy hiểm khi bật kiểm soát hàng nguy hiểm',
      });
    }
    if (values.customsControlled && !values.bondedFlag) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['bondedFlag'],
        message: 'Cần bật cờ kho ngoại quan khi bật kiểm soát hải quan',
      });
    }
  });

// ── SkuBarcode ────────────────────────────────────────────────────────────────

export const skuBarcodeFormSchema = z
  .object({
    skuId: requiredText(36, 'Cần SKU'),
    uomId: requiredText(36, 'Cần đơn vị tính'),
    barcodeValue: requiredText(120, 'Cần giá trị mã vạch'),
    barcodeType: requiredText(30, 'Cần loại mã vạch'),
    status: masterDataStatusSchema,
    ownerId: optionalText(36),
    packCode: optionalText(50),
    isPrimary: z.boolean().optional().default(false),
    effectiveFrom: optionalText(40),
    effectiveTo: optionalText(40),
    reasonCode: optionalText(64),
  })
  .superRefine((values, ctx) => {
    if (values.effectiveFrom && values.effectiveTo && values.effectiveTo < values.effectiveFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effectiveTo'],
        message: 'Ngày hiệu lực đến phải lớn hơn hoặc bằng ngày hiệu lực từ',
      });
    }
  });

// ── PackDefinition ───────────────────────────────────────────────────────────

export const packDefinitionFormSchema = z.object({
  skuId: requiredText(36, 'Cần SKU'),
  packCode: requiredText(50, 'Cần mã quy cách đóng gói'),
  packName: requiredText(255, 'Cần tên quy cách đóng gói'),
  uomId: requiredText(36, 'Cần đơn vị tính'),
  quantityPerPack: z.coerce.number().min(0.000001, 'Số lượng mỗi quy cách phải lớn hơn 0'),
  status: masterDataStatusSchema,
  isDefault: z.boolean().optional().default(false),
  reasonCode: optionalText(64),
});

// ── UomConversion ─────────────────────────────────────────────────────────────

export const uomConversionFormSchema = z
  .object({
    skuId: requiredText(36, 'Cần SKU'),
    fromUomId: requiredText(36, 'Cần đơn vị tính nguồn'),
    toUomId: requiredText(36, 'Cần đơn vị tính đích'),
    factor: z.coerce.number().min(0.000001, 'Hệ số quy đổi phải lớn hơn 0'),
    effectiveFrom: requiredText(40, 'Cần ngày hiệu lực từ'),
    status: masterDataStatusSchema,
    effectiveTo: optionalText(40),
    reasonCode: optionalText(64),
  })
  .superRefine((values, ctx) => {
    if (values.fromUomId && values.toUomId && values.fromUomId === values.toUomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toUomId'],
        message: 'Đơn vị tính nguồn và đích phải khác nhau',
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
    skuId: requiredText(36, 'Cần SKU'),
    warehouseId: requiredText(36, 'Cần kho'),
    status: masterDataStatusSchema,
    ownerId: optionalText(36),
    minQty: optionalNonNegativeNumber,
    maxQty: optionalNonNegativeNumber,
    standardQty: optionalNonNegativeNumber,
    multipleQty: optionalNonNegativeNumber,
    leadTimeDays: optionalNonNegativeInt,
    stopReceiving: z.boolean().optional().default(false),
    stopShipping: z.boolean().optional().default(false),
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
        message: 'Số lượng tối đa phải lớn hơn hoặc bằng số lượng tối thiểu',
      });
    }
    if (values.multipleQty !== undefined && values.multipleQty <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['multipleQty'],
        message: 'Bội số đặt hàng phải lớn hơn 0',
      });
    }
  });

export type OwnerFormValues = z.infer<typeof ownerFormSchema>;
export type UomFormValues = z.infer<typeof uomFormSchema>;
export type SkuFormValues = z.infer<typeof skuFormSchema>;
export type SkuBarcodeFormValues = z.infer<typeof skuBarcodeFormSchema>;
export type PackDefinitionFormValues = z.infer<typeof packDefinitionFormSchema>;
export type UomConversionFormValues = z.infer<typeof uomConversionFormSchema>;
export type ItemCoverageFormValues = z.infer<typeof itemCoverageFormSchema>;
