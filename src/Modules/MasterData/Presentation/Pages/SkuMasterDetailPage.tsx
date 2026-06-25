import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import {
  useActiveOwners,
  useActiveUoms,
  useSku,
} from '@modules/MasterData/Application/Queries/CatalogQueries';
import { useActiveWarehouses } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import type { CreateSkuInput } from '@modules/MasterData/Domain/Types/CatalogQuery';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import { SkuRelationsPanel } from '@modules/MasterData/Presentation/Components/SkuRelationsPanel';
import { SkuStatusBadge } from '@modules/MasterData/Presentation/Components/SkuStatusBadge';
import type { SkuFormValues } from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';
import { SkuForm } from '@modules/MasterData/Presentation/Forms/SkuForm';

interface SkuMasterDetailPageProps {
  mode: 'create' | 'detail' | 'edit';
}

function toSkuInput(values: SkuFormValues): CreateSkuInput {
  return {
    skuCode: values.skuCode,
    skuName: values.skuName,
    itemClass: values.itemClass,
    itemStatus: values.itemStatus,
    baseUomId: values.baseUomId,
    inventoryUomId: values.inventoryUomId,
    defaultOwnerId: values.defaultOwnerId || null,
    lotControlled: values.lotControlled,
    expiryControlled: values.expiryControlled,
    serialControlled: values.serialControlled,
    ownerControlled: values.ownerControlled,
    lpnControlled: values.lpnControlled,
    temperatureControlled: values.temperatureControlled,
    dgControlled: values.dgControlled,
    customsControlled: values.customsControlled,
    qcRequired: values.qcRequired,
    bondedFlag: values.bondedFlag,
    temperatureClass: values.temperatureClass || null,
    dgClass: values.dgClass || null,
    shelfLifeDays: values.shelfLifeDays ?? null,
    minRemainingShelfLifeDays: values.minRemainingShelfLifeDays ?? null,
  };
}

export function SkuMasterDetailPage({ mode }: SkuMasterDetailPageProps) {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isCreate = mode === 'create';
  const isEdit = mode === 'edit';
  const skuQuery = useSku(isCreate ? null : id);
  const ownersQuery = useActiveOwners();
  const uomsQuery = useActiveUoms();
  const warehousesQuery = useActiveWarehouses();
  const mutations = useCatalogMutations();

  const apiError = skuQuery.error instanceof ApiError ? skuQuery.error : null;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canEdit = !apiError?.isForbidden && !submitForbidden;
  const canMutate = canEdit && (isCreate || isEdit);
  const sku = skuQuery.data;
  const owners = ownersQuery.data?.items ?? [];
  const uoms = uomsQuery.data?.items ?? [];
  const warehouses = warehousesQuery.data?.items ?? [];

  if (!isCreate && skuQuery.isLoading) {
    return <DetailPageShell title="Chi tiết SKU" state="loading" backTo={ROUTES.FOUNDATION.MASTER_DATA.SKUS} />;
  }

  if (!isCreate && apiError?.isForbidden) {
    return <DetailPageShell title="Chi tiết SKU" state="forbidden" backTo={ROUTES.FOUNDATION.MASTER_DATA.SKUS} />;
  }

  if (!isCreate && skuQuery.error) {
    return (
      <DetailPageShell
        title="Chi tiết SKU"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Không thể tải SKU.'}
        backTo={ROUTES.FOUNDATION.MASTER_DATA.SKUS}
      />
    );
  }

  if (!isCreate && !sku) {
    return <DetailPageShell title="Chi tiết SKU" state="notFound" backTo={ROUTES.FOUNDATION.MASTER_DATA.SKUS} />;
  }

  const existingSku = sku as NonNullable<typeof sku>;
  const title = isCreate ? 'Tạo SKU' : existingSku.skuCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Dữ liệu chủ hàng hóa"
      backTo={ROUTES.FOUNDATION.MASTER_DATA.SKUS}
      backLabel="Quay lại SKU"
      status={!isCreate ? <SkuStatusBadge status={existingSku.itemStatus} /> : null}
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.SKU_EDIT(existingSku.id)}>Chỉnh sửa SKU</Link>
          </Button>
        ) : null
      }
      state={canEdit ? null : 'readOnly'}
    >
      <ActionPanel
        title={isCreate ? 'Tạo SKU' : 'Hành động SKU'}
        description="Thay đổi dùng mutation và audit path dữ liệu chủ hiện có."
        state={mutations.createSku.isPending || mutations.updateSku.isPending ? 'pending' : 'idle'}
        governanceState={canMutate ? undefined : 'readOnly'}
      >
        {isCreate ? (
          <SkuForm
            owners={owners}
            uoms={uoms}
            submitLabel="Tạo SKU"
            disabled={!canMutate}
            pending={mutations.createSku.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) =>
              mutations.createSku.mutate(toSkuInput(values), {
                onError: setSubmitError,
                onSuccess: (created) => {
                  setSubmitError(null);
                  void navigate(ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(created.id));
                },
              })
            }
          />
        ) : (
          <SkuForm
            key={`sku-${existingSku.id}-${existingSku.updatedAt ?? ''}`}
            initialValue={existingSku}
            owners={owners}
            uoms={uoms}
            submitLabel="Cập nhật SKU"
            disabled={!canMutate}
            pending={mutations.updateSku.isPending}
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) =>
              mutations.updateSku.mutate(
                { id: existingSku.id, input: toSkuInput(values) },
                {
                  onError: setSubmitError,
                  onSuccess: (updated) => {
                    setSubmitError(null);
                    void navigate(ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(updated.id));
                  },
                },
              )
            }
          />
        )}
      </ActionPanel>

      {!isCreate ? (
        <>
          <AuditMetadata
            createdAt={existingSku.createdAt}
            updatedAt={existingSku.updatedAt}
            createdBy={existingSku.createdBy}
            updatedBy={existingSku.updatedBy}
          />
          <SkuRelationsPanel skuId={existingSku.id} uoms={uoms} warehouses={warehouses} canEdit={canEdit} />
        </>
      ) : null}
    </DetailPageShell>
  );
}
