import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type {
  Location,
  LocationProfile,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  buildLocationProfileOptions,
  locationFormSchema,
  type LocationFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

interface LocationFormProps {
  warehouseId?: string;
  zoneId?: string;
  parentLocationId?: string | null;
  initialValue?: Location;
  locationProfiles: LocationProfile[];
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: LocationFormValues) => void;
}

function ManageProfilesLink() {
  return (
    <Link
      to={ROUTES.FOUNDATION.LOCATION_PROFILES}
      className="text-primary text-xs font-medium hover:underline"
    >
      Manage profiles
    </Link>
  );
}

export function LocationForm({
  warehouseId,
  zoneId,
  parentLocationId = null,
  initialValue,
  locationProfiles,
  disabled = false,
  pending = false,
  submitLabel,
  onSubmit,
}: LocationFormProps) {
  // Include the location's current profile even if it is no longer in the
  // active list, so the rendered select matches the form value.
  const profileOptions = buildLocationProfileOptions(
    locationProfiles,
    initialValue?.locationProfileId,
  );
  const hasProfiles = profileOptions.length > 0;
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      warehouseId: initialValue?.warehouseId ?? warehouseId ?? '',
      zoneId: initialValue?.zoneId ?? zoneId ?? '',
      parentLocationId: initialValue?.parentLocationId ?? parentLocationId,
      locationCode: initialValue?.locationCode ?? '',
      locationName: initialValue?.locationName ?? '',
      locationType: initialValue?.locationType ?? locationProfiles[0]?.locationType ?? '',
      locationProfileId: initialValue?.locationProfileId ?? profileOptions[0]?.value ?? '',
      locationStatus: initialValue?.locationStatus ?? 'Active',
      capacityQty: initialValue?.capacityQty ?? undefined,
      capacityVolume: initialValue?.capacityVolume ?? undefined,
      capacityWeight: initialValue?.capacityWeight ?? undefined,
      palletSlot: initialValue?.palletSlot ?? undefined,
      temperatureClass: initialValue?.temperatureClass ?? '',
      dgCompatibilityGroup: initialValue?.dgCompatibilityGroup ?? '',
      bondedFlag: initialValue?.bondedFlag ?? false,
      ownerRestriction: initialValue?.ownerRestriction ?? '',
      mixSkuPolicy: initialValue?.mixSkuPolicy ?? '',
      mixLotPolicy: initialValue?.mixLotPolicy ?? '',
      mixOwnerPolicy: initialValue?.mixOwnerPolicy ?? '',
      pickSequence: initialValue?.pickSequence ?? undefined,
      putawaySequence: initialValue?.putawaySequence ?? undefined,
      sourceSystem: initialValue?.sourceSystem ?? '',
      referenceId: initialValue?.referenceId ?? '',
    },
  });

  if (!hasProfiles) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <span>No active location profiles. Manage profiles before adding locations.</span>
        <ManageProfilesLink />
      </div>
    );
  }

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <input type="hidden" {...form.register('warehouseId')} />
      <input type="hidden" {...form.register('zoneId')} />
      <input type="hidden" {...form.register('parentLocationId')} />
      <label className="grid gap-1 text-sm">
        Location code
        <Input disabled={disabled} {...form.register('locationCode')} />
        {form.formState.errors.locationCode && (
          <span className="text-destructive text-xs">
            {form.formState.errors.locationCode.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Location name
        <Input disabled={disabled} {...form.register('locationName')} />
      </label>
      <label className="grid gap-1 text-sm">
        Location type
        <Input disabled={disabled} {...form.register('locationType')} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="flex items-center justify-between gap-2">
          Location profile
          <ManageProfilesLink />
        </span>
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('locationProfileId')}
        >
          {profileOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Status
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('locationStatus')}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Blocked">Blocked</option>
          <option value="Maintenance">Maintenance</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Capacity qty
        <Input type="number" disabled={disabled} {...form.register('capacityQty')} />
      </label>
      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
