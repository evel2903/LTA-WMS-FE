import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { Owner } from '@modules/MasterData/Domain/Types/CatalogEntities';
import {
  ownerFormSchema,
  type OwnerFormValues,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';

interface OwnerFormProps {
  initialValue?: Owner;
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  /** Inline 409-conflict message surfaced next to the code field (AC3). */
  conflict?: string;
  onSubmit: (values: OwnerFormValues) => void;
}

export function OwnerForm({
  initialValue,
  disabled = false,
  pending = false,
  submitLabel,
  conflict,
  onSubmit,
}: OwnerFormProps) {
  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      ownerCode: initialValue?.ownerCode ?? '',
      ownerName: initialValue?.ownerName ?? '',
      status: initialValue?.status ?? 'Active',
      sourceSystem: initialValue?.sourceSystem ?? '',
      referenceId: initialValue?.referenceId ?? '',
    },
  });

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">Mã chủ hàng<Input disabled={disabled} {...form.register('ownerCode')} />
        {form.formState.errors.ownerCode && (
          <span className="text-destructive text-xs">{form.formState.errors.ownerCode.message}</span>
        )}
        {conflict && (
          <span className="text-destructive text-xs" role="alert">
            {conflict}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Tên chủ hàng<Input disabled={disabled} {...form.register('ownerName')} />
        {form.formState.errors.ownerName && (
          <span className="text-destructive text-xs">{form.formState.errors.ownerName.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Trạng thái<select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('status')}
        >
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
