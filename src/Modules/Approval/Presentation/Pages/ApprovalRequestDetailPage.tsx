import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { ActionPanel } from '@shared/Components/Page/ActionPanel';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { useCurrentUser } from '@modules/Auth/Application/UseCases/UseCurrentUser';
import { blockedMessage } from '@modules/Approval/Application/Commands/ApprovalMutationError';
import { useApprovalMutations } from '@modules/Approval/Application/Commands/UseApprovalMutations';
import { useApprovalRequestDetail } from '@modules/Approval/Application/Queries/UseApprovalQueries';
import { ApprovalDecisionBadge } from '@modules/Approval/Presentation/Components/ApprovalDecisionBadge';
import { ApprovalDetailPanel } from '@modules/Approval/Presentation/Components/ApprovalDetailPanel';
import {
  approvalActionLabel,
  approvalObjectTypeLabel,
  approvalTargetLabelFromParts,
} from '@modules/Approval/Presentation/Constants/ApprovalDisplayText';

type ApprovalRequestDetailMode = 'detail' | 'action';

interface ApprovalRequestDetailPageProps {
  mode: ApprovalRequestDetailMode;
}

function detailState(params: {
  id?: string;
  isLoading: boolean;
  error: unknown;
  hasRequest: boolean;
}): PageBoundaryState | null {
  if (!params.id) return 'notFound';
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (apiError?.status === 404) return 'notFound';
  if (params.error) return 'error';
  if (!params.hasRequest) return 'notFound';
  return null;
}

export function ApprovalRequestDetailPage({ mode }: ApprovalRequestDetailPageProps) {
  const { id } = useParams();
  const approvalId = id ?? null;
  const currentUser = useCurrentUser();
  const [actionError, setActionError] = useState<unknown>(null);
  useEffect(() => {
    setActionError(null);
  }, [approvalId]);
  const detailQuery = useApprovalRequestDetail(approvalId);
  const request = detailQuery.data?.id === approvalId ? detailQuery.data : null;
  const mutations = useApprovalMutations();
  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const isAction = mode === 'action';
  const canMutate = isAction && !apiError?.isForbidden;
  const detailReadOnlyMessage =
    'Route xem chi tiết chỉ hiển thị evidence. Mở quyết định để thao tác.';
  const pending = mutations.approve.isPending || mutations.reject.isPending;
  const runOptions = { onError: setActionError, onSuccess: () => setActionError(null) };
  const state = detailState({
    id: approvalId ?? undefined,
    isLoading:
      detailQuery.isLoading || (detailQuery.isFetching && Boolean(detailQuery.data) && !request),
    error: detailQuery.error,
    hasRequest: Boolean(request),
  });

  return (
    <DetailPageShell
      title={
        request
          ? `${approvalActionLabel(request.action)} · ${approvalObjectTypeLabel(request.targetObjectType)}`
          : 'Yêu cầu phê duyệt'
      }
      subtitle="Rà soát ngữ cảnh quyết định trước khi phê duyệt hoặc từ chối trên route action."
      backTo={ROUTES.FOUNDATION.APPROVALS}
      backLabel="Quay lại hàng đợi phê duyệt"
      status={request ? <ApprovalDecisionBadge decision={request.decision} /> : null}
      summary={
        request ? (
          <>
            <span>Người yêu cầu: {request.requesterUserId}</span>
            <span>
              Đối tượng đích:{' '}
              {approvalTargetLabelFromParts(
                request.targetObjectType,
                request.targetObjectCode,
                request.targetObjectId,
              )}
            </span>
          </>
        ) : null
      }
      actions={
        request ? (
          isAction ? (
            <Button asChild variant="outline">
              <Link to={ROUTES.FOUNDATION.APPROVAL_DETAIL(request.id)}>Xem chi tiết</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={ROUTES.FOUNDATION.APPROVAL_ACTION(request.id)}>Mở quyết định</Link>
            </Button>
          )
        ) : null
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Không có quyền' : undefined}
      stateMessage={apiError?.message ?? 'Không thể tải yêu cầu phê duyệt.'}
      contentAriaLabel="Chi tiết yêu cầu phê duyệt"
    >
      {request ? (
        <ActionPanel
          title={isAction ? 'Hành động quyết định' : 'Ngữ cảnh quyết định'}
          description="Phê duyệt/từ chối giữ nguyên quyền backend, kiểm soát tự duyệt và audit hiện có."
          state={pending ? 'pending' : 'idle'}
          governanceState={canMutate ? undefined : 'readOnly'}
          governanceMessage={!isAction ? detailReadOnlyMessage : undefined}
        >
          <ApprovalDetailPanel
            key={request.id}
            request={request}
            canManage={canMutate}
            isSelfRequester={Boolean(currentUser) && request.requesterUserId === currentUser?.id}
            pending={pending}
            blocked={blockedMessage(actionError) ?? undefined}
            readOnlyMessage={!isAction ? detailReadOnlyMessage : undefined}
            onApprove={(input) => mutations.approve.mutate({ id: request.id, input }, runOptions)}
            onReject={(input) => mutations.reject.mutate({ id: request.id, input }, runOptions)}
          />
        </ActionPanel>
      ) : null}
    </DetailPageShell>
  );
}
