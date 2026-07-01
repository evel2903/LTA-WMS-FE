import { z } from 'zod';

import {
  ACTION_CODES,
  OBJECT_TYPES,
  REASON_GROUPS,
  ROLE_CODES,
  type ActionCode,
  type ObjectType,
  type ReasonGroup,
  type RoleCode,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const REASON_GROUP = z.enum(REASON_GROUPS as [ReasonGroup, ...ReasonGroup[]]);
const ACTION = z.enum(ACTION_CODES as [ActionCode, ...ActionCode[]]);
const OBJECT = z.enum(OBJECT_TYPES as [ObjectType, ...ObjectType[]]);
const ROLE = z.enum(ROLE_CODES as [RoleCode, ...RoleCode[]]);

export const reasonCodeFormSchema = z
  .object({
    reasonCode: z.string().trim().min(1, 'Cần mã lý do').max(60),
    reasonGroup: REASON_GROUP,
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
