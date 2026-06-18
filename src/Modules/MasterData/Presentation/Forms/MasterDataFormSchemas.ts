import { z } from 'zod';

import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataEntities';

const requiredText = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalNullableText = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).nullable().optional(),
  );

const optionalNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().nonnegative().optional(),
);

const optionalInteger = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().int().nonnegative().optional(),
);

export const masterDataStatusSchema = z.enum(['Active', 'Inactive']);
export const locationStatusSchema = z.enum(['Active', 'Inactive', 'Blocked', 'Maintenance']);

export const siteFormSchema = z.object({
  siteCode: requiredText(50, 'Site code is required'),
  siteName: requiredText(255, 'Site name is required'),
  status: masterDataStatusSchema,
  sourceSystem: optionalText(100),
  referenceId: optionalText(100),
});

export const warehouseFormSchema = z.object({
  siteId: requiredText(36, 'Site is required'),
  warehouseCode: requiredText(50, 'Warehouse code is required'),
  warehouseName: requiredText(255, 'Warehouse name is required'),
  warehouseTypeCode: requiredText(50, 'Warehouse type is required'),
  status: masterDataStatusSchema,
  timezone: optionalText(100),
  sourceSystem: optionalText(100),
  referenceId: optionalText(100),
});

export const zoneFormSchema = z.object({
  warehouseId: requiredText(36, 'Warehouse is required'),
  zoneCode: requiredText(50, 'Zone code is required'),
  zoneName: requiredText(255, 'Zone name is required'),
  zoneType: requiredText(50, 'Zone type is required'),
  status: masterDataStatusSchema,
  sequence: optionalInteger,
  temperatureClass: optionalText(50),
});

export const locationFormSchema = z.object({
  warehouseId: requiredText(36, 'Warehouse is required'),
  zoneId: requiredText(36, 'Zone is required'),
  parentLocationId: z
    .string()
    .trim()
    .min(1, 'Parent location cannot be empty')
    .max(36)
    .nullable()
    .optional(),
  locationCode: requiredText(80, 'Location code is required'),
  locationName: requiredText(255, 'Location name is required'),
  locationType: requiredText(50, 'Location type is required'),
  locationProfileId: requiredText(36, 'Location profile is required'),
  locationStatus: locationStatusSchema,
  capacityQty: optionalNumber,
  capacityVolume: optionalNumber,
  capacityWeight: optionalNumber,
  palletSlot: optionalInteger,
  temperatureClass: optionalNullableText(50),
  dgCompatibilityGroup: optionalNullableText(50),
  bondedFlag: z.boolean().optional(),
  ownerRestriction: optionalNullableText(100),
  mixSkuPolicy: optionalNullableText(50),
  mixLotPolicy: optionalNullableText(50),
  mixOwnerPolicy: optionalNullableText(50),
  pickSequence: optionalInteger,
  putawaySequence: optionalInteger,
  sourceSystem: optionalNullableText(100),
  referenceId: optionalNullableText(100),
});

export type SiteFormValues = z.infer<typeof siteFormSchema>;
export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;
export type ZoneFormValues = z.infer<typeof zoneFormSchema>;
export type LocationFormValues = z.infer<typeof locationFormSchema>;

export interface LocationProfileOption {
  value: string;
  label: string;
  /** True when this option is the currently-assigned profile that is no longer in the active list. */
  unavailable: boolean;
}

/**
 * Builds the `<select>` options for a Location's profile. When the location's
 * current profile is not part of the active list (e.g. it was archived), the
 * current profile id is surfaced as an explicit option so the rendered select
 * matches the form value instead of silently snapping to the first option.
 */
export function buildLocationProfileOptions(
  profiles: LocationProfile[],
  currentProfileId?: string | null,
): LocationProfileOption[] {
  const options = profiles.map<LocationProfileOption>((profile) => ({
    value: profile.id,
    label: `${profile.profileCode} - ${profile.profileName}`,
    unavailable: false,
  }));

  if (currentProfileId && !profiles.some((profile) => profile.id === currentProfileId)) {
    return [{ value: currentProfileId, label: `${currentProfileId} (unavailable)`, unavailable: true }, ...options];
  }

  return options;
}
