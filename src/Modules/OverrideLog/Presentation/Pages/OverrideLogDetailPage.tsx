import { useLocation, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useOverrideLogDetail } from '@modules/OverrideLog/Application/Queries/UseOverrideLogQueries';
import { OverrideControlModeBadge } from '@modules/OverrideLog/Presentation/Components/OverrideControlModeBadge';
import { OverrideLogDetailPanel } from '@modules/OverrideLog/Presentation/Components/OverrideLogDetailPanel';

function resolveState(params: {
  id: string | undefined;
  isLoading: boolean;
  error: unknown;
  hasLog: boolean;
}) {
  if (!params.id) return 'notFound';
  if (params.isLoading) return 'loading';
  if (params.error instanceof ApiError && params.error.isForbidden) return 'forbidden';
  if (params.error instanceof ApiError && params.error.status === 404) return 'notFound';
  if (params.error) return 'error';
  if (!params.hasLog) return 'notFound';
  return null;
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to load override detail.';
}

export function OverrideLogDetailPage() {
  const { id } = useParams();
  const overrideId = id ?? null;
  const location = useLocation();
  const routeState = location.state as { returnTo?: string } | null;
  const query = useOverrideLogDetail(overrideId);
  const log = query.data?.id === overrideId ? query.data : null;
  const state = resolveState({
    id: overrideId ?? undefined,
    isLoading: query.isLoading,
    error: query.error,
    hasLog: Boolean(log),
  });

  return (
    <DetailPageShell
      title={log?.ruleCode ?? 'Override Detail'}
      subtitle="Read-only override evidence with reason, approval reference and before/after snapshots."
      backTo={routeState?.returnTo ?? ROUTES.FOUNDATION.OVERRIDES}
      backLabel="Back to override log"
      status={log ? <OverrideControlModeBadge mode={log.controlMode} /> : null}
      state={state}
      stateTitle={state === 'error' ? 'Unable to load override detail' : undefined}
      stateMessage={state === 'error' ? errorMessage(query.error) : undefined}
      summary={
        log ? (
          <>
            <span>{log.targetObjectType}</span>
            <span>{log.actorUserId}</span>
            <span>{new Date(log.createdAt).toLocaleString()}</span>
          </>
        ) : null
      }
    >
      {log ? <OverrideLogDetailPanel log={log} /> : null}
    </DetailPageShell>
  );
}
