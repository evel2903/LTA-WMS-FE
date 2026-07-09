import { describe, expect, it } from 'vitest';

import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { OperationPolicy } from '@modules/MasterData/Domain/Types/LocationProfilePolicy';
import {
  locationProfileFormSchema,
  locationProfileToFormValues,
  toCreateLocationProfileInput,
  toUpdateLocationProfileInput,
} from '@modules/MasterData/Presentation/Forms/LocationProfileFormSchema';

const validValues = {
  profileCode: 'BIN-STD',
  profileName: 'Standard Bin',
  locationType: 'Bin',
  version: 1,
  status: 'Active',
  requireCapacityQty: true,
  requiredTemperatureClass: 'AMBIENT',
  bondedOnly: false,
  eligibilityPutawayBlocked: false,
  operationPutawayBlocked: false,
  operationPutawayAllowed: 'unset',
  operationReplenishmentBlocked: false,
  operationReplenishmentAllowed: 'unset',
  operationPickFace: true,
  mixSkuPolicy: 'allow',
  mixOwnerPolicy: 'allow',
  mixLotPolicy: 'noMix',
  reasonCode: 'RC-MD-UPDATE',
  sourceSystem: '',
  referenceId: '',
} as const;

const profile: LocationProfile = {
  id: 'profile-1',
  profileCode: 'BIN-STD',
  profileName: 'Standard Bin',
  locationType: 'Bin',
  version: 3,
  status: 'Active',
  capacityPolicy: { RequireCapacityQty: true },
  eligibilityPolicy: { putawayBlocked: true },
  mixPolicy: { MixSkuPolicy: 'NoMix' },
  compliancePolicy: { RequiredTemperatureClass: 'FROZEN', BondedOnly: true },
  operationPolicy: { putawayAllowed: false, replenishmentBlocked: true, pickFace: true },
  sourceSystem: null,
  referenceId: null,
  createdAt: '2026-06-21T00:00:00.000Z',
  updatedAt: '2026-06-21T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
};

/** A profile with pre-existing free-form JSON (no canonical keys) — must hydrate without throwing. */
const legacyProfile: LocationProfile = {
  ...profile,
  capacityPolicy: { palletSlots: 6 },
  eligibilityPolicy: { ownerCodes: ['LTA'] },
  mixPolicy: { allowMultiSku: true },
  compliancePolicy: { demo: true },
  operationPolicy: { allowReceiving: true },
};

