import { z } from 'zod';

import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type {
  CreateLocationProfileInput,
  UpdateLocationProfileInput,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import {
  ParseTolerantBoolean,
  type EligibilityPolicy,
  type OperationPolicy,
} from '@modules/MasterData/Domain/Types/LocationProfilePolicy';

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

/**
 * Tri-state select for policy keys where "not set" and "true" behave identically at runtime and
 * only an EXPLICIT false blocks (OperationPolicy.putawayAllowed, .replenishmentAllowed — see
 * ReleasePutawayTaskUseCase/ReplenishmentTaskLifecycleService.PolicyExplicitFalse). A plain
 * checkbox can't represent this: "unchecked" would have to mean either "unset" or "false", and
 * picking either wrong would silently change behavior for every profile that doesn't touch the
 * field.
 */
const triState = z.enum(['unset', 'true', 'false']);
export type TriState = z.infer<typeof triState>;

function triStateFromBoolean(value: unknown): TriState {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return 'unset';
}

/**
 * [Review][Patch] OperationPolicy.replenishmentAllowed is 'boolean-tolerant' on the BE schema (also
 * accepts a case-insensitive "true"/"false" string) — reading it with the strict triStateFromBoolean
 * above silently read a currently-enforced string value as 'unset', and since this field is
 * form-MANAGED, saving any unrelated change then wrote back `undefined` (dropping the enforced
 * block/allow entirely). operationPutawayAllowed stays on the strict triStateFromBoolean above since
 * its BE type is plain 'boolean', not tolerant.
 */
function triStateFromTolerantBoolean(value: unknown): TriState {
  return triStateFromBoolean(ParseTolerantBoolean(value));
}

function triStateToBoolean(value: TriState): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

const mixOption = z.enum(['allow', 'noMix']);
export type MixOption = z.infer<typeof mixOption>;

function mixOptionFromValue(value: unknown): MixOption {
  return typeof value === 'string' && ['nomix', 'no_mix', 'single', 'singleonly'].includes(value.trim().toLowerCase())
    ? 'noMix'
    : 'allow';
}

function mixOptionToValue(value: MixOption): string | undefined {
  return value === 'noMix' ? 'NoMix' : undefined;
}

/**
 * [Review][Patch] EligibilityPolicy/OperationPolicy have canonical keys (see BE
 * LocationProfilePolicySchema.ts) that this form has no field for (e.g. replenishmentBlocked,
 * pickFaceBlocked, isPickFace). Without this, an update would silently drop them because
 * toCreateLocationProfileInput only ever builds the handful of keys the form manages. Preserve
 * every OTHER canonical key already on the profile being edited; anything not in the canonical list
 * is pre-existing free-form/legacy JSON the backend whitelist would reject on write anyway, so it is
 * dropped rather than resurrected.
 */
const ELIGIBILITY_CANONICAL_KEYS = [
  'putawayBlocked',
  'replenishmentBlocked',
  'pickFaceBlocked',
  'pickBlocked',
  'blockReplenishment',
  'replenishmentDisabled',
  'replenishmentAllowed',
  'allowReplenishment',
  'canReplenish',
  'pickFace',
  'isPickFace',
  'replenishmentTarget',
] as const;
const ELIGIBILITY_MANAGED_KEYS = ['putawayBlocked'] as const;

const OPERATION_CANONICAL_KEYS = [
  'putawayBlocked',
  'putawayAllowed',
  'replenishmentBlocked',
  'pickFaceBlocked',
  'pickBlocked',
  'blockReplenishment',
  'replenishmentDisabled',
  'replenishmentAllowed',
  'allowReplenishment',
  'canReplenish',
  'pickFace',
  'isPickFace',
] as const;
const OPERATION_MANAGED_KEYS = [
  'putawayBlocked',
  'putawayAllowed',
  'replenishmentBlocked',
  'replenishmentAllowed',
  'pickFace',
] as const;

function preserveUnmanagedCanonical<T extends Record<string, unknown>>(
  original: T | undefined,
  canonicalKeys: readonly string[],
  managedKeys: readonly string[],
  managed: T,
): T {
  if (!original) return managed;
  const preserved: Record<string, unknown> = {};
  for (const key of canonicalKeys) {
    if (managedKeys.includes(key) || !(key in original)) continue;
    preserved[key] = original[key];
  }
  return { ...preserved, ...managed };
}

export const locationProfileFormSchema = z.object({
  profileCode: requiredText(50, 'Cần mã hồ sơ'),
  profileName: requiredText(255, 'Cần tên hồ sơ'),
  locationType: requiredText(50, 'Cần loại vị trí'),
  version: z.preprocess(
    (value) => (value === '' || Number.isNaN(value) ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  status: z.enum(['Active', 'Inactive']),
  // Chính sách sức chứa
  requireCapacityQty: z.boolean(),
  // Chính sách tuân thủ
  requiredTemperatureClass: optionalText(50),
  bondedOnly: z.boolean(),
  // Chính sách điều kiện sử dụng
  eligibilityPutawayBlocked: z.boolean(),
  // Chính sách vận hành
  operationPutawayBlocked: z.boolean(),
  operationPutawayAllowed: triState,
  operationReplenishmentBlocked: z.boolean(),
  operationReplenishmentAllowed: triState,
  operationPickFace: z.boolean(),
  // Chính sách trộn hàng
  mixSkuPolicy: mixOption,
  mixOwnerPolicy: mixOption,
  mixLotPolicy: mixOption,
  reasonCode: optionalText(100),
  sourceSystem: optionalText(100),
  referenceId: optionalText(100),
});

export type LocationProfileFormValues = z.infer<typeof locationProfileFormSchema>;

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
    requireCapacityQty: profile?.capacityPolicy?.RequireCapacityQty === true,
    requiredTemperatureClass: nullish(
      typeof profile?.compliancePolicy?.RequiredTemperatureClass === 'string'
        ? profile.compliancePolicy.RequiredTemperatureClass
        : undefined,
    ),
    bondedOnly: profile?.compliancePolicy?.BondedOnly === true,
    eligibilityPutawayBlocked: ParseTolerantBoolean(profile?.eligibilityPolicy?.putawayBlocked) === true,
    operationPutawayBlocked: ParseTolerantBoolean(profile?.operationPolicy?.putawayBlocked) === true,
    operationPutawayAllowed: triStateFromBoolean(profile?.operationPolicy?.putawayAllowed),
    operationReplenishmentBlocked: profile?.operationPolicy?.replenishmentBlocked === true,
    operationReplenishmentAllowed: triStateFromTolerantBoolean(profile?.operationPolicy?.replenishmentAllowed),
    operationPickFace: profile?.operationPolicy?.pickFace === true,
    mixSkuPolicy: mixOptionFromValue(profile?.mixPolicy?.MixSkuPolicy ?? profile?.mixPolicy?.mixSkuPolicy),
    mixOwnerPolicy: mixOptionFromValue(profile?.mixPolicy?.MixOwnerPolicy ?? profile?.mixPolicy?.mixOwnerPolicy),
    mixLotPolicy: mixOptionFromValue(profile?.mixPolicy?.MixLotPolicy ?? profile?.mixPolicy?.mixLotPolicy),
    reasonCode: '',
    sourceSystem: nullish(profile?.sourceSystem),
    referenceId: nullish(profile?.referenceId),
  };
}

function buildEligibilityPolicy(values: LocationProfileFormValues): EligibilityPolicy {
  return { putawayBlocked: values.eligibilityPutawayBlocked };
}

function buildOperationPolicy(values: LocationProfileFormValues): OperationPolicy {
  const putawayAllowed = triStateToBoolean(values.operationPutawayAllowed);
  const replenishmentAllowed = triStateToBoolean(values.operationReplenishmentAllowed);
  return {
    putawayBlocked: values.operationPutawayBlocked,
    ...(putawayAllowed !== undefined ? { putawayAllowed } : {}),
    replenishmentBlocked: values.operationReplenishmentBlocked,
    ...(replenishmentAllowed !== undefined ? { replenishmentAllowed } : {}),
    pickFace: values.operationPickFace,
  };
}

export function toCreateLocationProfileInput(values: LocationProfileFormValues): CreateLocationProfileInput {
  const mixSkuPolicy = mixOptionToValue(values.mixSkuPolicy);
  const mixOwnerPolicy = mixOptionToValue(values.mixOwnerPolicy);
  const mixLotPolicy = mixOptionToValue(values.mixLotPolicy);

  return {
    profileCode: values.profileCode,
    profileName: values.profileName,
    locationType: values.locationType,
    status: values.status,
    capacityPolicy: { RequireCapacityQty: values.requireCapacityQty },
    eligibilityPolicy: buildEligibilityPolicy(values),
    mixPolicy: {
      ...(mixSkuPolicy ? { MixSkuPolicy: mixSkuPolicy } : {}),
      ...(mixOwnerPolicy ? { MixOwnerPolicy: mixOwnerPolicy } : {}),
      ...(mixLotPolicy ? { MixLotPolicy: mixLotPolicy } : {}),
    },
    compliancePolicy: {
      ...(values.requiredTemperatureClass ? { RequiredTemperatureClass: values.requiredTemperatureClass } : {}),
      BondedOnly: values.bondedOnly,
    },
    operationPolicy: buildOperationPolicy(values),
    reasonCode: values.reasonCode,
    sourceSystem: values.sourceSystem,
    referenceId: values.referenceId,
  };
}

export function toUpdateLocationProfileInput(
  values: LocationProfileFormValues,
  original?: LocationProfile,
): UpdateLocationProfileInput {
  return {
    ...toCreateLocationProfileInput(values),
    eligibilityPolicy: preserveUnmanagedCanonical(
      original?.eligibilityPolicy,
      ELIGIBILITY_CANONICAL_KEYS,
      ELIGIBILITY_MANAGED_KEYS,
      buildEligibilityPolicy(values),
    ),
    operationPolicy: preserveUnmanagedCanonical(
      original?.operationPolicy,
      OPERATION_CANONICAL_KEYS,
      OPERATION_MANAGED_KEYS,
      buildOperationPolicy(values),
    ),
    version: values.version,
  };
}
