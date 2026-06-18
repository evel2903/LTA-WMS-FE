import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import {
  uomFormSchema,
  type UomFormValues,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';

interface UomFormProps {
  initialValue?: Uom;
  disabled?: boolean;
  pending?: boolean;
  submitLabel: string;
  /** Inline 409-conflict message surfaced next to the code field (AC3). */
  conflict?: string;
  onSubmit: (values: UomFormValues) => void;
}

export function UomForm({
  initialValue,
  disabled = false,
  pending = false,
  submitLabel,
  conflict,
  onSubmit,
}: UomFormProps) {
  const form = useForm<UomFormValues>({
    resolver: zodResolver(uomFormSchema),
    defaultValues: {
      uomCode: initialValue?.uomCode ?? '',
      uomName: initialValue?.uomName ?? '',
      status: initialValue?.status ?? 'Active',
      uomType: initialValue?.uomType ?? '',
      decimalPrecision: initialValue?.decimalPrecision ?? 0,
      sourceSystem: initialValue?.sourceSystem ?? '',
      referenceId: initialValue?.referenceId ?? '',
    },
  });

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        UOM code
        <Input disabled={disabled} {...form.register('uomCode')} />
        {form.formState.errors.uomCode && (
          <span className="text-destructive text-xs">{form.formState.errors.uomCode.message}</span>
        )}
        {conflict && (
          <span className="text-destructive text-xs" role="alert">
            {conflict}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        UOM name
        <Input disabled={disabled} {...form.register('uomName')} />
        {form.formState.errors.uomName && (
          <span className="text-destructive text-xs">{form.formState.errors.uomName.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        UOM type
        <Input disabled={disabled} {...form.register('uomType')} />
      </label>
      <label className="grid gap-1 text-sm">
        Decimal precision (0-6)
        <Input type="number" min={0} max={6} disabled={disabled} {...form.register('decimalPrecision')} />
        {form.formState.errors.decimalPrecision && (
          <span className="text-destructive text-xs">
            {form.formState.errors.decimalPrecision.message}
          </span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Status
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('status')}
        >
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
