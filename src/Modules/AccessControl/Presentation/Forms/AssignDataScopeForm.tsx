import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { DATA_SCOPE_TYPES } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type { AssignDataScopeInput } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import {
  assignDataScopeFormSchema,
  type AssignDataScopeFormValues,
} from '@modules/AccessControl/Presentation/Forms/AssignmentFormSchema';
import { dataScopeTypeLabel } from '@modules/AccessControl/Presentation/Constants/AccessControlDisplayText';

interface AssignDataScopeFormProps {
  disabled?: boolean;
  pending?: boolean;
  conflict?: string;
  onSubmit: (input: AssignDataScopeInput) => void;
}

export function AssignDataScopeForm({
  disabled = false,
  pending = false,
  conflict,
  onSubmit,
}: AssignDataScopeFormProps) {
  const form = useForm<AssignDataScopeFormValues>({
    resolver: zodResolver(assignDataScopeFormSchema),
    defaultValues: { scopeType: 'WAREHOUSE', includeAll: false, scopeValueCode: '', scopeValueId: '' },
  });
  const errors = form.formState.errors;
  const includeAll = form.watch('includeAll');
  const { setValue } = form;

  useEffect(() => {
    if (!includeAll) return;

    setValue('scopeValueCode', '', { shouldDirty: true, shouldValidate: true });
    setValue('scopeValueId', '', { shouldDirty: true, shouldValidate: true });
  }, [includeAll, setValue]);

  return (
    <form
      className="grid gap-2"
      onSubmit={form.handleSubmit((values) =>
        onSubmit({
          scopeType: values.scopeType,
          includeAll: values.includeAll,
          scopeValueCode: values.scopeValueCode,
          scopeValueId: values.scopeValueId,
        }),
      )}
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-52 gap-1 text-sm">Loại phạm vi<select
            id="assign-data-scope-type"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            disabled={disabled}
            {...form.register('scopeType')}
          >
            {DATA_SCOPE_TYPES.map((type) => (
              <option key={type} value={type}>
                {dataScopeTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input id="assign-data-scope-include-all" type="checkbox" disabled={disabled} {...form.register('includeAll')} />
          Áp dụng tất cả giá trị trong phạm vi
        </label>
      </div>
      {!includeAll && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Mã giá trị phạm vi<Input id="assign-data-scope-value-code" disabled={disabled} {...form.register('scopeValueCode')} placeholder="Ví dụ: WH-01" />
          </label>
          <label className="grid gap-1 text-sm">ID giá trị phạm vi<Input id="assign-data-scope-value-id" disabled={disabled} {...form.register('scopeValueId')} placeholder="UUID (không bắt buộc)" />
          </label>
        </div>
      )}
      {errors.scopeValueCode && (
        <span className="text-destructive text-xs">{errors.scopeValueCode.message}</span>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={disabled || pending}>
          Gán phạm vi
        </Button>
      </div>
      {conflict && (
        <Alert variant="destructive" role="alert" className="w-full">
          <AlertDescription>{conflict}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
