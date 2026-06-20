import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import {
  DATA_SCOPE_LABELS,
  DATA_SCOPE_TYPES,
} from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type { AssignDataScopeInput } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import {
  assignDataScopeFormSchema,
  type AssignDataScopeFormValues,
} from '@modules/AccessControl/Presentation/Forms/AssignmentFormSchema';

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
        <label className="grid gap-1 text-sm">
          Scope type
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            disabled={disabled}
            {...form.register('scopeType')}
          >
            {DATA_SCOPE_TYPES.map((type) => (
              <option key={type} value={type}>
                {DATA_SCOPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={disabled} {...form.register('includeAll')} />
          Tất cả (IncludeAll)
        </label>
      </div>
      {!includeAll && (
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-sm">
            Scope value code
            <Input disabled={disabled} {...form.register('scopeValueCode')} placeholder="e.g. WH-01" />
          </label>
          <label className="grid gap-1 text-sm">
            Scope value ID
            <Input disabled={disabled} {...form.register('scopeValueId')} placeholder="UUID (optional)" />
          </label>
        </div>
      )}
      {errors.scopeValueCode && (
        <span className="text-destructive text-xs">{errors.scopeValueCode.message}</span>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={disabled || pending}>
          Gán scope
        </Button>
        {conflict && (
          <span className="text-destructive text-xs" role="alert">
            {conflict}
          </span>
        )}
      </div>
    </form>
  );
}
