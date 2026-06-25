import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const ACTION = z.enum([
  'Create',
  'Read',
  'Update',
  'DeleteCancel',
  'Approve',
  'Override',
  'Unlock',
  'Reprint',
  'Adjust',
]);

const OBJECT = z.enum([
  'Site',
  'Warehouse',
  'Zone',
  'Location',
  'LocationProfile',
  'Owner',
  'SKU',
  'UOM',
  'ItemCoverage',
  'InventoryStatus',
  'WarehouseProfile',
  'Rule',
  'Role',
  'Permission',
  'UserAssignment',
  'ReasonCode',
  'ApprovalRequest',
  'OverrideLog',
  'AuditLog',
  'ExceptionCase',
]);

const ROLE = z.enum([
  'WMS_ADMIN',
  'WAREHOUSE_SUPERVISOR',
  'WAREHOUSE_COORDINATOR',
  'OPERATOR',
  'QC',
  'INVENTORY_ACCOUNTANT',
]);

export const reasonCodeFormSchema = z
  .object({
    reasonCode: z.string().trim().min(1, 'Cần mã lý do').max(60),
    reasonGroup: z.enum([
      'RULE_OVERRIDE',
      'MASTER_DATA_CONFIG_CHANGE',
      'HOLD_RELEASE',
      'INVENTORY_ADJUSTMENT',
      'INTEGRATION',
      'MANUAL_FIX',
    ]),
    description: optionalText(500),
    appliesToActions: z.array(ACTION).min(1, 'Chọn ít nhất 1 action'),
    appliesToObjects: z.array(OBJECT).min(1, 'Chọn ít nhất 1 object'),
    evidenceRequired: z.boolean(),
    approvalRequired: z.boolean(),
    allowedRoleCodes: z.array(ROLE),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    effectiveFrom: optionalText(40),
    effectiveTo: optionalText(40),
  })
  .superRefine((values, ctx) => {
    if (values.effectiveFrom && values.effectiveTo && values.effectiveTo <= values.effectiveFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['effectiveTo'],
        message: 'Ngày hiệu lực đến phải sau ngày hiệu lực từ',
      });
    }
  });

export type ReasonCodeFormValues = z.infer<typeof reasonCodeFormSchema>;
