import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { WarehouseType } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  warehouseTypeFormSchema,
  type WarehouseTypeFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

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
      <label className="grid gap-1 text-sm">
        Trạng thái
        <select className="h-9 rounded-md border bg-transparent px-3 text-sm" disabled={disabled} {...form.register('status')}>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Không hoạt động</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Mã lý do
        <Input disabled={disabled} placeholder="Nếu chính sách yêu cầu" {...form.register('reasonCode')} />
      </label>
      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
