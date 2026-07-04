import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';

import { ROUTES } from '@app/Config/Routes';
import { Alert, AlertAction, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import type {
  Location,
  LocationProfile,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  buildLocationProfileOptions,
  locationFormSchema,
  type LocationFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

export type LocationFormDirtyFields = Partial<Record<keyof LocationFormValues, boolean | object>>;

interface LocationFormProps {
  warehouseId?: string;
  zoneId?: string;
  parentLocationId?: string | null;
  initialValue?: Location;
  locationProfiles: LocationProfile[];
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: LocationFormValues, dirtyFields: LocationFormDirtyFields) => void;
}

function ManageProfilesLink() {
  return (
    <Link
      to={ROUTES.FOUNDATION.LOCATION_PROFILES}
      className="text-primary text-xs font-medium hover:underline"
    >Quản lý hồ sơ</Link>
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
      aisleCode: initialValue?.aisleCode ?? '',
      rackCode: initialValue?.rackCode ?? '',
      levelCode: initialValue?.levelCode ?? '',
      binCode: initialValue?.binCode ?? '',
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
      reasonCode: '',
    },
  });
  const reasonCode = form.watch('reasonCode');
  const reasonAction = initialValue ? 'Update' : 'Create';

  if (!hasProfiles) {
    return (
      <Alert role="status" variant="warning">
        <AlertDescription>
          Chưa có hồ sơ vị trí đang hoạt động. Hãy quản lý hồ sơ trước khi thêm vị trí.
        </AlertDescription>
        <AlertAction>
          <ManageProfilesLink />
        </AlertAction>
      </Alert>
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={form.handleSubmit((values) => onSubmit(values, form.formState.dirtyFields))}
    >
      <input type="hidden" {...form.register('warehouseId')} />
      <input type="hidden" {...form.register('zoneId')} />
      <input type="hidden" {...form.register('parentLocationId')} />
      <fieldset className="grid gap-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-semibold">Thông tin cơ bản</legend>
        <label className="grid gap-1 text-sm">Mã vị trí<Input disabled={disabled} {...form.register('locationCode')} />
          {form.formState.errors.locationCode && (
            <span className="text-destructive text-xs">
              {form.formState.errors.locationCode.message}
            </span>
          )}
        </label>
        <label className="grid gap-1 text-sm">Tên vị trí<Input disabled={disabled} {...form.register('locationName')} />
        </label>
        <label className="grid gap-1 text-sm">Loại vị trí<Input disabled={disabled} {...form.register('locationType')} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="flex items-center justify-between gap-2">Hồ sơ vị trí<ManageProfilesLink />
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
        <label className="grid gap-1 text-sm">Trạng thái<select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            disabled={disabled}
            {...form.register('locationStatus')}
          >
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Không hoạt động</option>
            <option value="Blocked">Bị khóa</option>
            <option value="Maintenance">Bảo trì</option>
          </select>
        </label>
      </fieldset>
      <fieldset className="grid gap-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-semibold">Địa chỉ vật lý</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Dãy
            <Input disabled={disabled} {...form.register('aisleCode')} />
          </label>
          <label className="grid gap-1 text-sm">
            Kệ
            <Input disabled={disabled} {...form.register('rackCode')} />
          </label>
          <label className="grid gap-1 text-sm">
            Tầng
            <Input disabled={disabled} {...form.register('levelCode')} />
          </label>
          <label className="grid gap-1 text-sm">
            Ô
            <Input disabled={disabled} {...form.register('binCode')} />
          </label>
        </div>
      </fieldset>
      <label className="grid gap-1 text-sm">Sức chứa<Input type="number" disabled={disabled} {...form.register('capacityQty')} />
      </label>
      <div>
        <ReasonCodeSelect
          id="location-reason-code"
          name="reasonCode"
          label="Mã lý do"
          value={reasonCode}
          action={reasonAction}
          objectType="Location"
          disabled={disabled}
          onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
        />
        {form.formState.errors.reasonCode && (
          <span className="text-destructive text-xs">{form.formState.errors.reasonCode.message}</span>
        )}
      </div>
      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
