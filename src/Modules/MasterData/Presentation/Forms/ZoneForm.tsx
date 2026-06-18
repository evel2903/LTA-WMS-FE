import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { Zone } from '@modules/MasterData/Domain/Types/MasterDataEntities';
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
    },
  });

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <input type="hidden" {...form.register('warehouseId')} />
      <label className="grid gap-1 text-sm">
        Zone code
        <Input disabled={disabled} {...form.register('zoneCode')} />
        {form.formState.errors.zoneCode && (
          <span className="text-destructive text-xs">{form.formState.errors.zoneCode.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Zone name
        <Input disabled={disabled} {...form.register('zoneName')} />
      </label>
      <label className="grid gap-1 text-sm">
        Zone type
        <Input disabled={disabled} {...form.register('zoneType')} />
      </label>
      <label className="grid gap-1 text-sm">
        Status
        <select className="h-9 rounded-md border bg-transparent px-3 text-sm" disabled={disabled} {...form.register('status')}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </label>
      <Button type="submit" disabled={disabled || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
