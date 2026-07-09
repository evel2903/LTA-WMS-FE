/**
 * Mirrors BE's canonical LocationProfile policy schema (FFB-06,
 * LTA-WMS-BE/src/Modules/MasterData/Domain/ValueObjects/LocationProfilePolicySchema.ts). Inner
 * keys are literal JSON sent over the wire — NOT translated by MasterDataMapper like top-level
 * entity fields are — so casing here must match BE exactly.
 *
 * Every interface keeps a `[key: string]: unknown` index signature so a pre-existing
 * LocationProfile with free-form legacy JSON still displays without a cast or crash; the create/
 * edit form only ever WRITES the named keys below.
 */

export interface CapacityPolicy {
  RequireCapacityQty?: boolean;
  [key: string]: unknown;
}

export interface CompliancePolicy {
  RequiredTemperatureClass?: string;
  BondedOnly?: boolean;
  [key: string]: unknown;
}

/**
 * putawayBlocked/replenishmentAllowed/allowReplenishment/canReplenish are typed `boolean | string`
 * (not just `boolean`) because BE's schema marks them 'boolean-tolerant': a stored case-insensitive
 * "true"/"false" string is a real, actively-enforced value there, not invalid data — see
 * ParseTolerantBoolean below. Every other key here is plain 'boolean' on BE and must stay so.
 */
export interface EligibilityPolicy {
  putawayBlocked?: boolean | string;
  replenishmentBlocked?: boolean;
  pickFaceBlocked?: boolean;
  pickBlocked?: boolean;
  blockReplenishment?: boolean;
  replenishmentDisabled?: boolean;
  replenishmentAllowed?: boolean | string;
  allowReplenishment?: boolean | string;
  canReplenish?: boolean | string;
  pickFace?: boolean;
  isPickFace?: boolean;
  replenishmentTarget?: boolean;
  [key: string]: unknown;
}

export interface OperationPolicy {
  putawayBlocked?: boolean | string;
  putawayAllowed?: boolean;
  replenishmentBlocked?: boolean;
  pickFaceBlocked?: boolean;
  pickBlocked?: boolean;
  blockReplenishment?: boolean;
  replenishmentDisabled?: boolean;
  replenishmentAllowed?: boolean | string;
  allowReplenishment?: boolean | string;
  canReplenish?: boolean | string;
  pickFace?: boolean;
  isPickFace?: boolean;
  [key: string]: unknown;
}

/**
 * FE writes only the PascalCase key (MixSkuPolicy/MixOwnerPolicy/MixLotPolicy) — the lowercase
 * variant is a BE-only backward-compat read affordance for legacy rows, never emitted by this form.
 */
export interface MixPolicy {
  MixSkuPolicy?: string;
  MixOwnerPolicy?: string;
  MixLotPolicy?: string;
  [key: string]: unknown;
}

/**
 * Mirrors BE's matchesFieldType('boolean-tolerant', ...) (LocationProfilePolicySchema.ts) exactly:
 * a handful of keys (EligibilityPolicy/OperationPolicy.putawayBlocked, .replenishmentAllowed,
 * .allowReplenishment, .canReplenish) are valid and actively enforced at runtime as either a real
 * boolean OR a case-insensitive "true"/"false" string. Every FE read of one of those specific keys
 * (form hydration, display labels) must go through this — reading with a strict `=== true` check
 * would silently treat a stored tolerant string as unset/false even though BE enforces it as true.
 * Do NOT use this for a key that is plain 'boolean' on the BE schema (putawayAllowed,
 * replenishmentBlocked, pickFace, ...) — those must stay strict, since BE reads them with `===`.
 */
export function ParseTolerantBoolean(value: unknown): boolean | undefined {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
}
