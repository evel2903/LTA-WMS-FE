import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import {
  createRoleFormSchema,
  type CreateRoleFormValues,
} from '@modules/AccessControl/Presentation/Forms/RoleFormSchema';

interface RoleFormProps {
  pending?: boolean;
  /** Inline 400/409 message from the create attempt (AC2) — null for no error. */
  error?: string | null;
  onSubmit: (values: CreateRoleFormValues) => void;
}

export function RoleForm({ pending = false, error, onSubmit }: RoleFormProps) {
  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleFormSchema),
    defaultValues: { roleCode: '', roleName: '', description: '' },
  });

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(onSubmit)}>
      <label className="grid gap-1 text-sm">
        Mã vai trò
        <Input disabled={pending} {...form.register('roleCode')} />
        {form.formState.errors.roleCode && (
          <span className="text-destructive text-xs">{form.formState.errors.roleCode.message}</span>
        )}
      </label>
      {error && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <label className="grid gap-1 text-sm">
        Tên vai trò
        <Input disabled={pending} {...form.register('roleName')} />
        {form.formState.errors.roleName && (
          <span className="text-destructive text-xs">{form.formState.errors.roleName.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">
        Mô tả
        <Input disabled={pending} {...form.register('description')} />
        {form.formState.errors.description && (
          <span className="text-destructive text-xs">{form.formState.errors.description.message}</span>
        )}
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        Tạo vai trò
      </Button>
    </form>
  );
}
