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
  { name: 'warehouseId', label: 'ID kho' },
  { name: 'zoneId', label: 'ID khu vực' },
  { name: 'locationType', label: 'Loại vị trí' },
  { name: 'ownerId', label: 'ID chủ hàng' },
  { name: 'skuId', label: 'SKU ID' },
  { name: 'itemClass', label: 'Nhóm hàng' },
  { name: 'orderType', label: 'Loại đơn' },
  { name: 'customerId', label: 'ID khách hàng' },
  { name: 'supplierId', label: 'ID nhà cung cấp' },
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
      <label className="grid gap-1 text-sm">Mã hồ sơ<Input disabled={disabled} {...form.register('profileCode')} />
        {errors.profileCode && (
          <span className="text-destructive text-xs">{errors.profileCode.message}</span>
        )}
        {conflict && (
          <span className="text-destructive text-xs" role="alert">
            {conflict}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Tên hồ sơ<Input disabled={disabled} {...form.register('profileName')} />
        {errors.profileName && (
          <span className="text-destructive text-xs">{errors.profileName.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Mã loại kho<Input disabled={disabled} {...form.register('warehouseTypeCode')} />
        {errors.warehouseTypeCode && (
          <span className="text-destructive text-xs">{errors.warehouseTypeCode.message}</span>
        )}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">Hiệu lực từ<Input type="date" disabled={disabled} {...form.register('effectiveFrom')} />
          {errors.effectiveFrom && (
            <span className="text-destructive text-xs">{errors.effectiveFrom.message}</span>
          )}
        </label>
        <label className="grid gap-1 text-sm">Hiệu lực đến<Input type="date" disabled={disabled} {...form.register('effectiveTo')} />
          {errors.effectiveTo && (
            <span className="text-destructive text-xs">{errors.effectiveTo.message}</span>
          )}
        </label>
      </div>

      <fieldset className="grid gap-2 rounded-md border p-3">
        <legend className="text-muted-foreground px-1 text-xs">Phạm vi (để trống nếu dùng wildcard)</legend>
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
