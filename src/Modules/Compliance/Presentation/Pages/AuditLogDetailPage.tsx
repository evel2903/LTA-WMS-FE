import { useLocation, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useAuditLogDetail } from '@modules/Compliance/Application/Queries/UseComplianceQueries';
import { AuditLogDetailPanel } from '@modules/Compliance/Presentation/Components/AuditLogDetailPanel';

function resolveState(params: {
  id: string | undefined;
  isLoading: boolean;
  error: unknown;
  hasEntry: boolean;
}) {
  if (!params.id) return 'notFound';
  if (params.isLoading) return 'loading';
  if (params.error instanceof ApiError && params.error.isForbidden) return 'forbidden';
  if (params.error instanceof ApiError && params.error.status === 404) return 'notFound';
  if (params.error) return 'error';
  if (!params.hasEntry) return 'notFound';
  return null;
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to load audit detail.';
}

export function AuditLogDetailPage() {
  const { id } = useParams();
  const auditId = id ?? null;
  const location = useLocation();
  const routeState = location.state as { returnTo?: string } | null;
  const query = useAuditLogDetail(auditId);
  const entry = query.data?.id === auditId ? query.data : null;
  const state = resolveState({
    id: auditId ?? undefined,
    isLoading: query.isLoading,
    error: query.error,
    hasEntry: Boolean(entry),
  });

  return (
    <DetailPageShell
      title={entry?.objectCode ?? entry?.objectType ?? 'Audit Detail'}
      subtitle="Read-only audit event detail with before/after snapshots."
      backTo={routeState?.returnTo ?? ROUTES.FOUNDATION.AUDIT}
      backLabel="Back to audit log"
      state={state}
      stateTitle={state === 'error' ? 'Unable to load audit detail' : undefined}
      stateMessage={state === 'error' ? errorMessage(query.error) : undefined}
      summary={
        entry ? (
          <>
            <span>{entry.action}</span>
            <span>{entry.result}</span>
            <span>{new Date(entry.occurredAt).toLocaleString()}</span>
          </>
        ) : null
      }
    >
      {entry ? <AuditLogDetailPanel entry={entry} /> : null}
    </DetailPageShell>
  );
}
