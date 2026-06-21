import type { ApprovalRequest } from '@modules/Approval/Domain/Entities/Approval';
import type { DecideApprovalInput } from '@modules/Approval/Domain/Types/ApprovalTypes';
import { nextApprovalAction } from '@modules/Approval/Application/UseCases/NextApprovalAction';
import { ApprovalDecisionBadge } from '@modules/Approval/Presentation/Components/ApprovalDecisionBadge';
import { JsonBlock } from '@modules/Approval/Presentation/Components/StateViews';
import { ApprovalDecisionForm } from '@modules/Approval/Presentation/Forms/ApprovalDecisionForm';

interface ApprovalDetailPanelProps {
  request: ApprovalRequest;
  canManage: boolean;
  /** True when the signed-in user is the requester — self-approval is blocked (AC4). */
  isSelfRequester: boolean;
  pending: boolean;
  blocked?: string;
  onApprove: (input: DecideApprovalInput) => void;
  onReject: (input: DecideApprovalInput) => void;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm break-words">{value ?? '—'}</span>
    </div>
  );
}

export function ApprovalDetailPanel({
  request,
  canManage,
  isSelfRequester,
  pending,
  blocked,
  onApprove,
  onReject,
}: ApprovalDetailPanelProps) {
  const action = nextApprovalAction(request.decision);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ApprovalDecisionBadge decision={request.decision} />
        <span className="text-sm font-medium">
          {request.action} · {request.targetObjectType}
        </span>
        {!canManage && <span className="text-muted-foreground text-xs">Read only</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Target object" value={`${request.targetObjectCode ?? request.targetObjectId}`} />
        <Field label="Requester" value={request.requesterUserId} />
        <Field label="Request reason code id" value={request.requestReasonCodeId} />
        <Field label="Request note" value={request.requestReasonNote} />
        <Field label="Reference" value={request.referenceType ? `${request.referenceType} · ${request.referenceId}` : null} />
        <Field label="Decided by" value={request.decidedByUserId} />
        <Field label="Decision reason code id" value={request.decisionReasonCodeId} />
        <Field label="Decision note" value={request.decisionNote} />
        <Field label="Created at" value={new Date(request.createdAt).toLocaleString()} />
        <Field
          label="Decided at"
          value={request.decidedAt ? new Date(request.decidedAt).toLocaleString() : null}
        />
      </div>

      {request.scope && <JsonBlock label="Scope" value={request.scope} />}
      {request.evidenceRefs && request.evidenceRefs.length > 0 && (
        <JsonBlock label="Evidence refs" value={request.evidenceRefs} />
      )}

      <div className="border-t pt-3">
        <h4 className="mb-2 text-sm font-medium">Decision</h4>
        {action === null ? (
          <p className="text-muted-foreground text-sm">Đã quyết định — không còn action.</p>
        ) : isSelfRequester ? (
          <p className="text-muted-foreground text-sm">
            Không thể tự duyệt request của chính mình (self-approval).
          </p>
        ) : !canManage ? (
          <p className="text-muted-foreground text-sm">Read only — bạn không có quyền duyệt.</p>
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
