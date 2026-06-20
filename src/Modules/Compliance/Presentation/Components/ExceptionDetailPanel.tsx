import type { ExceptionCase } from '@modules/Compliance/Domain/Entities/Compliance';
import { nextExceptionAction } from '@modules/Compliance/Application/UseCases/NextExceptionAction';
import type {
  AssignExceptionInput,
  LogExceptionInput,
  ResolveExceptionInput,
  SubmitExceptionInput,
} from '@modules/Compliance/Domain/Types/ComplianceTypes';
import { ExceptionStateBadge } from '@modules/Compliance/Presentation/Components/ExceptionStateBadge';
import { ExceptionActionForm } from '@modules/Compliance/Presentation/Forms/ExceptionActionForm';

interface ExceptionDetailPanelProps {
  exceptionCase: ExceptionCase;
  canManage: boolean;
  pending: boolean;
  blocked?: string;
  onLog: (input: LogExceptionInput) => void;
  onAssign: (input: AssignExceptionInput) => void;
  onSubmit: (input: SubmitExceptionInput) => void;
  onResolve: (input: ResolveExceptionInput) => void;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm break-words">{value ?? '—'}</span>
    </div>
  );
}

export function ExceptionDetailPanel({
  exceptionCase,
  canManage,
  pending,
  blocked,
  onLog,
  onAssign,
  onSubmit,
  onResolve,
  onClose,
}: ExceptionDetailPanelProps) {
  const action = nextExceptionAction(exceptionCase.state);
  const evidenceCount = exceptionCase.evidenceRefs?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ExceptionStateBadge state={exceptionCase.state} />
        <span className="text-sm font-medium">{exceptionCase.exceptionType}</span>
        {!canManage && <span className="text-muted-foreground text-xs">Read only</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Severity" value={exceptionCase.severity} />
        <Field label="Sub status" value={exceptionCase.subStatus} />
        <Field label="Object reference" value={`${exceptionCase.referenceType} · ${exceptionCase.referenceId}`} />
        <Field label="Assignee" value={exceptionCase.assignedToUserId ?? exceptionCase.assignedRoleId} />
        <Field label="Reason code id" value={exceptionCase.reasonCodeId} />
        <Field label="Evidence" value={evidenceCount > 0 ? `${evidenceCount} ref(s)` : 'none'} />
        <Field label="Approval request id" value={exceptionCase.approvalRequestId} />
        <Field label="Outcome" value={exceptionCase.outcome} />
        <Field label="Opened at" value={new Date(exceptionCase.openedAt).toLocaleString()} />
        <Field
          label="Resolved at"
          value={exceptionCase.resolvedAt ? new Date(exceptionCase.resolvedAt).toLocaleString() : null}
        />
      </div>

      <div className="border-t pt-3">
        <h4 className="mb-2 text-sm font-medium">Lifecycle action</h4>
        {action === null ? (
          <p className="text-muted-foreground text-sm">Đã đóng — không còn action.</p>
        ) : !canManage ? (
          <p className="text-muted-foreground text-sm">Read only — bạn không có quyền thao tác.</p>
        ) : (
          <ExceptionActionForm
            action={action}
            pending={pending}
            blocked={blocked}
            onLog={onLog}
            onAssign={onAssign}
            onSubmit={onSubmit}
            onResolve={onResolve}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
