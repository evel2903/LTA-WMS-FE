import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import {
  previewContextFormSchema,
  type PreviewContextFormValues,
} from '@modules/WarehouseProfile/Presentation/Forms/WarehouseProfileFormSchema';

interface PreviewContextFormProps {
  disabled?: boolean;
  pending?: boolean;
  /**
   * Seeds the form's default values (e.g. "Preview this profile" pre-fills the
   * selected profile's scope). Because RHF `defaultValues` only apply on mount,
   * callers remount the form with a `key` when `initialValue` changes.
   */
  initialValue?: Partial<PreviewContextFormValues>;
  onSubmit: (values: PreviewContextFormValues) => void;
}

const AXIS_FIELDS: { name: keyof PreviewContextFormValues; label: string }[] = [
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

export function PreviewContextForm({
  disabled = false,
  pending = false,
  initialValue,
  onSubmit,
}: PreviewContextFormProps) {
  const form = useForm<PreviewContextFormValues>({
    resolver: zodResolver(previewContextFormSchema),
    defaultValues: {
      warehouseTypeCode: initialValue?.warehouseTypeCode ?? '',
      warehouseId: initialValue?.warehouseId ?? '',
      zoneId: initialValue?.zoneId ?? '',
      locationType: initialValue?.locationType ?? '',
      ownerId: initialValue?.ownerId ?? '',
      skuId: initialValue?.skuId ?? '',
      itemClass: initialValue?.itemClass ?? '',
      orderType: initialValue?.orderType ?? '',
      customerId: initialValue?.customerId ?? '',
      supplierId: initialValue?.supplierId ?? '',
      reasonCode: initialValue?.reasonCode ?? '',
      evaluatedAt: initialValue?.evaluatedAt ?? '',
    },
  });
  const errors = form.formState.errors;

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">Mã loại kho<Input disabled={disabled} {...form.register('warehouseTypeCode')} />
        {errors.warehouseTypeCode && (
          <span className="text-destructive text-xs">{errors.warehouseTypeCode.message}</span>
        )}
      </label>
      {AXIS_FIELDS.map((field) => (
        <label key={field.name} className="grid gap-1 text-sm">
          {field.label}
          <Input disabled={disabled} {...form.register(field.name)} />
        </label>
      ))}
      <label className="grid gap-1 text-sm">Mã lý do<Input disabled={disabled} {...form.register('reasonCode')} />
      </label>
      <label className="grid gap-1 text-sm">Thời điểm đánh giá (ISO, tùy chọn)<Input disabled={disabled} placeholder="2026-06-19T00:00:00Z" {...form.register('evaluatedAt')} />
      </label>
      <Button type="submit" disabled={disabled || pending}>Chạy preview</Button>
    </form>
  );
}
