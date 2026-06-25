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
        {!canManage && <span className="text-muted-foreground text-xs">Chỉ đọc</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Mức độ" value={exceptionCase.severity} />
        <Field label="Trạng thái phụ" value={exceptionCase.subStatus} />
        <Field label="Tham chiếu đối tượng" value={`${exceptionCase.referenceType} · ${exceptionCase.referenceId}`} />
        <Field label="Người được gán" value={exceptionCase.assignedToUserId ?? exceptionCase.assignedRoleId} />
        <Field label="ID mã lý do" value={exceptionCase.reasonCodeId} />
        <Field label="Bằng chứng" value={evidenceCount > 0 ? `${evidenceCount} tham chiếu` : 'không có'} />
        <Field label="ID yêu cầu phê duyệt" value={exceptionCase.approvalRequestId} />
        <Field label="Kết quả xử lý" value={exceptionCase.outcome} />
        <Field label="Mở lúc" value={new Date(exceptionCase.openedAt).toLocaleString()} />
        <Field
          label="Xử lý lúc"
          value={exceptionCase.resolvedAt ? new Date(exceptionCase.resolvedAt).toLocaleString() : null}
        />
      </div>

      <div className="border-t pt-3">
        <h4 className="mb-2 text-sm font-medium">Hành động vòng đời</h4>
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
