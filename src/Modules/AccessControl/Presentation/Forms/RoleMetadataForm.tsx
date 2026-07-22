import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { Input } from '@shared/Components/Ui/Input';
import { roleMetadataStaleDetails, toMutationErrorMessage } from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import type { Role } from '@modules/AccessControl/Domain/Entities/AccessControl';
import type { UpdateRoleInput } from '@modules/AccessControl/Domain/Types/AccessControlTypes';
import { ROLE_STATUS_LABELS } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import { RoleStatusBadge } from '@modules/AccessControl/Presentation/Components/RoleStatusBadge';
import {
  roleMetadataFormSchema,
  type RoleMetadataFormValues,
} from '@modules/AccessControl/Presentation/Forms/RoleMetadataFormSchema';

const STATUS_OPTIONS = (['ACTIVE', 'INACTIVE'] as const).map((value) => ({
  value,
  label: ROLE_STATUS_LABELS[value] ?? value,
}));

const defaults = (role: Role): RoleMetadataFormValues => ({
  roleName: role.roleName,
  description: role.description ?? '',
  status: role.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
});

const tokenAtLeast = (candidate: string, expected: string): boolean =>
  Date.parse(candidate) >= Date.parse(expected);

interface RoleMetadataFormProps {
  role: Role;
  onSubmit: (input: UpdateRoleInput) => Promise<Role>;
  onRefresh: () => Promise<Role>;
}

/** Metadata editor separate from create RoleForm: roleCode stays immutable and RH-03-owned. */
export function RoleMetadataForm({ role, onSubmit, onRefresh }: RoleMetadataFormProps) {
  const form = useForm<RoleMetadataFormValues>({
    resolver: zodResolver(roleMetadataFormSchema),
    defaultValues: defaults(role),
  });
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleExpectedAt, setStaleExpectedAt] = useState<string | null>(null);
  const [staleTokenReady, setStaleTokenReady] = useState(false);
  const previousRoleId = useRef(role.id);
  const authoritativeRole = useRef(role);
  const status = form.watch('status');
  const { ref: statusRef } = form.register('status');

  useEffect(() => {
    const switchedRole = previousRoleId.current !== role.id;
    previousRoleId.current = role.id;
    if (switchedRole) {
      authoritativeRole.current = role;
      form.reset(defaults(role));
      setStaleExpectedAt(null);
      setStaleTokenReady(false);
      setError(null);
      return;
    }

    if (!form.formState.isDirty) {
      if (!tokenAtLeast(role.updatedAt, authoritativeRole.current.updatedAt)) return;
      authoritativeRole.current = role;
      form.reset(defaults(role));
      setStaleExpectedAt(null);
      setStaleTokenReady(false);
      setError(null);
      return;
    }

    // A generic background GET must not silently rebase a dirty draft onto a newer token:
    // doing so would let the next PATCH overwrite an external edit without first receiving
    // the contract's 409. Only the authoritative refetch triggered by that exact conflict may
    // hand off a new token while preserving draft values.
    if (staleExpectedAt && tokenAtLeast(role.updatedAt, staleExpectedAt)) {
      authoritativeRole.current = role;
      setStaleTokenReady(true);
    }
  }, [form, form.formState.isDirty, role, staleExpectedAt]);

  async function submit(values: RoleMetadataFormValues) {
    setPending(true);
    setError(null);
    try {
      const currentRole = authoritativeRole.current;
      const dirtyFields = form.formState.dirtyFields;
      const input: UpdateRoleInput = {
        expectedUpdatedAt: currentRole.updatedAt,
        ...(dirtyFields.roleName ? { roleName: values.roleName } : {}),
        ...(dirtyFields.description
          ? { description: values.description === '' ? null : values.description }
          : {}),
        ...(!currentRole.isSystem && dirtyFields.status ? { status: values.status } : {}),
      };
      const result = await onSubmit(input);
      authoritativeRole.current = result;
      form.reset(defaults(result));
      setStaleExpectedAt(null);
      setStaleTokenReady(false);
    } catch (submissionError) {
      const staleDetails = roleMetadataStaleDetails(submissionError);
      if (staleDetails) {
        setStaleExpectedAt(staleDetails.CurrentUpdatedAt);
        setStaleTokenReady(
          tokenAtLeast(authoritativeRole.current.updatedAt, staleDetails.CurrentUpdatedAt),
        );
      } else {
        setError(toMutationErrorMessage(submissionError));
      }
    } finally {
      setPending(false);
    }
  }

  async function refreshAuthoritativeRole() {
    if (!staleExpectedAt) return;
    setRefreshing(true);
    setError(null);
    try {
      const refreshed = await onRefresh();
      if (!tokenAtLeast(refreshed.updatedAt, staleExpectedAt)) {
        setError('Máy chủ chưa trả phiên bản vai trò mới nhất. Vui lòng thử lại.');
        return;
      }
      authoritativeRole.current = refreshed;
      setStaleTokenReady(true);
    } catch {
      setError('Không thể tải phiên bản vai trò mới nhất. Vui lòng thử lại.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit(submit)}>
      {staleExpectedAt ? (
        <Alert role="alert" variant="warning">
          <AlertDescription>
            {staleTokenReady ? (
              <>
                Dữ liệu vai trò đã được thay đổi ở phiên khác. Bản nháp của bạn được giữ nguyên; hãy kiểm tra rồi
                bấm lưu lại với phiên bản mới.
              </>
            ) : (
              <>
                Không thể tải phiên bản vai trò mới nhất. Bản nháp của bạn vẫn được giữ.{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  disabled={refreshing}
                  onClick={() => void refreshAuthoritativeRole()}
                >
                  {refreshing ? 'Đang tải lại…' : 'Thử tải lại'}
                </button>
              </>
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <label className="grid gap-1 text-sm">
        Tên vai trò
        <Input disabled={pending || refreshing} {...form.register('roleName')} />
        {form.formState.errors.roleName ? (
          <span className="text-destructive text-xs">{form.formState.errors.roleName.message}</span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        Mô tả
        <Input disabled={pending || refreshing} {...form.register('description')} />
        {form.formState.errors.description ? (
          <span className="text-destructive text-xs">{form.formState.errors.description.message}</span>
        ) : null}
      </label>
      {role.isSystem ? (
        <div className="grid gap-1 text-sm">
          <span>Trạng thái hệ thống</span>
          <RoleStatusBadge status={role.status} />
        </div>
      ) : (
        <ComboboxSelect
          ref={statusRef}
          id={`role-metadata-status-${role.id}`}
          name="status"
          label="Trạng thái"
          value={status}
          placeholder="Chọn trạng thái"
          options={STATUS_OPTIONS}
          disabled={pending || refreshing}
          onChange={(value) =>
            form.setValue('status', value as RoleMetadataFormValues['status'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      )}
      <Button
        type="submit"
        disabled={pending || refreshing || !form.formState.isDirty || Boolean(staleExpectedAt && !staleTokenReady)}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        Lưu metadata
      </Button>
    </form>
  );
}
