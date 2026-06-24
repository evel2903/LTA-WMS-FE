import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import { useUom } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';
import { UomForm } from '@modules/MasterData/Presentation/Forms/UomForm';

interface UomMasterDetailPageProps {
  mode: 'create' | 'detail' | 'edit';
}

export function UomMasterDetailPage({ mode }: UomMasterDetailPageProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const uomQuery = useUom(isCreate ? null : id);
  const mutations = useCatalogMutations();

  const apiError = uomQuery.error instanceof ApiError ? uomQuery.error : null;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canEdit = !apiError?.isForbidden && !submitForbidden;
  const canMutate = canEdit && (isCreate || isEdit);
  const uom = uomQuery.data;

  if (!isCreate && uomQuery.isLoading) {
    return <DetailPageShell title="UOM detail" state="loading" backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS} />;
  }

  if (!isCreate && apiError?.isForbidden) {
    return <DetailPageShell title="UOM detail" state="forbidden" backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS} />;
  }

  if (!isCreate && uomQuery.error) {
    return (
      <DetailPageShell
        title="UOM detail"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Unable to load UOM.'}
        backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS}
      />
    );
  }

  if (!isCreate && !uom) {
    return <DetailPageShell title="UOM detail" state="notFound" backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS} />;
  }

  const existingUom = uom as NonNullable<typeof uom>;
  const title = isCreate ? 'Create UOM' : existingUom.uomCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Unit of measure master data"
      backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS}
      backLabel="Back to UOMs"
      status={!isCreate ? <MasterDataStatusBadge status={existingUom.status} /> : null}
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.UOM_EDIT(existingUom.id)}>Edit UOM</Link>
          </Button>
        ) : null
      }
      state={canEdit ? null : 'readOnly'}
    >
      <ActionPanel
        title={isCreate ? 'Create UOM' : 'UOM actions'}
        description="Changes use the existing master-data mutation and audit path."
        state={mutations.createUom.isPending || mutations.updateUom.isPending ? 'pending' : 'idle'}
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        {isCreate ? (
          <UomForm
            submitLabel="Create UOM"
            disabled={!canMutate}
            pending={mutations.createUom.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) =>
              mutations.createUom.mutate(values, {
                onError: setSubmitError,
                onSuccess: (created) => {
                  setSubmitError(null);
                  void navigate(ROUTES.FOUNDATION.MASTER_DATA.UOM_DETAIL(created.id));
                },
              })
            }
          />
        ) : (
          <UomForm
            key={`uom-${existingUom.id}-${existingUom.updatedAt ?? ''}`}
            initialValue={existingUom}
            submitLabel="Update UOM"
            disabled={!canMutate}
            pending={mutations.updateUom.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) =>
              mutations.updateUom.mutate(
                { id: existingUom.id, input: values },
                {
                  onError: setSubmitError,
                  onSuccess: (updated) => {
                    setSubmitError(null);
                    void navigate(ROUTES.FOUNDATION.MASTER_DATA.UOM_DETAIL(updated.id));
                  },
                },
              )
            }
          />
        )}
      </ActionPanel>

      {!isCreate ? (
        <AuditMetadata
          createdAt={existingUom.createdAt}
          updatedAt={existingUom.updatedAt}
          createdBy={existingUom.createdBy}
          updatedBy={existingUom.updatedBy}
        />
      ) : null}
    </DetailPageShell>
  );
}