describe('LocationProfileFormSchema', () => {
  it('accepts every structured field at its declared type', () => {
    expect(locationProfileFormSchema.safeParse(validValues).success).toBe(true);
  });

  it('rejects an invalid tri-state or mix-option value', () => {
    expect(
      locationProfileFormSchema.safeParse({ ...validValues, operationPutawayAllowed: 'maybe' }).success,
    ).toBe(false);
    expect(locationProfileFormSchema.safeParse({ ...validValues, mixSkuPolicy: 'sometimes' }).success).toBe(false);
  });

  it('maps create/update form values to backend-safe domain input using canonical keys only', () => {
    const parsed = locationProfileFormSchema.parse(validValues);
    const created = toCreateLocationProfileInput(parsed);

    expect(created).toMatchObject({
      profileCode: 'BIN-STD',
      profileName: 'Standard Bin',
      locationType: 'Bin',
      status: 'Active',
      capacityPolicy: { RequireCapacityQty: true },
      eligibilityPolicy: { putawayBlocked: false },
      mixPolicy: { MixLotPolicy: 'NoMix' },
      compliancePolicy: { RequiredTemperatureClass: 'AMBIENT', BondedOnly: false },
      operationPolicy: { putawayBlocked: false, replenishmentBlocked: false, pickFace: true },
      reasonCode: 'RC-MD-UPDATE',
    });
    // "allow" mix options and "unset" tri-states must be OMITTED, not written as a value —
    // omitting is what makes them behave as "no restriction" (see FormSchema tri-state comment).
    expect(created.mixPolicy).not.toHaveProperty('MixSkuPolicy');
    expect(created.mixPolicy).not.toHaveProperty('MixOwnerPolicy');
    expect(created.operationPolicy).not.toHaveProperty('putawayAllowed');
    expect(created.operationPolicy).not.toHaveProperty('replenishmentAllowed');

    expect(toUpdateLocationProfileInput({ ...parsed, status: 'Inactive' })).toMatchObject({
      version: 1,
      status: 'Inactive',
      capacityPolicy: { RequireCapacityQty: true },
    });
  });

  it('writes an explicit true/false for a tri-state field only when the user picked one', () => {
    const allowed = toCreateLocationProfileInput({
      ...locationProfileFormSchema.parse(validValues),
      operationPutawayAllowed: 'true',
      operationReplenishmentAllowed: 'false',
    });

    expect(allowed.operationPolicy).toMatchObject({ putawayAllowed: true, replenishmentAllowed: false });
  });

  it('hydrates edit defaults from the selected profile using canonical keys', () => {
    const values = locationProfileToFormValues(profile);

    expect(values.profileCode).toBe('BIN-STD');
    expect(values.version).toBe(3);
    expect(values.requireCapacityQty).toBe(true);
    expect(values.eligibilityPutawayBlocked).toBe(true);
    expect(values.requiredTemperatureClass).toBe('FROZEN');
    expect(values.bondedOnly).toBe(true);
    expect(values.operationPutawayAllowed).toBe('false');
    expect(values.operationReplenishmentBlocked).toBe(true);
    expect(values.operationPickFace).toBe(true);
    expect(values.mixSkuPolicy).toBe('noMix');
    expect(values.reasonCode).toBe('');
  });

  it('hydrates a profile that only has putawayAllowed=true as the "true" tri-state, and an untouched profile as "unset"', () => {
    const allowedTrue = locationProfileToFormValues({
      ...profile,
      operationPolicy: { putawayAllowed: true },
    });
    expect(allowedTrue.operationPutawayAllowed).toBe('true');

    const untouched = locationProfileToFormValues({ ...profile, operationPolicy: {} });
    expect(untouched.operationPutawayAllowed).toBe('unset');
  });

  it('[Review][Patch] preserves canonical EligibilityPolicy/OperationPolicy keys the form has no field for, instead of discarding them on update', () => {
    const seededProfile: LocationProfile = {
      ...profile,
      eligibilityPolicy: { putawayBlocked: false, replenishmentBlocked: true, isPickFace: true },
      operationPolicy: { putawayAllowed: false, replenishmentBlocked: true, pickFace: true, pickFaceBlocked: true },
    };
    const values = locationProfileToFormValues(seededProfile);

    const updated = toUpdateLocationProfileInput(values, seededProfile);

    // Unmanaged keys not exposed as form fields must round-trip untouched.
    expect(updated.eligibilityPolicy).toMatchObject({ replenishmentBlocked: true, isPickFace: true });
    expect(updated.operationPolicy).toMatchObject({ pickFaceBlocked: true });
    // Managed keys must still reflect the form's current values, not the stale original.
    expect(updated.eligibilityPolicy).toMatchObject({ putawayBlocked: false });
    expect(updated.operationPolicy).toMatchObject({ replenishmentBlocked: true, pickFace: true });
  });

  it('[Review][Patch] a managed key edited by the user overrides the preserved original value', () => {
    const seededProfile: LocationProfile = {
      ...profile,
      eligibilityPolicy: { putawayBlocked: true, replenishmentBlocked: true },
      operationPolicy: {},
    };
    const values = { ...locationProfileToFormValues(seededProfile), eligibilityPutawayBlocked: false };

    const updated = toUpdateLocationProfileInput(values, seededProfile);

    expect(updated.eligibilityPolicy).toMatchObject({ putawayBlocked: false, replenishmentBlocked: true });
  });

  it('[Review][Patch] drops a non-canonical (legacy/unknown) key instead of resurrecting it on update, since the backend whitelist would reject it', () => {
    const updated = toUpdateLocationProfileInput(locationProfileToFormValues(legacyProfile), legacyProfile);

    expect(updated.eligibilityPolicy).not.toHaveProperty('ownerCodes');
    expect(updated.operationPolicy).not.toHaveProperty('allowReceiving');
  });

  it('[Review][Patch] hydrates a "boolean-tolerant" string value (case-insensitive "true"/"false") the same as a real boolean, for the 3 keys BE actually stores/enforces that way', () => {
    const stringTolerantProfile: LocationProfile = {
      ...profile,
      eligibilityPolicy: { putawayBlocked: 'True' },
      operationPolicy: { putawayBlocked: 'FALSE', replenishmentAllowed: 'false' },
    };

    const values = locationProfileToFormValues(stringTolerantProfile);

    expect(values.eligibilityPutawayBlocked).toBe(true);
    expect(values.operationPutawayBlocked).toBe(false);
    expect(values.operationReplenishmentAllowed).toBe('false');
  });

  it('[Review][Patch] operationPutawayAllowed stays strict (not tolerant of a string) since its BE type is plain boolean, not boolean-tolerant', () => {
    const values = locationProfileToFormValues({
      ...profile,
      operationPolicy: { putawayAllowed: 'false' } as unknown as OperationPolicy,
    });

    expect(values.operationPutawayAllowed).toBe('unset');
  });

  it('[Review][Patch] a "boolean-tolerant" value survives an untouched save instead of being silently dropped/flipped (the read+merge interaction that caused data loss)', () => {
    const seededProfile: LocationProfile = {
      ...profile,
      eligibilityPolicy: { putawayBlocked: 'true' },
      operationPolicy: { putawayAllowed: false, replenishmentAllowed: 'false', pickFace: true },
    };
    const values = locationProfileToFormValues(seededProfile);

    const updated = toUpdateLocationProfileInput(values, seededProfile);

    expect(updated.eligibilityPolicy).toMatchObject({ putawayBlocked: true });
    expect(updated.operationPolicy).toMatchObject({ replenishmentAllowed: false });
  });

  it('hydrates a pre-existing profile with free-form legacy JSON without throwing, defaulting every field to its safe/unset value (AC5)', () => {
    expect(() => locationProfileToFormValues(legacyProfile)).not.toThrow();

    const values = locationProfileToFormValues(legacyProfile);
    expect(values.requireCapacityQty).toBe(false);
    expect(values.eligibilityPutawayBlocked).toBe(false);
    expect(values.requiredTemperatureClass).toBeUndefined();
    expect(values.operationPutawayAllowed).toBe('unset');
    expect(values.mixSkuPolicy).toBe('allow');
  });
});
