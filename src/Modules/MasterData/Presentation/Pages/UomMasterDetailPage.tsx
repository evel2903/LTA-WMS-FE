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
    return <DetailPageShell title="Chi tiết đơn vị tính" state="loading" backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS} />;
  }

  if (!isCreate && apiError?.isForbidden) {
    return <DetailPageShell title="Chi tiết đơn vị tính" state="forbidden" backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS} />;
  }

  if (!isCreate && uomQuery.error) {
    return (
      <DetailPageShell
        title="Chi tiết đơn vị tính"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Không thể tải đơn vị tính.'}
        backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS}
      />
    );
  }

  if (!isCreate && !uom) {
    return <DetailPageShell title="Chi tiết đơn vị tính" state="notFound" backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS} />;
  }

  const existingUom = uom as NonNullable<typeof uom>;
  const title = isCreate ? 'Tạo đơn vị tính' : existingUom.uomCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Dữ liệu chủ đơn vị tính"
      backTo={ROUTES.FOUNDATION.MASTER_DATA.UOMS}
      backLabel="Quay lại đơn vị tính"
      status={!isCreate ? <MasterDataStatusBadge status={existingUom.status} /> : null}
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.UOM_EDIT(existingUom.id)}>Chỉnh sửa đơn vị tính</Link>
          </Button>
        ) : null
      }
      state={canEdit ? null : 'readOnly'}
    >
      <ActionPanel
        title={isCreate ? 'Tạo đơn vị tính' : 'Hành động đơn vị tính'}
        description="Thay đổi dùng mutation và audit path dữ liệu chủ hiện có."
        state={mutations.createUom.isPending || mutations.updateUom.isPending ? 'pending' : 'idle'}
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        {isCreate ? (
          <UomForm
            submitLabel="Tạo đơn vị tính"
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
            submitLabel="Cập nhật đơn vị tính"
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
