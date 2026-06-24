import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import { useOwner } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';
import { OwnerPolicyView } from '@modules/MasterData/Presentation/Components/OwnerPolicyView';
import { OwnerForm } from '@modules/MasterData/Presentation/Forms/OwnerForm';

interface OwnerMasterDetailPageProps {
  mode: 'create' | 'detail' | 'edit';
}

export function OwnerMasterDetailPage({ mode }: OwnerMasterDetailPageProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const ownerQuery = useOwner(isCreate ? null : id);
  const mutations = useCatalogMutations();

  const apiError = ownerQuery.error instanceof ApiError ? ownerQuery.error : null;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canEdit = !apiError?.isForbidden && !submitForbidden;
  const canMutate = canEdit && (isCreate || isEdit);
  const owner = ownerQuery.data;

  if (!isCreate && ownerQuery.isLoading) {
    return <DetailPageShell title="Owner detail" state="loading" backTo={ROUTES.FOUNDATION.MASTER_DATA.OWNERS} />;
  }

  if (!isCreate && apiError?.isForbidden) {
    return <DetailPageShell title="Owner detail" state="forbidden" backTo={ROUTES.FOUNDATION.MASTER_DATA.OWNERS} />;
  }

  if (!isCreate && ownerQuery.error) {
    return (
      <DetailPageShell
        title="Owner detail"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Unable to load owner.'}
        backTo={ROUTES.FOUNDATION.MASTER_DATA.OWNERS}
      />
    );
  }

  if (!isCreate && !owner) {
    return <DetailPageShell title="Owner detail" state="notFound" backTo={ROUTES.FOUNDATION.MASTER_DATA.OWNERS} />;
  }

  const existingOwner = owner as NonNullable<typeof owner>;
  const title = isCreate ? 'Create owner' : existingOwner.ownerCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Owner master data"
      backTo={ROUTES.FOUNDATION.MASTER_DATA.OWNERS}
      backLabel="Back to owners"
      status={!isCreate ? <MasterDataStatusBadge status={existingOwner.status} /> : null}
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.OWNER_EDIT(existingOwner.id)}>Edit owner</Link>
          </Button>
        ) : null
      }
      state={canEdit ? null : 'readOnly'}
    >
      <ActionPanel
        title={isCreate ? 'Create owner' : 'Owner actions'}
        description="Changes use the existing master-data mutation and audit path."
        state={mutations.createOwner.isPending || mutations.updateOwner.isPending ? 'pending' : 'idle'}
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        {isCreate ? (
          <OwnerForm
            submitLabel="Create Owner"
            disabled={!canMutate}
            pending={mutations.createOwner.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) =>
              mutations.createOwner.mutate(values, {
                onError: setSubmitError,
                onSuccess: (created) => {
                  setSubmitError(null);
                  void navigate(ROUTES.FOUNDATION.MASTER_DATA.OWNER_DETAIL(created.id));
                },
              })
            }
          />
        ) : (
          <OwnerForm
            key={`owner-${existingOwner.id}-${existingOwner.updatedAt ?? ''}`}
            initialValue={existingOwner}
            submitLabel="Update Owner"
            disabled={!canMutate}
            pending={mutations.updateOwner.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) =>
              mutations.updateOwner.mutate(
                { id: existingOwner.id, input: values },
                {
                  onError: setSubmitError,
                  onSuccess: (updated) => {
                    setSubmitError(null);
                    void navigate(ROUTES.FOUNDATION.MASTER_DATA.OWNER_DETAIL(updated.id));
                  },
                },
              )
            }
          />
        )}
      </ActionPanel>

      {!isCreate ? (
        <>
          <OwnerPolicyView
            billingPolicy={existingOwner.billingPolicy}
            visibilityScope={existingOwner.visibilityScope}
          />
          <AuditMetadata
            createdAt={existingOwner.createdAt}
            updatedAt={existingOwner.updatedAt}
            createdBy={existingOwner.createdBy}
            updatedBy={existingOwner.updatedBy}
          />
        </>
      ) : null}
    </DetailPageShell>
  );
}
