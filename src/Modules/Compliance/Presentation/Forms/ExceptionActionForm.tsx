import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import type { ExceptionAction } from '@modules/Compliance/Domain/Enums/ComplianceEnums';
import { ReasonCodeSelect } from '@modules/ReasonCode/Presentation/Components/ReasonCodeSelect';
import type {
  AssignExceptionInput,
  LogExceptionInput,
  ResolveExceptionInput,
  SubmitExceptionInput,
} from '@modules/Compliance/Domain/Types/ComplianceTypes';
import {
  assignExceptionSchema,
  parseEvidenceRefs,
  resolveExceptionSchema,
  submitExceptionSchema,
  type AssignExceptionFormValues,
  type ResolveExceptionFormValues,
  type SubmitExceptionFormValues,
} from '@modules/Compliance/Presentation/Forms/ExceptionActionSchema';

interface ExceptionActionFormProps {
  action: ExceptionAction;
  disabled?: boolean;
  pending?: boolean;
  /** Inline lifecycle-blocked / business-rule message (missing reason/evidence/approval). */
  blocked?: string;
  onLog: (input: LogExceptionInput) => void;
  onAssign: (input: AssignExceptionInput) => void;
  onSubmit: (input: SubmitExceptionInput) => void;
  onResolve: (input: ResolveExceptionInput) => void;
  onClose: () => void;
}

function Blocked({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" role="alert" className="w-full">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function ExceptionActionForm(props: ExceptionActionFormProps) {
  switch (props.action) {
    case 'Log':
      return <LogForm {...props} />;
    case 'Assign':
      return <AssignForm {...props} />;
    case 'Submit':
      return <SubmitForm {...props} />;
    case 'Resolve':
      return <ResolveForm {...props} />;
    case 'Close':
      return <CloseForm {...props} />;
    default:
      return null;
  }
}

function LogForm({ disabled, pending, blocked, onLog }: ExceptionActionFormProps) {
  const [hardBlock, setHardBlock] = useState(false);
  return (
    <div className="grid gap-2">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={disabled}
          checked={hardBlock}
          onChange={(event) => setHardBlock(event.target.checked)}
        />Chặn cứng</label>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled || pending} onClick={() => onLog({ hardBlock })}>Ghi log</Button>
      </div>
      <Blocked message={blocked} />
    </div>
  );
}

function AssignForm({ disabled, pending, blocked, onAssign }: ExceptionActionFormProps) {
  const form = useForm<AssignExceptionFormValues>({
    resolver: zodResolver(assignExceptionSchema),
    defaultValues: { assignedToUserId: '', assignedRoleId: '', ownerId: '' },
  });
  const errors = form.formState.errors;
  return (
    <form
      className="grid gap-2"
      onSubmit={form.handleSubmit((values) =>
        onAssign({
          assignedToUserId: values.assignedToUserId,
          assignedRoleId: values.assignedRoleId,
          ownerId: values.ownerId,
        }),
      )}
    >
      <label className="grid gap-1 text-sm">ID người dùng được gán<Input disabled={disabled} {...form.register('assignedToUserId')} />
      </label>
      <label className="grid gap-1 text-sm">ID vai trò được gán<Input disabled={disabled} {...form.register('assignedRoleId')} />
      </label>
      <label className="grid gap-1 text-sm">ID chủ hàng<Input disabled={disabled} {...form.register('ownerId')} />
      </label>
      {errors.assignedToUserId && (
        <span className="text-destructive text-xs">{errors.assignedToUserId.message}</span>
      )}
      {errors.assignedRoleId && (
        <span className="text-destructive text-xs">{errors.assignedRoleId.message}</span>
      )}
      {errors.ownerId && <span className="text-destructive text-xs">{errors.ownerId.message}</span>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={disabled || pending}>Gán</Button>
      </div>
      <Blocked message={blocked} />
    </form>
  );
}

function SubmitForm({ disabled, pending, blocked, onSubmit }: ExceptionActionFormProps) {
  const form = useForm<SubmitExceptionFormValues>({
    resolver: zodResolver(submitExceptionSchema),
    defaultValues: { requireApproval: false, reasonCode: '', reasonNote: '' },
  });
  const reasonCode = form.watch('reasonCode') ?? '';
  return (
    <form
      className="grid gap-2"
      onSubmit={form.handleSubmit((values) =>
        onSubmit({
          requireApproval: values.requireApproval,
          reasonCode: values.reasonCode,
          reasonNote: values.reasonNote,
        }),
      )}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" disabled={disabled} {...form.register('requireApproval')} />Yêu cầu phê duyệt</label>
      <ReasonCodeSelect
        id="exception-submit-reason-code"
        name="reasonCode"
        label="Mã lý do"
        value={reasonCode}
        action="Approve"
        objectType="ExceptionCase"
        optional
        disabled={disabled}
        onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
      />
      <label className="grid gap-1 text-sm">Ghi chú lý do<Input disabled={disabled} {...form.register('reasonNote')} />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={disabled || pending}>Gửi để rà soát</Button>
      </div>
      <Blocked message={blocked} />
    </form>
  );
}

function ResolveForm({ disabled, pending, blocked, onResolve }: ExceptionActionFormProps) {
  const form = useForm<ResolveExceptionFormValues>({
    resolver: zodResolver(resolveExceptionSchema),
    defaultValues: { reasonCode: '', resolutionNote: '', evidenceRefs: '' },
  });
  const reasonCode = form.watch('reasonCode') ?? '';
  return (
    <form
      className="grid gap-2"
      onSubmit={form.handleSubmit((values) =>
        onResolve({
          reasonCode: values.reasonCode,
          resolutionNote: values.resolutionNote,
          evidenceRefs: parseEvidenceRefs(values.evidenceRefs),
        }),
      )}
    >
      <ReasonCodeSelect
        id="exception-resolve-reason-code"
        name="reasonCode"
        label="Mã lý do"
        value={reasonCode}
        action="Update"
        objectType="ExceptionCase"
        optional
        disabled={disabled}
        onChange={(value) => form.setValue('reasonCode', value, { shouldDirty: true, shouldValidate: true })}
      />
      <label className="grid gap-1 text-sm">Ghi chú xử lý<Input disabled={disabled} {...form.register('resolutionNote')} />
      </label>
      <label className="grid gap-1 text-sm">Tham chiếu bằng chứng (phân tách bằng dấu phẩy)<Input disabled={disabled} {...form.register('evidenceRefs')} />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={disabled || pending}>Xử lý</Button>
      </div>
      <Blocked message={blocked} />
    </form>
  );
}

function CloseForm({ disabled, pending, blocked, onClose }: ExceptionActionFormProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={disabled || pending} onClick={() => onClose()}>Đóng</Button>
      </div>
      <Blocked message={blocked} />
    </div>
  );
}
