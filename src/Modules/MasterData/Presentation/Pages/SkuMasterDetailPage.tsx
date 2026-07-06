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
import type { Owner, Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import { SkuRelationsPanel } from '@modules/MasterData/Presentation/Components/SkuRelationsPanel';
import { SkuStatusBadge } from '@modules/MasterData/Presentation/Components/SkuStatusBadge';
import { SkuForm } from '@modules/MasterData/Presentation/Forms/SkuForm';
import type { SkuFormValues } from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';

interface SkuMasterDetailPageProps {
  mode: 'create' | 'detail' | 'edit';
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
  const sku = skuQuery.data;
  const owners = ownersQuery.data?.items ?? [];
  const uoms = uomsQuery.data?.items ?? [];
  const warehouses = warehousesQuery.data?.items ?? [];
  const ownerLookupLoading = ownersQuery.isLoading;
  const uomLookupLoading = uomsQuery.isLoading;
  const setupMessages = buildSkuSetupMessages({
    ownerLookupLoading,
    uomLookupLoading,
    owners,
    ownerError: ownersQuery.error,
    uoms,
    uomError: uomsQuery.error,
  });
  const setupBlocksSubmit = uomLookupLoading || Boolean(uomsQuery.error) || (!uomLookupLoading && uoms.length === 0);
  const canEdit = !apiError?.isForbidden && !submitForbidden;
  const canMutate = canEdit && (isCreate || isEdit) && !setupBlocksSubmit;
  const pending = mutations.createSku.isPending || mutations.updateSku.isPending;

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
  const formTitle = isCreate ? 'Tạo SKU' : 'Hành động SKU';
  const formDescription = isCreate
    ? 'Tạo dữ liệu chủ SKU trực tiếp trong WMS khi chưa có ERP upstream.'
    : 'Cập nhật thuộc tính SKU và giữ audit path dữ liệu chủ hiện có.';
  const setupStateMessage = setupBlocksSubmit
    ? setupMessages[0] ?? 'Cần cấu hình đơn vị tính active trước khi tạo hoặc cập nhật SKU.'
    : undefined;

  const handleCreate = (values: SkuFormValues) =>
    mutations.createSku.mutate(values, {
      onError: setSubmitError,
      onSuccess: (created) => {
        setSubmitError(null);
        void navigate(ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(created.id));
      },
    });

  const handleUpdate = (values: SkuFormValues) =>
    mutations.updateSku.mutate(
      { id: existingSku.id, input: values },
      {
        onError: setSubmitError,
        onSuccess: (updated) => {
          setSubmitError(null);
          void navigate(ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(updated.id));
        },
      },
    );

  return (
    <DetailPageShell
      title={title}
      subtitle="Dữ liệu chủ hàng hóa"
      backTo={ROUTES.FOUNDATION.MASTER_DATA.SKUS}
      backLabel="Quay lại SKU"
      status={!isCreate ? <SkuStatusBadge status={existingSku.itemStatus} /> : null}
      actions={
        !isCreate && !isEdit && canEdit ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.SKU_EDIT(existingSku.id)}>Chỉnh sửa SKU</Link>
          </Button>
        ) : null
      }
      state={canEdit ? null : 'readOnly'}
    >
      <ActionPanel
        title={formTitle}
        description={formDescription}
        state={pending ? 'pending' : setupBlocksSubmit ? 'disabled' : 'idle'}
        stateTitle={setupBlocksSubmit ? 'Thiếu cấu hình SKU' : undefined}
        stateMessage={setupStateMessage}
        governanceState={!canEdit ? 'readOnly' : undefined}
      >
        <SkuForm
          key={isCreate ? 'sku-create' : `sku-${existingSku.id}-${existingSku.updatedAt ?? ''}`}
          initialValue={isCreate ? undefined : existingSku}
          owners={owners}
          uoms={uoms}
          submitLabel={isCreate ? 'Tạo SKU' : 'Cập nhật SKU'}
          disabled={!canMutate}
          pending={pending}
          missingSetupMessages={setupMessages}
          conflict={conflictMessage(submitError) ?? undefined}
          onSubmit={isCreate ? handleCreate : handleUpdate}
        />
      </ActionPanel>

      {!isCreate ? (
        <>
          <AuditMetadata
            createdAt={existingSku.createdAt}
            updatedAt={existingSku.updatedAt}
            createdBy={existingSku.createdBy}
            updatedBy={existingSku.updatedBy}
          />
          <SkuRelationsPanel
            skuId={existingSku.id}
            uoms={uoms}
            warehouses={warehouses}
            canEdit={canEdit}
          />
        </>
      ) : null}
    </DetailPageShell>
  );
}

function buildSkuSetupMessages({
  ownerLookupLoading,
  uomLookupLoading,
  owners,
  ownerError,
  uoms,
  uomError,
}: {
  ownerLookupLoading: boolean;
  uomLookupLoading: boolean;
  owners: Owner[];
  ownerError: unknown;
  uoms: Uom[];
  uomError: unknown;
}) {
  const messages: string[] = [];
  if (uomLookupLoading) {
    messages.push('Đang tải danh sách đơn vị tính active trước khi cho phép submit SKU.');
  }
  if (uomError) {
    messages.push('Không thể tải đơn vị tính active; cần UOM active để chọn đơn vị tính cơ sở và tồn kho.');
  }
  if (!uomLookupLoading && !uomError && uoms.length === 0) {
    messages.push('Cần ít nhất một đơn vị tính active trước khi tạo hoặc cập nhật SKU.');
  }
  if (ownerLookupLoading) {
    messages.push('Đang tải danh sách chủ hàng active; có thể tạo SKU không gắn chủ hàng mặc định.');
  }
  if (ownerError) {
    messages.push('Không thể tải chủ hàng active; có thể tạo SKU không gắn chủ hàng mặc định.');
  }
  if (!ownerLookupLoading && !ownerError && owners.length === 0) {
    messages.push('Chưa có chủ hàng active; chỉ bật kiểm soát chủ hàng sau khi có chủ hàng mặc định.');
  }
  return messages;
}
