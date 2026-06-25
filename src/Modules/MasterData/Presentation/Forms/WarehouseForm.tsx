import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { Warehouse } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  warehouseFormSchema,
  type WarehouseFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

interface WarehouseFormProps {
  siteId?: string;
  initialValue?: Warehouse;
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: WarehouseFormValues) => void;
}

export function WarehouseForm({
  siteId,
  initialValue,
  disabled = false,
  pending = false,
  submitLabel,
  onSubmit,
}: WarehouseFormProps) {
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      siteId: initialValue?.siteId ?? siteId ?? '',
      warehouseCode: initialValue?.warehouseCode ?? '',
      warehouseName: initialValue?.warehouseName ?? '',
      warehouseTypeCode: initialValue?.warehouseTypeCode ?? 'WT-01',
      status: initialValue?.status ?? 'Active',
      timezone: initialValue?.timezone ?? 'Asia/Bangkok',
      sourceSystem: initialValue?.sourceSystem ?? '',
      referenceId: initialValue?.referenceId ?? '',
    },
  });

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
      <label className="grid gap-1 text-sm">Loại kho<Input disabled={disabled} {...form.register('warehouseTypeCode')} />
      </label>
      <label className="grid gap-1 text-sm">Trạng thái<select className="h-9 rounded-md border bg-transparent px-3 text-sm" disabled={disabled} {...form.register('status')}>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Không hoạt động</option>
        </select>
      </label>
      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
