import { z } from 'zod';

import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  CreateLocationProfileInput,
  UpdateLocationProfileInput,
} from '@modules/MasterData/Domain/Types/MasterDataTree';

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const policyJsonSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = JSON.parse(value) as unknown;
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, 'Nhập đối tượng JSON hợp lệ');

export const locationProfileFormSchema = z.object({
  profileCode: requiredText(50, 'Cần mã hồ sơ'),
  profileName: requiredText(255, 'Cần tên hồ sơ'),
  locationType: requiredText(50, 'Cần loại vị trí'),
  version: z.preprocess(
    (value) => (value === '' || Number.isNaN(value) ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  status: z.enum(['Active', 'Inactive']),
  capacityPolicyJson: policyJsonSchema,
  eligibilityPolicyJson: policyJsonSchema,
  mixPolicyJson: policyJsonSchema,
  compliancePolicyJson: policyJsonSchema,
  operationPolicyJson: policyJsonSchema,
  reasonCode: optionalText(100),
  sourceSystem: optionalText(100),
  referenceId: optionalText(100),
});

export type LocationProfileFormValues = z.infer<typeof locationProfileFormSchema>;

function parsePolicyJson(value: string): Record<string, unknown> {
  return value.trim() ? (JSON.parse(value) as Record<string, unknown>) : {};
}

function formatPolicy(value: Record<string, unknown>): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function nullish(value?: string | null): string | undefined {
  return value ?? undefined;
}

export function locationProfileToFormValues(profile?: LocationProfile): LocationProfileFormValues {
  return {
    profileCode: profile?.profileCode ?? '',
    profileName: profile?.profileName ?? '',
    locationType: profile?.locationType ?? '',
    version: profile?.version,
    status: profile?.status ?? 'Active',
    capacityPolicyJson: formatPolicy(profile?.capacityPolicy ?? {}),
    eligibilityPolicyJson: formatPolicy(profile?.eligibilityPolicy ?? {}),
    mixPolicyJson: formatPolicy(profile?.mixPolicy ?? {}),
    compliancePolicyJson: formatPolicy(profile?.compliancePolicy ?? {}),
    operationPolicyJson: formatPolicy(profile?.operationPolicy ?? {}),
    reasonCode: '',
    sourceSystem: nullish(profile?.sourceSystem),
    referenceId: nullish(profile?.referenceId),
  };
}

export function toCreateLocationProfileInput(
  values: LocationProfileFormValues,
): CreateLocationProfileInput {
  return {
    profileCode: values.profileCode,
    profileName: values.profileName,
    locationType: values.locationType,
    status: values.status,
    capacityPolicy: parsePolicyJson(values.capacityPolicyJson),
    eligibilityPolicy: parsePolicyJson(values.eligibilityPolicyJson),
    mixPolicy: parsePolicyJson(values.mixPolicyJson),
    compliancePolicy: parsePolicyJson(values.compliancePolicyJson),
    operationPolicy: parsePolicyJson(values.operationPolicyJson),
    reasonCode: values.reasonCode,
    sourceSystem: values.sourceSystem,
    referenceId: values.referenceId,
  };
}

export function toUpdateLocationProfileInput(
  values: LocationProfileFormValues,
): UpdateLocationProfileInput {
  return {
    ...toCreateLocationProfileInput(values),
    version: values.version,
  };
}
