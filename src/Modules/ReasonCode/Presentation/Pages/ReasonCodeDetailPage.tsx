import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { conflictMessage } from '@modules/ReasonCode/Application/Commands/ReasonCodeMutationError';
import { useReasonCodeMutations } from '@modules/ReasonCode/Application/Commands/UseReasonCodeMutations';
import { useReasonCodeDetail } from '@modules/ReasonCode/Application/Queries/UseReasonCodeQueries';
import { ReasonCodeForm } from '@modules/ReasonCode/Presentation/Forms/ReasonCodeForm';
import type { ReasonCodeFormValues } from '@modules/ReasonCode/Presentation/Forms/ReasonCodeFormSchema';

interface ReasonCodeDetailPageProps {
  mode: 'create' | 'detail' | 'edit';
}

export function ReasonCodeDetailPage({ mode }: ReasonCodeDetailPageProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const detailQuery = useReasonCodeDetail(isCreate ? null : id);
  const mutations = useReasonCodeMutations();

  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canManage = !apiError?.isForbidden && !submitForbidden;
  const canMutate = canManage && (isCreate || isEdit);
  const reasonCode = detailQuery.data;

  if (!isCreate && detailQuery.isLoading) {
    return <DetailPageShell title="Reason code detail" state="loading" backTo={ROUTES.FOUNDATION.REASON_CODES} />;
  }

  if (!isCreate && apiError?.isForbidden) {
    return <DetailPageShell title="Reason code detail" state="forbidden" backTo={ROUTES.FOUNDATION.REASON_CODES} />;
  }

  if (!isCreate && detailQuery.error) {
    return (
      <DetailPageShell
        title="Reason code detail"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Unable to load reason code.'}
        backTo={ROUTES.FOUNDATION.REASON_CODES}
      />
    );
  }

  if (!isCreate && !reasonCode) {
    return <DetailPageShell title="Reason code detail" state="notFound" backTo={ROUTES.FOUNDATION.REASON_CODES} />;
  }

  const submitCreate = (values: ReasonCodeFormValues) =>
    mutations.create.mutate(
      {
        reasonCode: values.reasonCode,
        reasonGroup: values.reasonGroup,
        description: values.description,
        appliesToActions: values.appliesToActions,
        appliesToObjects: values.appliesToObjects,
        evidenceRequired: values.evidenceRequired,
        approvalRequired: values.approvalRequired,
        allowedRoleCodes: values.allowedRoleCodes,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo,
      },
      {
        onError: setSubmitError,
        onSuccess: (created) => {
          setSubmitError(null);
          void navigate(ROUTES.FOUNDATION.REASON_CODE_DETAIL(created.id));
        },
      },
    );

  const submitUpdate = (reasonCodeId: string, values: ReasonCodeFormValues) =>
    mutations.update.mutate(
      {
        id: reasonCodeId,
        input: {
          reasonGroup: values.reasonGroup,
          description: values.description,
          appliesToActions: values.appliesToActions,
          appliesToObjects: values.appliesToObjects,
          evidenceRequired: values.evidenceRequired,
          approvalRequired: values.approvalRequired,
          allowedRoleCodes: values.allowedRoleCodes,
          status: values.status,
          effectiveFrom: values.effectiveFrom,
          effectiveTo: values.effectiveTo,
        },
      },
      {
        onError: setSubmitError,
        onSuccess: (updated) => {
          setSubmitError(null);
          void navigate(ROUTES.FOUNDATION.REASON_CODE_DETAIL(updated.id));
        },
      },
    );

  const existingReasonCode = reasonCode as NonNullable<typeof reasonCode>;
  const title = isCreate ? 'Create reason code' : existingReasonCode.reasonCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Reason code governance catalog"
      backTo={ROUTES.FOUNDATION.REASON_CODES}
      backLabel="Back to reason codes"
      summary={!isCreate ? <span>Version {existingReasonCode.version}</span> : null}
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.REASON_CODE_EDIT(existingReasonCode.id)}>Edit reason code</Link>
          </Button>
        ) : null
      }
      state={canManage ? null : 'readOnly'}
    >
      <ActionPanel
        title={isCreate ? 'Create reason code' : 'Reason code actions'}
        description="Reason code changes keep the existing versioned audit behavior."
        state={mutations.create.isPending || mutations.update.isPending ? 'pending' : 'idle'}
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        {isCreate ? (
          <ReasonCodeForm
            key="create-reason-code"
            mode="create"
            disabled={!canMutate}
            pending={mutations.create.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={submitCreate}
          />
        ) : (
          <ReasonCodeForm
            key={`edit-${existingReasonCode.id}-${existingReasonCode.version}`}
            mode="edit"
            initialValue={existingReasonCode}
            disabled={!canMutate}
            pending={mutations.update.isPending}
            onSubmit={(values) => submitUpdate(existingReasonCode.id, values)}
          />
        )}
      </ActionPanel>
    </DetailPageShell>
  );
}
