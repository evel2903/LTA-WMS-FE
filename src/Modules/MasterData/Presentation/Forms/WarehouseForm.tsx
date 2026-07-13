import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import type { Warehouse, WarehouseType } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { MASTER_DATA_STATUS_LABELS } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import {
  buildWarehouseTypeOptions,
  warehouseFormSchema,
  type WarehouseFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

const WAREHOUSE_STATUS_OPTIONS = (['Active', 'Inactive'] as const).map((value) => ({
  value,
  label: MASTER_DATA_STATUS_LABELS[value],
}));

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
  const status = form.watch('status');
  const warehouseTypeCode = form.watch('warehouseTypeCode');
  const reasonAction = initialValue ? 'Update' : 'Create';
  // register() here is ref-only (value is driven by watch()/setValue() above) — gives RHF
  // a DOM node to call .focus() on for these fields when shouldFocusError fires on submit.
  const { ref: statusRef } = form.register('status');
  const { ref: warehouseTypeCodeRef } = form.register('warehouseTypeCode');

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
      <div>
        <ComboboxSelect
          ref={warehouseTypeCodeRef}
          id="warehouse-type-code"
          name="warehouseTypeCode"
          label="Loại kho"
          value={warehouseTypeCode}
          placeholder="Chọn loại kho"
          options={warehouseTypeOptions}
          disabled={disabled || !hasSelectableWarehouseType}
          emptyMessage="Chưa có loại kho đang hoạt động"
          onChange={(value) => form.setValue('warehouseTypeCode', value, { shouldDirty: true, shouldValidate: true })}
        />
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
      </div>
      <ComboboxSelect
        ref={statusRef}
        id="warehouse-status"
        name="status"
        label="Trạng thái"
        value={status}
        placeholder="Chọn trạng thái"
        options={WAREHOUSE_STATUS_OPTIONS}
        disabled={disabled}
        onChange={(value) =>
          form.setValue('status', value as WarehouseFormValues['status'], { shouldDirty: true, shouldValidate: true })
        }
      />
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
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
