import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import type { Role } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { AssignRoleInput } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import {
  assignRoleFormSchema,
  type AssignRoleFormValues,
} from '@modules/AccessControl/Presentation/Forms/AssignmentFormSchema';

interface AssignRoleFormProps {
  availableRoles: Role[];
  disabled?: boolean;
  pending?: boolean;
  conflict?: string;
  onSubmit: (input: AssignRoleInput) => void;
}

export function AssignRoleForm({
  availableRoles,
  disabled = false,
  pending = false,
  conflict,
  onSubmit,
}: AssignRoleFormProps) {
  const form = useForm<AssignRoleFormValues>({
    resolver: zodResolver(assignRoleFormSchema),
    defaultValues: { roleCode: availableRoles[0]?.roleCode ?? '' },
  });
  const selectedRoleCode = form.watch('roleCode');

  // Stays mounted across a catalog refresh (no remount-via-`key` trick) — an admin mid-way
  // through picking a non-first option must not have that silently reset to option 1 just
  // because the set reordered or gained an entry elsewhere. Only reseed the field when the
  // CURRENTLY selected role actually stops being a valid option (removed/deactivated/just
  // assigned) — the last case already covers "reset after a successful assignment" for free,
  // since assigning a role always removes it from `availableRoles` (Review Finding).
  useEffect(() => {
    const stillValid = availableRoles.some((role) => role.roleCode === selectedRoleCode);
    if (!stillValid) {
      form.setValue('roleCode', availableRoles[0]?.roleCode ?? '');
    }
  }, [availableRoles, selectedRoleCode, form]);

  if (availableRoles.length === 0) {
    return (
      <Alert variant="info" role="status">
        <AlertDescription>Đã gán tất cả vai trò khả dụng.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={form.handleSubmit((values) => onSubmit({ roleCode: values.roleCode }))}
    >
      <label className="grid gap-1 text-sm">Vai trò<select
          id="assign-role-code"
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          disabled={disabled}
          {...form.register('roleCode')}
        >
          {availableRoles.map((role) => (
            <option key={role.roleCode} value={role.roleCode}>
              {role.roleName}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" disabled={disabled || pending}>
        Gán vai trò
      </Button>
      {conflict && (
        <Alert variant="destructive" role="alert" className="w-full">
          <AlertDescription>{conflict}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
