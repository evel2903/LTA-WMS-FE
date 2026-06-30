import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { Warehouse, WarehouseType } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import {
  buildWarehouseTypeOptions,
  warehouseFormSchema,
  type WarehouseFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

interface WarehouseFormProps {
  siteId?: string;
  initialValue?: Warehouse;
  warehouseTypes?: WarehouseType[];
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: WarehouseFormValues) => void;
}

export function WarehouseForm({
  siteId,
  initialValue,
  warehouseTypes = [],
  disabled = false,
  pending = false,
  submitLabel,
  onSubmit,
}: WarehouseFormProps) {
  const warehouseTypeOptions = buildWarehouseTypeOptions(
    warehouseTypes,
    initialValue?.warehouseTypeCode,
  );
  const hasCurrentWarehouseType = Boolean(initialValue?.warehouseTypeCode);
  const hasSelectableWarehouseType = warehouseTypeOptions.length > 0;
  const canSubmit = !disabled && !pending && (hasCurrentWarehouseType || hasSelectableWarehouseType);
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      siteId: initialValue?.siteId ?? siteId ?? '',
      warehouseCode: initialValue?.warehouseCode ?? '',
      warehouseName: initialValue?.warehouseName ?? '',
      warehouseTypeCode: initialValue?.warehouseTypeCode ?? warehouseTypeOptions[0]?.value ?? '',
      status: initialValue?.status ?? 'Active',
      timezone: initialValue?.timezone ?? 'Asia/Bangkok',
      sourceSystem: initialValue?.sourceSystem ?? '',
      referenceId: initialValue?.referenceId ?? '',
      reasonCode: '',
    },
  });
  const reasonCode = form.watch('reasonCode');
  const reasonAction = initialValue ? 'Update' : 'Create';

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <input type="hidden" {...form.register('siteId')} />
      <label className="grid gap-1 text-sm">Mã kho<Input disabled={disabled} {...form.register('warehouseCode')} />
        {form.formState.errors.warehouseCode && (
          <span className="text-destructive text-xs">
            {form.formState.errors.warehouseCode.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Tên kho<Input disabled={disabled} {...form.register('warehouseName')} />
      </label>
      <label className="grid gap-1 text-sm">Loại kho<select aria-label="Loại kho" className="h-9 rounded-md border bg-transparent px-3 text-sm" disabled={disabled || !hasSelectableWarehouseType} {...form.register('warehouseTypeCode')}>
          {warehouseTypeOptions.length === 0 ? (
            <option value="">Chưa có loại kho đang hoạt động</option>
          ) : null}
          {warehouseTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {warehouseTypeOptions.some((option) => option.unavailable) && (
          <span className="text-muted-foreground text-xs">
            Mã hiện tại chưa có trong danh mục loại kho.
          </span>
        )}
        {!hasSelectableWarehouseType && !hasCurrentWarehouseType && (
          <span className="text-muted-foreground text-xs">
            Tải hoặc tạo loại kho đang hoạt động trước khi lưu kho.
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Trạng thái<select className="h-9 rounded-md border bg-transparent px-3 text-sm" disabled={disabled} {...form.register('status')}>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Không hoạt động</option>
        </select>
      </label>
      <div>
        <ReasonCodeSelect
          id="warehouse-reason-code"
          name="reasonCode"
          label="Mã lý do"
          value={reasonCode}
          action={reasonAction}
          objectType="Warehouse"
          disabled={disabled}
          onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
        />
        {form.formState.errors.reasonCode && (
          <span className="text-destructive text-xs">{form.formState.errors.reasonCode.message}</span>
        )}
      </div>
      <Button type="submit" disabled={!canSubmit}>
        {submitLabel}
      </Button>
    </form>
  );
}
