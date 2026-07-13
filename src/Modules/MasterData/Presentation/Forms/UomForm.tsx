import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import {
  UOM_TYPE_OPTION_VALUES,
  displayUomType,
  toUomTypeRawValue,
} from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import {
  uomFormSchema,
  type UomFormValues,
} from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';

function toUomTypeDisplayValue(value: string | null | undefined) {
  return value ? displayUomType(value) : '';
}

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
      <label className="grid gap-1 text-sm">Mã đơn vị tính<Input disabled={disabled} {...form.register('uomCode')} />
        {form.formState.errors.uomCode && (
          <span className="text-destructive text-xs">{form.formState.errors.uomCode.message}</span>
        )}
      </label>
      {conflict && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{conflict}</AlertDescription>
        </Alert>
      )}
      <label className="grid gap-1 text-sm">Tên đơn vị tính<Input disabled={disabled} {...form.register('uomName')} />
        {form.formState.errors.uomName && (
          <span className="text-destructive text-xs">{form.formState.errors.uomName.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Loại đơn vị tính<Controller
          control={form.control}
          name="uomType"
          render={({ field }) => (
            <Input
              list="uom-type-options"
              name={field.name}
              ref={field.ref}
              placeholder="Nhập hoặc chọn loại đơn vị tính"
              disabled={disabled}
              value={toUomTypeDisplayValue(field.value)}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(toUomTypeRawValue(event.target.value))}
            />
          )}
        />
        <datalist id="uom-type-options">
          {UOM_TYPE_OPTION_VALUES.map((uomType) => (
            <option key={uomType} value={displayUomType(uomType)} />
          ))}
        </datalist>
      </label>
      <label className="grid gap-1 text-sm">Số lẻ thập phân (0-6)<Input type="number" min={0} max={6} disabled={disabled} {...form.register('decimalPrecision')} />
        {form.formState.errors.decimalPrecision && (
          <span className="text-destructive text-xs">
            {form.formState.errors.decimalPrecision.message}
          </span>
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
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
