import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { Zone } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import {
  zoneFormSchema,
  type ZoneFormValues,
} from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

interface ZoneFormProps {
  warehouseId?: string;
  initialValue?: Zone;
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: ZoneFormValues) => void;
}

export function ZoneForm({
  warehouseId,
  initialValue,
  disabled = false,
  pending = false,
  submitLabel,
  onSubmit,
}: ZoneFormProps) {
  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      warehouseId: initialValue?.warehouseId ?? warehouseId ?? '',
      zoneCode: initialValue?.zoneCode ?? '',
      zoneName: initialValue?.zoneName ?? '',
      zoneType: initialValue?.zoneType ?? 'Storage',
      status: initialValue?.status ?? 'Active',
      sequence: initialValue?.sequence ?? undefined,
      temperatureClass: initialValue?.temperatureClass ?? '',
      reasonCode: '',
    },
  });
  const reasonCode = form.watch('reasonCode');
  const reasonAction = initialValue ? 'Update' : 'Create';

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <input type="hidden" {...form.register('warehouseId')} />
      <label className="grid gap-1 text-sm">Mã khu vực<Input disabled={disabled} {...form.register('zoneCode')} />
        {form.formState.errors.zoneCode && (
          <span className="text-destructive text-xs">{form.formState.errors.zoneCode.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Tên khu vực<Input disabled={disabled} {...form.register('zoneName')} />
      </label>
      <label className="grid gap-1 text-sm">Loại khu vực<Input disabled={disabled} {...form.register('zoneType')} />
      </label>
      <label className="grid gap-1 text-sm">Trạng thái<select className="h-9 rounded-md border bg-transparent px-3 text-sm" disabled={disabled} {...form.register('status')}>
          <option value="Active">Đang hoạt động</option>
          <option value="Inactive">Không hoạt động</option>
        </select>
      </label>
      <div>
        <ReasonCodeSelect
          id="zone-reason-code"
          name="reasonCode"
          label="Mã lý do"
          value={reasonCode}
          action={reasonAction}
          objectType="Zone"
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
