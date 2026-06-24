import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { usePartnerMutations } from '@modules/PartnerMaster/Application/Commands/UsePartnerMutations';
import { usePartner } from '@modules/PartnerMaster/Application/Queries/UsePartners';
import type { PartnerStatus } from '@modules/PartnerMaster/Domain/Types/Partner';
import { PartnerForm } from '@modules/PartnerMaster/Presentation/Forms/PartnerForm';

interface PartnerMasterDetailPageProps {
  mode: 'create' | 'detail' | 'edit';
}

function StatusBadge({ status }: { status: PartnerStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

export function PartnerMasterDetailPage({ mode }: PartnerMasterDetailPageProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const partnerQuery = usePartner(isCreate ? null : id);
  const mutations = usePartnerMutations();

  const apiError = partnerQuery.error instanceof ApiError ? partnerQuery.error : null;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canEdit = !apiError?.isForbidden && !submitForbidden;
  const canMutate = canEdit && (isCreate || isEdit);
  const partner = partnerQuery.data;

  if (!isCreate && partnerQuery.isLoading) {
    return <DetailPageShell title="Partner detail" state="loading" backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS} />;
  }

  if (!isCreate && apiError?.isForbidden) {
    return <DetailPageShell title="Partner detail" state="forbidden" backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS} />;
  }

  if (!isCreate && partnerQuery.error) {
    return (
      <DetailPageShell
        title="Partner detail"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Unable to load partner.'}
        backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS}
      />
    );
  }

  if (!isCreate && !partner) {
    return <DetailPageShell title="Partner detail" state="notFound" backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS} />;
  }

  const existingPartner = partner as NonNullable<typeof partner>;
  const title = isCreate ? 'Create partner' : existingPartner.partnerCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Supplier, customer or carrier master data"
      backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS}
      backLabel="Back to partners"
      status={!isCreate ? <StatusBadge status={existingPartner.status} /> : null}
      summary={
        !isCreate ? (
          <>
            <span>{existingPartner.partnerType}</span>
            <span>{existingPartner.externalReference}</span>
          </>
        ) : null
      }
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.PARTNER_EDIT(existingPartner.id)}>Edit partner</Link>
          </Button>
        ) : null
      }
      state={canEdit ? null : 'readOnly'}
    >
      <ActionPanel
        title={isCreate ? 'Create partner' : 'Partner actions'}
        description="Deactivate keeps the existing reason-code and audit behavior."
        state={
          mutations.createPartner.isPending ||
          mutations.updatePartner.isPending ||
          mutations.deactivatePartner.isPending
            ? 'pending'
            : 'idle'
        }
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        {isCreate ? (
          <PartnerForm
            submitLabel="Create partner"
            disabled={!canMutate}
            pending={mutations.createPartner.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) =>
              mutations.createPartner.mutate(values, {
                onError: setSubmitError,
                onSuccess: (created) => {
                  setSubmitError(null);
                  void navigate(ROUTES.FOUNDATION.MASTER_DATA.PARTNER_DETAIL(created.id));
                },
              })
            }
          />
        ) : (
          <PartnerForm
            key={`partner-${existingPartner.id}-${existingPartner.updatedAt ?? ''}`}
            initialValue={existingPartner}
            submitLabel="Update partner"
            disabled={!canMutate}
            pending={mutations.updatePartner.isPending}
            deactivatePending={mutations.deactivatePartner.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) => {
              mutations.updatePartner.mutate(
                {
                  id: existingPartner.id,
                  input: {
                    partnerCode: values.partnerCode,
                    partnerName: values.partnerName,
                    status: values.status,
                    sourceSystem: values.sourceSystem,
                    externalReference: values.externalReference,
                    referenceText: values.referenceText,
                  },
                },
                {
                  onError: setSubmitError,
                  onSuccess: (updated) => {
                    setSubmitError(null);
                    void navigate(ROUTES.FOUNDATION.MASTER_DATA.PARTNER_DETAIL(updated.id));
                  },
                },
              );
            }}
            onDeactivate={(values) =>
              mutations.deactivatePartner.mutate(
                { id: existingPartner.id, input: values },
                {
                  onError: setSubmitError,
                  onSuccess: (updated) => {
                    setSubmitError(null);
                    void navigate(ROUTES.FOUNDATION.MASTER_DATA.PARTNER_DETAIL(updated.id));
                  },
                },
              )
            }
          />
        )}
      </ActionPanel>
    </DetailPageShell>
  );
}
