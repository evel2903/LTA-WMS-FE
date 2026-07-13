import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import { usePartnerMutations } from '@modules/PartnerMaster/Application/Commands/UsePartnerMutations';
import { usePartner } from '@modules/PartnerMaster/Application/Queries/UsePartners';
import { displayPartnerType } from '@modules/PartnerMaster/Presentation/Constants/PartnerDisplayText';
import { PartnerForm } from '@modules/PartnerMaster/Presentation/Forms/PartnerForm';

interface PartnerMasterDetailPageProps {
  mode: 'create' | 'detail' | 'edit';
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
    return <DetailPageShell title="Chi tiết đối tác" state="loading" backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS} />;
  }

  if (!isCreate && apiError?.isForbidden) {
    return <DetailPageShell title="Chi tiết đối tác" state="forbidden" backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS} />;
  }

  if (!isCreate && partnerQuery.error) {
    return (
      <DetailPageShell
        title="Chi tiết đối tác"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Không thể tải đối tác.'}
        backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS}
      />
    );
  }

  if (!isCreate && !partner) {
    return <DetailPageShell title="Chi tiết đối tác" state="notFound" backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS} />;
  }

  const existingPartner = partner as NonNullable<typeof partner>;
  const title = isCreate ? 'Tạo đối tác' : existingPartner.partnerCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Dữ liệu chủ nhà cung cấp, khách hàng hoặc đơn vị vận chuyển"
      backTo={ROUTES.FOUNDATION.MASTER_DATA.PARTNERS}
      backLabel="Quay lại đối tác"
      status={!isCreate ? <StatusBadge status={existingPartner.status} /> : null}
      summary={
        !isCreate ? (
          <>
            <span>{displayPartnerType(existingPartner.partnerType)}</span>
            <span>{existingPartner.externalReference}</span>
          </>
        ) : null
      }
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.PARTNER_EDIT(existingPartner.id)}>Chỉnh sửa đối tác</Link>
          </Button>
        ) : null
      }
      state={canEdit ? null : 'readOnly'}
    >
      <ActionPanel
        title={isCreate ? 'Tạo đối tác' : 'Hành động đối tác'}
        description="Ngưng kích hoạt vẫn giữ hành vi mã lý do và audit hiện có."
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
            submitLabel="Tạo đối tác"
            partnerTypeEditable
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
            submitLabel="Cập nhật đối tác"
            partnerTypeEditable={false}
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
