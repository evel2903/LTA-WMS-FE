import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import type { ReasonCode } from '@modules/ReasonCode/Domain/Entities/ReasonCode';
import {
  ACTION_CODES,
  OBJECT_TYPES,
  REASON_GROUPS,
  ROLE_CODES,
  type ActionCode,
  type ObjectType,
  type RoleCode,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';
import {
  reasonCodeFormSchema,
  type ReasonCodeFormValues,
} from '@modules/ReasonCode/Presentation/Forms/ReasonCodeFormSchema';
import {
  actionCodeLabel,
  objectTypeLabel,
  reasonCodeStatusLabel,
  reasonGroupLabel,
  roleCodeLabel,
} from '@modules/ReasonCode/Presentation/Constants/ReasonCodeDisplayText';

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
  name,
  options,
  value,
  disabled,
  error,
  optionLabel,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  value: string[];
  disabled?: boolean;
  error?: string;
  optionLabel?: (option: string) => string;
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string, checked: boolean) =>
    onChange(checked ? [...value, option] : value.filter((item) => item !== option));

  return (
    <fieldset className="grid min-w-0 gap-1 rounded-md border p-3">
      <legend className="text-muted-foreground px-1 text-xs">{legend}</legend>
      <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
        {options.map((option) => {
          const inputId = `${name}-${option.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
          return (
            <label key={option} className="flex min-w-0 items-center gap-2 text-sm">
              <input
                id={inputId}
                name={name}
                type="checkbox"
                value={option}
                disabled={disabled}
                checked={value.includes(option)}
                onChange={(event) => toggle(option, event.target.checked)}
              />
              <span className="min-w-0 break-words">{optionLabel?.(option) ?? option}</span>
            </label>
          );
        })}
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
        Mã lý do
        {/* Code is immutable on edit (BE rejects changes) — render read-only. */}
        <Input id="reason-code-code" disabled={disabled || isEdit} readOnly={isEdit} {...form.register('reasonCode')} />
        {errors.reasonCode && (
          <span className="text-destructive text-xs">{errors.reasonCode.message}</span>
        )}
      </label>
      {conflict && (
        <Alert variant="destructive" role="alert" className="w-full">
          <AlertDescription>{conflict}</AlertDescription>
        </Alert>
      )}

      <label className="grid gap-1 text-sm">Nhóm<select
          id="reason-code-group"
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('reasonGroup')}
        >
          {REASON_GROUPS.map((group) => (
            <option key={group} value={group}>
              {reasonGroupLabel(group)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm">Mô tả<Input id="reason-code-description" disabled={disabled} {...form.register('description')} />
      </label>

      <CheckboxGroup
        legend="Áp dụng cho hành động"
        name="appliesToActions"
        options={ACTION_CODES}
        value={actions}
        disabled={disabled}
        error={errors.appliesToActions?.message}
        optionLabel={actionCodeLabel}
        onChange={(next) => form.setValue('appliesToActions', next as ActionCode[], { shouldValidate: true })}
      />
      <CheckboxGroup
        legend="Áp dụng cho loại đối tượng"
        name="appliesToObjects"
        options={OBJECT_TYPES}
        value={objects}
        disabled={disabled}
        error={errors.appliesToObjects?.message}
        optionLabel={objectTypeLabel}
        onChange={(next) => form.setValue('appliesToObjects', next as ObjectType[], { shouldValidate: true })}
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input id="reason-code-evidence-required" type="checkbox" disabled={disabled} {...form.register('evidenceRequired')} />Yêu cầu bằng chứng</label>
        <label className="flex items-center gap-2 text-sm">
          <input id="reason-code-approval-required" type="checkbox" disabled={disabled} {...form.register('approvalRequired')} />Yêu cầu phê duyệt</label>
      </div>

      <CheckboxGroup
        legend="Vai trò được phép (để trống = không giới hạn)"
        name="allowedRoleCodes"
        options={ROLE_CODES}
        value={roles}
        disabled={disabled}
        optionLabel={roleCodeLabel}
        onChange={(next) => form.setValue('allowedRoleCodes', next as RoleCode[], { shouldValidate: true })}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Hiệu lực từ<Input id="reason-code-effective-from" type="date" disabled={disabled} {...form.register('effectiveFrom')} />
        </label>
        <label className="grid gap-1 text-sm">Hiệu lực đến<Input id="reason-code-effective-to" type="date" disabled={disabled} {...form.register('effectiveTo')} />
          {errors.effectiveTo && (
            <span className="text-destructive text-xs">{errors.effectiveTo.message}</span>
          )}
        </label>
      </div>

      {isEdit && (
        <div className="grid gap-1">
          <label className="grid gap-1 text-sm">Trạng thái<select
              id="reason-code-status"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              disabled={disabled}
              {...form.register('status')}
            >
              <option value="ACTIVE">{reasonCodeStatusLabel('ACTIVE')}</option>
              <option value="INACTIVE">{reasonCodeStatusLabel('INACTIVE')}</option>
            </select>
          </label>
          {initialValue && (
            <span className="text-muted-foreground text-xs">Phiên bản {initialValue.version}</span>
          )}
        </div>
      )}

      <Button type="submit" disabled={disabled || pending}>
        {isEdit ? 'Cập nhật mã lý do' : 'Tạo mã lý do'}
      </Button>
    </form>
  );
}
