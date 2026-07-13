import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import type { WarehouseType } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import { MASTER_DATA_STATUS_LABELS } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import {
  warehouseTypeFormSchema,
  type WarehouseTypeFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

const WAREHOUSE_TYPE_STATUS_OPTIONS = (['Active', 'Inactive'] as const).map((value) => ({
  value,
  label: MASTER_DATA_STATUS_LABELS[value],
}));

interface WarehouseTypeFormProps {
  initialValue?: WarehouseType;
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: WarehouseTypeFormValues) => void;
}

export function WarehouseTypeForm({
  initialValue,
  disabled = false,
  pending = false,
  submitLabel,
  onSubmit,
}: WarehouseTypeFormProps) {
  const isEditing = Boolean(initialValue);
  const form = useForm<WarehouseTypeFormValues>({
    resolver: zodResolver(warehouseTypeFormSchema),
    defaultValues: {
      warehouseTypeCode: initialValue?.warehouseTypeCode ?? '',
      warehouseTypeName: initialValue?.warehouseTypeName ?? '',
      description: initialValue?.description ?? '',
      status: initialValue?.status ?? 'Active',
      sourceSystem: initialValue?.sourceSystem ?? '',
      referenceId: initialValue?.referenceId ?? '',
      reasonCode: '',
    },
  });
  const reasonCode = form.watch('reasonCode');
  const status = form.watch('status');
  const { ref: statusRef } = form.register('status');
  const { ref: reasonCodeRef } = form.register('reasonCode');

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        Mã loại kho
        <Input aria-label="Mã loại kho" disabled={disabled} readOnly={isEditing} {...form.register('warehouseTypeCode')} />
        {isEditing ? (
          <span className="text-muted-foreground text-xs">Mã loại kho không đổi sau khi tạo.</span>
        ) : null}
        {form.formState.errors.warehouseTypeCode && (
          <span className="text-destructive text-xs">
            {form.formState.errors.warehouseTypeCode.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Tên loại kho
        <Input aria-label="Tên loại kho" disabled={disabled} {...form.register('warehouseTypeName')} />
        {form.formState.errors.warehouseTypeName && (
          <span className="text-destructive text-xs">
            {form.formState.errors.warehouseTypeName.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Mô tả
        <Input disabled={disabled} {...form.register('description')} />
      </label>
      <ComboboxSelect
        ref={statusRef}
        id="warehouse-type-status"
        name="status"
        label="Trạng thái"
        value={status}
        placeholder="Chọn trạng thái"
        options={WAREHOUSE_TYPE_STATUS_OPTIONS}
        disabled={disabled}
        onChange={(value) =>
          form.setValue('status', value as WarehouseTypeFormValues['status'], {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
      <div>
        <ReasonCodeSelect
          ref={reasonCodeRef}
          id="warehouse-type-reason-code"
          name="reasonCode"
          label="Mã lý do"
          value={reasonCode}
          action={isEditing ? 'Update' : 'Create'}
          objectType="Warehouse"
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
