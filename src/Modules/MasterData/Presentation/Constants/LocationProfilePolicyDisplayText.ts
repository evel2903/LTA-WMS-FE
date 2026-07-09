import {
  ParseTolerantBoolean,
  type CapacityPolicy,
  type CompliancePolicy,
  type EligibilityPolicy,
  type MixPolicy,
  type OperationPolicy,
} from '@modules/MasterData/Domain/Types/LocationProfilePolicy';

export interface PolicyDisplayRow {
  label: string;
  value: string;
}

const MIX_BLOCK_VALUES = ['nomix', 'no_mix', 'single', 'singleonly'];

function boolLabel(value: unknown): string {
  if (value === true) return 'Có';
  if (value === false) return 'Không';
  return 'Không cấu hình';
}

/** "Không đặt" distinguishes not-set from explicit-false for tri-state-managed fields (putawayAllowed). */
function unsetAwareBoolLabel(value: unknown): string {
  return value === undefined ? 'Không đặt' : boolLabel(value);
}

/**
 * [Review][Patch] For the keys the BE schema types 'boolean-tolerant' (putawayBlocked,
 * replenishmentAllowed, allowReplenishment, canReplenish): a stored string "true"/"false" is a real,
 * actively-enforced value, not "unconfigured" — labeling it with the strict boolLabel above silently
 * showed "Không cấu hình" for a profile that IS blocking/allowing at runtime.
 */
function tolerantBoolLabel(value: unknown): string {
  return boolLabel(ParseTolerantBoolean(value));
}

function tolerantUnsetAwareBoolLabel(value: unknown): string {
  const parsed = ParseTolerantBoolean(value);
  return parsed === undefined ? 'Không đặt' : boolLabel(parsed);
}

function textLabel(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : 'Không cấu hình';
}

function mixLabel(value: unknown): string {
  return typeof value === 'string' && MIX_BLOCK_VALUES.includes(value.trim().toLowerCase())
    ? 'Không trộn'
    : 'Cho phép trộn';
}

export function describeCapacityPolicy(policy: CapacityPolicy): PolicyDisplayRow[] {
  return [{ label: 'Yêu cầu số lượng sức chứa', value: boolLabel(policy.RequireCapacityQty) }];
}

export function describeEligibilityPolicy(policy: EligibilityPolicy): PolicyDisplayRow[] {
  return [{ label: 'Chặn putaway (điều kiện sử dụng)', value: tolerantBoolLabel(policy.putawayBlocked) }];
}

export function describeMixPolicy(policy: MixPolicy): PolicyDisplayRow[] {
  return [
    { label: 'Trộn SKU', value: mixLabel(policy.MixSkuPolicy ?? policy.mixSkuPolicy) },
    { label: 'Trộn chủ hàng', value: mixLabel(policy.MixOwnerPolicy ?? policy.mixOwnerPolicy) },
    { label: 'Trộn lô', value: mixLabel(policy.MixLotPolicy ?? policy.mixLotPolicy) },
  ];
}

export function describeCompliancePolicy(policy: CompliancePolicy): PolicyDisplayRow[] {
  return [
    { label: 'Nhóm nhiệt độ yêu cầu', value: textLabel(policy.RequiredTemperatureClass) },
    { label: 'Chỉ áp dụng khu ngoại quan', value: boolLabel(policy.BondedOnly) },
  ];
}

export function describeOperationPolicy(policy: OperationPolicy): PolicyDisplayRow[] {
  return [
    { label: 'Chặn putaway (vận hành)', value: tolerantBoolLabel(policy.putawayBlocked) },
    { label: 'Cho phép putaway', value: unsetAwareBoolLabel(policy.putawayAllowed) },
    { label: 'Chặn châm hàng', value: boolLabel(policy.replenishmentBlocked) },
    { label: 'Cho phép châm hàng', value: tolerantUnsetAwareBoolLabel(policy.replenishmentAllowed) },
    { label: 'Là vị trí soạn hàng (pick face)', value: boolLabel(policy.pickFace) },
  ];
}
