import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { inlineMessage } from '@modules/InventoryStatus/Application/Commands/InventoryStatusMutationError';
import { useInventoryStatusMutations } from '@modules/InventoryStatus/Application/Commands/UseInventoryStatusMutations';
import { useInventoryStatusDetail } from '@modules/InventoryStatus/Application/Queries/UseInventoryStatusQueries';
import { InventoryStatusForm } from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusForm';
import type { InventoryStatusFormValues } from '@modules/InventoryStatus/Presentation/Forms/InventoryStatusFormSchema';

interface InventoryStatusDetailPageProps {
  mode: 'detail' | 'edit';
}

export function InventoryStatusDetailPage({ mode }: InventoryStatusDetailPageProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const detailQuery = useInventoryStatusDetail(id);
  const mutations = useInventoryStatusMutations();

  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canManage = !apiError?.isForbidden && !submitForbidden;
  const canMutate = canManage && mode === 'edit';
  const status = detailQuery.data;

  if (detailQuery.isLoading) {
    return <DetailPageShell title="Inventory status detail" state="loading" backTo={ROUTES.FOUNDATION.INVENTORY_STATUS} />;
  }

  if (apiError?.isForbidden) {
    return <DetailPageShell title="Inventory status detail" state="forbidden" backTo={ROUTES.FOUNDATION.INVENTORY_STATUS} />;
  }

  if (detailQuery.error) {
    return (
      <DetailPageShell
        title="Inventory status detail"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Unable to load inventory status.'}
        backTo={ROUTES.FOUNDATION.INVENTORY_STATUS}
      />
    );
  }

  if (!status) {
    return <DetailPageShell title="Inventory status detail" state="notFound" backTo={ROUTES.FOUNDATION.INVENTORY_STATUS} />;
  }

  const submitUpdate = (statusId: string, values: InventoryStatusFormValues) =>
    mutations.update.mutate(
      {
        id: statusId,
        input: {
          allowsAllocation: values.allowsAllocation,
          allowsPick: values.allowsPick,
          hold: values.hold,
          isTerminal: values.isTerminal,
          isMilestone: values.isMilestone,
          sortOrder: values.sortOrder,
          status: values.status,
          reasonCode: values.reasonCode,
        },
      },
      {
        onError: setSubmitError,
        onSuccess: (updated) => {
          setSubmitError(null);
          void navigate(ROUTES.FOUNDATION.INVENTORY_STATUS_DETAIL(updated.id));
        },
      },
    );

  return (
    <DetailPageShell
      title={status.statusCode}
      subtitle="Inventory status behavior flags"
      backTo={ROUTES.FOUNDATION.INVENTORY_STATUS}
      backLabel="Back to inventory statuses"
      summary={
        <>
          <span>{status.stageGroup}</span>
          <span>{status.status}</span>
        </>
      }
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to={ROUTES.FOUNDATION.INVENTORY_STATUS_EDIT(status.id)}>Edit status</Link>
        </Button>
      }
      state={canManage ? null : 'readOnly'}
    >
      <ActionPanel
        title="Inventory status actions"
        description="Update requires the existing reason code field and audit path; no new InventoryStatus values are created here."
        state={mutations.update.isPending ? 'pending' : 'idle'}
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        <InventoryStatusForm
          key={`edit-${status.id}-${status.updatedAt ?? ''}`}
          status={status}
          disabled={!canMutate}
          pending={mutations.update.isPending}
          inlineError={inlineMessage(submitError) ?? undefined}
          onSubmit={(values) => submitUpdate(status.id, values)}
        />
      </ActionPanel>
    </DetailPageShell>
  );
}
