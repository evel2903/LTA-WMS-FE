import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { ROLE_LABELS, type RoleCode } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import type { AssignRoleInput } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import {
  assignRoleFormSchema,
  type AssignRoleFormValues,
} from '@modules/AccessControl/Presentation/Forms/AssignmentFormSchema';

interface AssignRoleFormProps {
  availableRoles: RoleCode[];
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
    defaultValues: { roleCode: availableRoles[0] ?? 'WMS_ADMIN' },
  });

  if (availableRoles.length === 0) {
    return (
      <Alert variant="info" role="status">
        <AlertDescription>Đã gán tất cả vai trò lõi.</AlertDescription>
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
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
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
