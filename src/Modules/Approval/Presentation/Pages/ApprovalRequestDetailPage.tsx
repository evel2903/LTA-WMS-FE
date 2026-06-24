import { useState } from 'react';
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
  const currentUser = useCurrentUser();
  const [actionError, setActionError] = useState<unknown>(null);
  const detailQuery = useApprovalRequestDetail(id ?? null);
  const request = detailQuery.data ?? null;
  const mutations = useApprovalMutations();
  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const isAction = mode === 'action';
  const canMutate = isAction && !apiError?.isForbidden;
  const pending = mutations.approve.isPending || mutations.reject.isPending;
  const runOptions = { onError: setActionError, onSuccess: () => setActionError(null) };
  const state = detailState({
    id,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    hasRequest: Boolean(request),
  });

  return (
    <DetailPageShell
      title={request ? `${request.action} · ${request.targetObjectType}` : 'Approval Request'}
      subtitle="Review decision context before running approve or reject on the action route."
      backTo={ROUTES.FOUNDATION.APPROVALS}
      backLabel="Back to approval queue"
      status={request ? <ApprovalDecisionBadge decision={request.decision} /> : null}
      summary={
        request ? (
          <>
            <span>Requester: {request.requesterUserId}</span>
            <span>Target: {request.targetObjectCode ?? request.targetObjectId}</span>
          </>
        ) : null
      }
      actions={
        request ? (
          isAction ? (
            <Button asChild variant="outline">
              <Link to={ROUTES.FOUNDATION.APPROVAL_DETAIL(request.id)}>View detail</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={ROUTES.FOUNDATION.APPROVAL_ACTION(request.id)}>Open decision</Link>
            </Button>
          )
        ) : null
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Permission denied' : undefined}
      stateMessage={apiError?.message ?? 'Unable to load approval request.'}
    >
      {request ? (
        <ActionPanel
          title={isAction ? 'Decision action' : 'Decision context'}
          description="Approve/reject keeps existing backend permission, self-approval and audit behavior."
          state={pending ? 'pending' : 'idle'}
          governanceState={canMutate ? undefined : 'readOnly'}
        >
          <ApprovalDetailPanel
            key={request.id}
            request={request}
            canManage={canMutate}
            isSelfRequester={Boolean(currentUser) && request.requesterUserId === currentUser?.id}
            pending={pending}
            blocked={blockedMessage(actionError) ?? undefined}
            onApprove={(input) => mutations.approve.mutate({ id: request.id, input }, runOptions)}
            onReject={(input) => mutations.reject.mutate({ id: request.id, input }, runOptions)}
          />
        </ActionPanel>
      ) : null}
    </DetailPageShell>
  );
}
