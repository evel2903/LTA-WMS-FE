import type { ExceptionCase } from '@modules/Compliance/Domain/Entities/Compliance';
import { nextExceptionAction } from '@modules/Compliance/Application/UseCases/NextExceptionAction';
import type {
  AssignExceptionInput,
  LogExceptionInput,
  ResolveExceptionInput,
  SubmitExceptionInput,
} from '@modules/Compliance/Domain/Types/ComplianceTypes';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { ExceptionStateBadge } from '@modules/Compliance/Presentation/Components/ExceptionStateBadge';
import { ExceptionActionForm } from '@modules/Compliance/Presentation/Forms/ExceptionActionForm';
import {
  businessReferenceLabel,
  exceptionActionLabel,
  exceptionOutcomeLabel,
  exceptionSeverityLabel,
  exceptionSubStatusLabel,
  firstNonBlankText,
} from '@modules/Compliance/Presentation/Constants/ComplianceDisplayText';

interface ExceptionDetailPanelProps {
  exceptionCase: ExceptionCase;
  canManage: boolean;
  pending: boolean;
  blocked?: string;
  readOnlyMessage?: string;
  onLog: (input: LogExceptionInput) => void;
  onAssign: (input: AssignExceptionInput) => void;
  onSubmit: (input: SubmitExceptionInput) => void;
  onResolve: (input: ResolveExceptionInput) => void;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: string | null }) {
  const displayValue = value?.trim() || '—';

  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm break-words">{displayValue}</span>
    </div>
  );
}

export function ExceptionDetailPanel({
  exceptionCase,
  canManage,
  pending,
  blocked,
  readOnlyMessage,
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mức độ" value={exceptionSeverityLabel(exceptionCase.severity)} />
        <Field label="Trạng thái phụ" value={exceptionSubStatusLabel(exceptionCase.subStatus)} />
        <Field
          label="Tham chiếu đối tượng"
          value={businessReferenceLabel(exceptionCase.referenceType, exceptionCase.referenceId)}
        />
        <Field
          label="Người được gán"
          value={firstNonBlankText(exceptionCase.assignedToUserId, exceptionCase.assignedRoleId)}
        />
        <Field label="ID mã lý do" value={exceptionCase.reasonCodeId} />
        <Field
          label="Bằng chứng"
          value={evidenceCount > 0 ? `${evidenceCount} tham chiếu` : 'Chưa có'}
        />
        <Field label="ID yêu cầu phê duyệt" value={exceptionCase.approvalRequestId} />
        <Field label="Kết quả xử lý" value={exceptionOutcomeLabel(exceptionCase.outcome)} />
        <Field label="Mở lúc" value={new Date(exceptionCase.openedAt).toLocaleString()} />
        <Field
          label="Xử lý lúc"
          value={
            exceptionCase.resolvedAt ? new Date(exceptionCase.resolvedAt).toLocaleString() : null
          }
        />
      </div>

      <div className="border-t pt-3">
        <h4 className="mb-2 text-sm font-medium">
          Hành động vòng đời{action ? `: ${exceptionActionLabel(action)}` : ''}
        </h4>
        {action === null ? (
          <Alert variant="info" role="status">
            <AlertDescription>Đã đóng - không còn hành động.</AlertDescription>
          </Alert>
        ) : !canManage ? (
          <Alert variant="warning" role="status">
            <AlertDescription>
              {readOnlyMessage ?? 'Chỉ đọc - bạn không có quyền thao tác.'}
            </AlertDescription>
          </Alert>
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
