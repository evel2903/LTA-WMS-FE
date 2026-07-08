import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import type { DecideApprovalInput } from '@modules/Approval/Domain/Types/ApprovalTypes';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { nextApprovalAction } from '@modules/Approval/Application/UseCases/NextApprovalAction';
import { ApprovalDecisionBadge } from '@modules/Approval/Presentation/Components/ApprovalDecisionBadge';
import { JsonBlock } from '@modules/Approval/Presentation/Components/StateViews';
import { ApprovalDecisionForm } from '@modules/Approval/Presentation/Forms/ApprovalDecisionForm';
import {
  approvalActionLabel,
  approvalNoteLabel,
  approvalObjectTypeLabel,
  approvalReferenceLabel,
  approvalTargetLabelFromParts,
} from '@modules/Approval/Presentation/Constants/ApprovalDisplayText';

interface ApprovalDetailPanelProps {
  request: ApprovalRequest;
  canManage: boolean;
  /** True when the signed-in user is the requester — self-approval is blocked (AC4). */
  isSelfRequester: boolean;
  pending: boolean;
  blocked?: string;
  readOnlyMessage?: string;
  onApprove: (input: DecideApprovalInput) => void;
  onReject: (input: DecideApprovalInput) => void;
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

export function ApprovalDetailPanel({
  request,
  canManage,
  isSelfRequester,
  pending,
  blocked,
  readOnlyMessage,
  onApprove,
  onReject,
}: ApprovalDetailPanelProps) {
  const action = nextApprovalAction(request.decision);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ApprovalDecisionBadge decision={request.decision} />
        <span className="text-sm font-medium">
          {approvalActionLabel(request.action)} ·{' '}
          {approvalObjectTypeLabel(request.targetObjectType)}
        </span>
        {!canManage && <span className="text-muted-foreground text-xs">Chỉ đọc</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Đối tượng đích"
          value={approvalTargetLabelFromParts(
            request.targetObjectType,
            request.targetObjectCode,
            request.targetObjectId,
          )}
        />
        <Field label="Người yêu cầu" value={request.requesterUserId} />
        <Field label="ID mã lý do yêu cầu" value={request.requestReasonCodeId} />
        <Field label="Ghi chú yêu cầu" value={approvalNoteLabel(request.requestReasonNote)} />
        <Field
          label="Tham chiếu"
          value={approvalReferenceLabel(request.referenceType, request.referenceId)}
        />
        <Field label="Quyết định bởi" value={request.decidedByUserId} />
        <Field label="ID mã lý do quyết định" value={request.decisionReasonCodeId} />
        <Field label="Ghi chú quyết định" value={approvalNoteLabel(request.decisionNote)} />
        <Field label="Tạo lúc" value={new Date(request.createdAt).toLocaleString()} />
        <Field
          label="Quyết định lúc"
          value={request.decidedAt ? new Date(request.decidedAt).toLocaleString() : null}
        />
      </div>

      {request.scope && <JsonBlock label="Phạm vi" value={request.scope} />}
      {request.evidenceRefs && request.evidenceRefs.length > 0 && (
        <JsonBlock label="Tham chiếu bằng chứng" value={request.evidenceRefs} />
      )}

      <div className="border-t pt-3">
        <h4 className="mb-2 text-sm font-medium">Quyết định</h4>
        {action === null ? (
          <Alert variant="info" role="status">
            <AlertDescription>Đã quyết định - không còn hành động.</AlertDescription>
          </Alert>
        ) : !canManage ? (
          <Alert variant="warning" role="status">
            <AlertDescription>
              {readOnlyMessage ?? 'Chỉ đọc - bạn không có quyền duyệt.'}
            </AlertDescription>
          </Alert>
        ) : isSelfRequester ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>Không thể tự duyệt yêu cầu của chính mình.</AlertDescription>
          </Alert>
        ) : (
          <ApprovalDecisionForm
            pending={pending}
            blocked={blocked}
            onApprove={onApprove}
            onReject={onReject}
          />
        )}
      </div>
    </div>
  );
}
