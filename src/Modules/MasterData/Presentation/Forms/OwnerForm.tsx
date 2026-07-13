import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import type { Owner } from '@modules/MasterData/Domain/Types/CatalogEntities';
import { MASTER_DATA_STATUS_LABELS } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import {
  ownerFormSchema,
  type OwnerFormValues,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';

const OWNER_STATUS_OPTIONS = (['Active', 'Inactive'] as const).map((value) => ({
  value,
  label: MASTER_DATA_STATUS_LABELS[value],
}));

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
  const status = form.watch('status');
  const { ref: statusRef } = form.register('status');

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">Mã chủ hàng<Input disabled={disabled} {...form.register('ownerCode')} />
        {form.formState.errors.ownerCode && (
          <span className="text-destructive text-xs">{form.formState.errors.ownerCode.message}</span>
        )}
      </label>
      {conflict && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{conflict}</AlertDescription>
        </Alert>
      )}
      <label className="grid gap-1 text-sm">Tên chủ hàng<Input disabled={disabled} {...form.register('ownerName')} />
        {form.formState.errors.ownerName && (
          <span className="text-destructive text-xs">{form.formState.errors.ownerName.message}</span>
        )}
      </label>
      <ComboboxSelect
        ref={statusRef}
        id="owner-status"
        name="status"
        label="Trạng thái"
        value={status}
        placeholder="Chọn trạng thái"
        options={OWNER_STATUS_OPTIONS}
        disabled={disabled}
        onChange={(value) =>
          form.setValue('status', value as OwnerFormValues['status'], {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
      <Button type="submit" disabled={disabled || pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
