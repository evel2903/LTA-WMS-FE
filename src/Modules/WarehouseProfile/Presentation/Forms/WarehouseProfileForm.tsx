import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { WarehouseProfile } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfile';
import {
  warehouseProfileFormSchema,
  type WarehouseProfileFormValues,
} from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileFormSchema';

interface WarehouseProfileFormProps {
  initialValue?: WarehouseProfile;
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  conflict?: string;
  onSubmit: (values: WarehouseProfileFormValues) => void;
}

const SCOPE_FIELDS: { name: keyof WarehouseProfileFormValues; label: string }[] = [
  { name: 'warehouseId', label: 'Warehouse ID' },
  { name: 'zoneId', label: 'Zone ID' },
  { name: 'locationType', label: 'Location type' },
  { name: 'ownerId', label: 'Owner ID' },
  { name: 'skuId', label: 'SKU ID' },
  { name: 'itemClass', label: 'Item class' },
  { name: 'orderType', label: 'Order type' },
  { name: 'customerId', label: 'Customer ID' },
  { name: 'supplierId', label: 'Supplier ID' },
];

export function WarehouseProfileForm({
  initialValue,
  disabled = false,
  pending = false,
  submitLabel,
  conflict,
  onSubmit,
}: WarehouseProfileFormProps) {
  const form = useForm<WarehouseProfileFormValues>({
    resolver: zodResolver(warehouseProfileFormSchema),
    defaultValues: {
      profileCode: initialValue?.profileCode ?? '',
      profileName: initialValue?.profileName ?? '',
      warehouseTypeCode: initialValue?.warehouseTypeCode ?? '',
      effectiveFrom: initialValue?.effectiveFrom?.slice(0, 10) ?? '',
      effectiveTo: initialValue?.effectiveTo?.slice(0, 10) ?? '',
      warehouseId: initialValue?.warehouseId ?? '',
      zoneId: initialValue?.zoneId ?? '',
      locationType: initialValue?.locationType ?? '',
      ownerId: initialValue?.ownerId ?? '',
      skuId: initialValue?.skuId ?? '',
      itemClass: initialValue?.itemClass ?? '',
      orderType: initialValue?.orderType ?? '',
      customerId: initialValue?.customerId ?? '',
      supplierId: initialValue?.supplierId ?? '',
    },
  });
  const errors = form.formState.errors;

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        Profile code
        <Input disabled={disabled} {...form.register('profileCode')} />
        {errors.profileCode && (
          <span className="text-destructive text-xs">{errors.profileCode.message}</span>
        )}
        {conflict && (
          <span className="text-destructive text-xs" role="alert">
            {conflict}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Profile name
        <Input disabled={disabled} {...form.register('profileName')} />
        {errors.profileName && (
          <span className="text-destructive text-xs">{errors.profileName.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Warehouse type code
        <Input disabled={disabled} {...form.register('warehouseTypeCode')} />
        {errors.warehouseTypeCode && (
          <span className="text-destructive text-xs">{errors.warehouseTypeCode.message}</span>
        )}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          Effective from
          <Input type="date" disabled={disabled} {...form.register('effectiveFrom')} />
          {errors.effectiveFrom && (
            <span className="text-destructive text-xs">{errors.effectiveFrom.message}</span>
          )}
        </label>
        <label className="grid gap-1 text-sm">
          Effective to
          <Input type="date" disabled={disabled} {...form.register('effectiveTo')} />
          {errors.effectiveTo && (
            <span className="text-destructive text-xs">{errors.effectiveTo.message}</span>
          )}
        </label>
      </div>

      <fieldset className="grid gap-2 rounded-md border p-3">
        <legend className="text-muted-foreground px-1 text-xs">
          Scope (leave blank for wildcard)
        </legend>
        {SCOPE_FIELDS.map((field) => (
          <label key={field.name} className="grid gap-1 text-sm">
            {field.label}
            <Input disabled={disabled} {...form.register(field.name)} />
          </label>
        ))}
      </fieldset>

      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
