import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { ActionPanel } from '@shared/Components/Page/ActionPanel';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { blockedMessage } from '@modules/Compliance/Application/Commands/ComplianceMutationError';
import { useExceptionMutations } from '@modules/Compliance/Application/Commands/UseExceptionMutations';
import { useExceptionDetail } from '@modules/Compliance/Application/Queries/UseComplianceQueries';
import { ExceptionDetailPanel } from '@modules/Compliance/Presentation/Components/ExceptionDetailPanel';
import { ExceptionStateBadge } from '@modules/Compliance/Presentation/Components/ExceptionStateBadge';

type ExceptionDetailMode = 'detail' | 'action';

interface ExceptionDetailPageProps {
  mode: ExceptionDetailMode;
}

function detailState(params: {
  id?: string;
  isLoading: boolean;
  error: unknown;
  hasException: boolean;
}): PageBoundaryState | null {
  if (!params.id) return 'notFound';
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (apiError?.status === 404) return 'notFound';
  if (params.error) return 'error';
  if (!params.hasException) return 'notFound';
  return null;
}

export function ExceptionDetailPage({ mode }: ExceptionDetailPageProps) {
  const { id } = useParams();
  const [actionError, setActionError] = useState<unknown>(null);
  const detailQuery = useExceptionDetail(id ?? null);
  const exceptionCase = detailQuery.data ?? null;
  const mutations = useExceptionMutations();
  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const isAction = mode === 'action';
  const canMutate = isAction && !apiError?.isForbidden;
  const pending =
    mutations.logException.isPending ||
    mutations.assignException.isPending ||
    mutations.submitException.isPending ||
    mutations.resolveException.isPending ||
    mutations.closeException.isPending;
  const runOptions = { onError: setActionError, onSuccess: () => setActionError(null) };
  const state = detailState({
    id,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    hasException: Boolean(exceptionCase),
  });

  return (
    <DetailPageShell
      title={exceptionCase ? exceptionCase.exceptionType : 'Exception Case'}
      subtitle="Review exception context before running lifecycle actions on the action route."
      backTo={ROUTES.FOUNDATION.EXCEPTIONS}
      backLabel="Back to exception queue"
      status={exceptionCase ? <ExceptionStateBadge state={exceptionCase.state} /> : null}
      summary={
        exceptionCase ? (
          <>
            <span>Reference: {exceptionCase.referenceType} · {exceptionCase.referenceId}</span>
            <span>Severity: {exceptionCase.severity}</span>
          </>
        ) : null
      }
      actions={
        exceptionCase ? (
          isAction ? (
            <Button asChild variant="outline">
              <Link to={ROUTES.FOUNDATION.EXCEPTION_DETAIL(exceptionCase.id)}>View detail</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={ROUTES.FOUNDATION.EXCEPTION_ACTION(exceptionCase.id)}>Open lifecycle</Link>
            </Button>
          )
        ) : null
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Permission denied' : undefined}
      stateMessage={apiError?.message ?? 'Unable to load exception case.'}
    >
      {exceptionCase ? (
        <ActionPanel
          title={isAction ? 'Lifecycle action' : 'Exception context'}
          description="Exception transitions keep existing state, reason and audit behavior."
          state={pending ? 'pending' : 'idle'}
          governanceState={canMutate ? undefined : 'readOnly'}
        >
          <ExceptionDetailPanel
            key={exceptionCase.id}
            exceptionCase={exceptionCase}
            canManage={canMutate}
            pending={pending}
            blocked={blockedMessage(actionError) ?? undefined}
            onLog={(input) => mutations.logException.mutate({ id: exceptionCase.id, input }, runOptions)}
            onAssign={(input) =>
              mutations.assignException.mutate({ id: exceptionCase.id, input }, runOptions)
            }
            onSubmit={(input) =>
              mutations.submitException.mutate({ id: exceptionCase.id, input }, runOptions)
            }
            onResolve={(input) =>
              mutations.resolveException.mutate({ id: exceptionCase.id, input }, runOptions)
            }
            onClose={() => mutations.closeException.mutate({ id: exceptionCase.id }, runOptions)}
          />
        </ActionPanel>
      ) : null}
    </DetailPageShell>
  );
}
