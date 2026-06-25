import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import type { DecideApprovalInput } from '@modules/Approval/Domain/Types/ApprovalTypes';
import {
  approvalDecisionSchema,
  parseEvidenceRefs,
  type ApprovalDecisionFormValues,
} from '@modules/Approval/Presentation/Forms/ApprovalDecisionSchema';

interface ApprovalDecisionFormProps {
  disabled?: boolean;
  pending?: boolean;
  /** Inline business-rule message (missing reason / evidence-required / already-decided). */
  blocked?: string;
  onApprove: (input: DecideApprovalInput) => void;
  onReject: (input: DecideApprovalInput) => void;
}

function Blocked({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span className="text-destructive text-xs" role="alert">
      {message}
    </span>
  );
}

export function ApprovalDecisionForm({
  disabled = false,
  pending = false,
  blocked,
  onApprove,
  onReject,
}: ApprovalDecisionFormProps) {
  const form = useForm<ApprovalDecisionFormValues>({
    resolver: zodResolver(approvalDecisionSchema),
    defaultValues: { reasonCode: '', reasonNote: '', evidenceRefs: '' },
  });
  const errors = form.formState.errors;

  // Approve and reject share the same validated values; the chosen verb is the only difference.
  const decide = (handler: (input: DecideApprovalInput) => void) =>
    form.handleSubmit((values) =>
      handler({
        reasonCode: values.reasonCode,
        reasonNote: values.reasonNote,
        evidenceRefs: parseEvidenceRefs(values.evidenceRefs),
      }),
    );

  return (
    <form className="grid gap-2" onSubmit={decide(onApprove)}>
      <label className="grid gap-1 text-sm">Mã lý do<Input disabled={disabled} placeholder="VD: RC-APPROVE" {...form.register('reasonCode')} />
        {errors.reasonCode && (
          <span className="text-destructive text-xs">{errors.reasonCode.message}</span>
        )}
      </label>
      <label className="grid gap-1 text-sm">Ghi chú lý do<Input disabled={disabled} {...form.register('reasonNote')} />
      </label>
      <label className="grid gap-1 text-sm">Tham chiếu bằng chứng (phân tách bằng dấu phẩy)<Input disabled={disabled} {...form.register('evidenceRefs')} />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={disabled || pending}>Phê duyệt</Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || pending}
          onClick={decide(onReject)}
        >Từ chối</Button>
        <Blocked message={blocked} />
      </div>
    </form>
  );
}
