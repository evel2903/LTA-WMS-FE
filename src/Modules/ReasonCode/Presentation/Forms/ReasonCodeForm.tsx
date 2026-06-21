import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { ReasonCode } from '@modules/ReasonCode/Domain/Entities/ReasonCode';
import {
  ACTION_CODES,
  OBJECT_TYPES,
  REASON_GROUPS,
  REASON_GROUP_LABELS,
  ROLE_CODES,
  type ActionCode,
  type ObjectType,
  type RoleCode,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';
import {
  reasonCodeFormSchema,
  type ReasonCodeFormValues,
} from '@modules/ReasonCode/Presentation/Forms/ReasonCodeFormSchema';

interface ReasonCodeFormProps {
  mode: 'create' | 'edit';
  initialValue?: ReasonCode;
  disabled?: boolean;
  pending?: boolean;
  conflict?: string;
  onSubmit: (values: ReasonCodeFormValues) => void;
}

/**
 * Controlled multi-checkbox group (value/onChange) — NOT register-based. RHF does not
 * reliably pre-check a checkbox group from a defaultValues array, which would drop an
 * existing reason code's actions/objects on edit; controlling it from form state fixes that.
 */
function CheckboxGroup({
  legend,
  options,
  value,
  disabled,
  error,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  value: string[];
  disabled?: boolean;
  error?: string;
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string, checked: boolean) =>
    onChange(checked ? [...value, option] : value.filter((item) => item !== option));

  return (
    <fieldset className="grid gap-1 rounded-md border p-3">
      <legend className="text-muted-foreground px-1 text-xs">{legend}</legend>
      <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              value={option}
              disabled={disabled}
              checked={value.includes(option)}
              onChange={(event) => toggle(option, event.target.checked)}
            />
            {option}
          </label>
        ))}
      </div>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </fieldset>
  );
}

export function ReasonCodeForm({
  mode,
  initialValue,
  disabled = false,
  pending = false,
  conflict,
  onSubmit,
}: ReasonCodeFormProps) {
  const form = useForm<ReasonCodeFormValues>({
    resolver: zodResolver(reasonCodeFormSchema),
    defaultValues: {
      reasonCode: initialValue?.reasonCode ?? '',
      reasonGroup: initialValue?.reasonGroup ?? 'RULE_OVERRIDE',
      description: initialValue?.description ?? '',
      appliesToActions: initialValue?.appliesToActions ?? [],
      appliesToObjects: initialValue?.appliesToObjects ?? [],
      evidenceRequired: initialValue?.evidenceRequired ?? false,
      approvalRequired: initialValue?.approvalRequired ?? false,
      allowedRoleCodes: initialValue?.allowedRoleCodes ?? [],
      status: initialValue?.status ?? 'ACTIVE',
      effectiveFrom: initialValue?.effectiveFrom?.slice(0, 10) ?? '',
      effectiveTo: initialValue?.effectiveTo?.slice(0, 10) ?? '',
    },
  });
  const errors = form.formState.errors;
  const isEdit = mode === 'edit';

  const actions = form.watch('appliesToActions');
  const objects = form.watch('appliesToObjects');
  const roles = form.watch('allowedRoleCodes');

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        Reason code
        {/* Code is immutable on edit (BE rejects changes) — render read-only. */}
        <Input disabled={disabled || isEdit} readOnly={isEdit} {...form.register('reasonCode')} />
        {errors.reasonCode && (
          <span className="text-destructive text-xs">{errors.reasonCode.message}</span>
        )}
        {conflict && (
          <span className="text-destructive text-xs" role="alert">
            {conflict}
          </span>
        )}
      </label>

      <label className="grid gap-1 text-sm">
        Category
        <select
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('reasonGroup')}
        >
          {REASON_GROUPS.map((group) => (
            <option key={group} value={group}>
              {REASON_GROUP_LABELS[group]}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm">
        Description
        <Input disabled={disabled} {...form.register('description')} />
      </label>

      <CheckboxGroup
        legend="Applies to actions"
        options={ACTION_CODES}
        value={actions}
        disabled={disabled}
        error={errors.appliesToActions?.message}
        onChange={(next) => form.setValue('appliesToActions', next as ActionCode[], { shouldValidate: true })}
      />
      <CheckboxGroup
        legend="Applies to objects"
        options={OBJECT_TYPES}
        value={objects}
        disabled={disabled}
        error={errors.appliesToObjects?.message}
        onChange={(next) => form.setValue('appliesToObjects', next as ObjectType[], { shouldValidate: true })}
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={disabled} {...form.register('evidenceRequired')} />
          Evidence required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={disabled} {...form.register('approvalRequired')} />
          Approval required
        </label>
      </div>

      <CheckboxGroup
        legend="Allowed roles (empty = no restriction)"
        options={ROLE_CODES}
        value={roles}
        disabled={disabled}
        onChange={(next) => form.setValue('allowedRoleCodes', next as RoleCode[], { shouldValidate: true })}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          Effective from
          <Input type="date" disabled={disabled} {...form.register('effectiveFrom')} />
        </label>
        <label className="grid gap-1 text-sm">
          Effective to
          <Input type="date" disabled={disabled} {...form.register('effectiveTo')} />
          {errors.effectiveTo && (
            <span className="text-destructive text-xs">{errors.effectiveTo.message}</span>
          )}
        </label>
      </div>

      {isEdit && (
        <div className="grid gap-1">
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              disabled={disabled}
              {...form.register('status')}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>
          {initialValue && (
            <span className="text-muted-foreground text-xs">Version {initialValue.version}</span>
          )}
        </div>
      )}

      <Button type="submit" disabled={disabled || pending}>
        {isEdit ? 'Update reason code' : 'Create reason code'}
      </Button>
    </form>
  );
}
