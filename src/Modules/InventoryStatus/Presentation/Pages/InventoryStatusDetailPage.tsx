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
    return <DetailPageShell title="Chi tiết trạng thái tồn kho" state="loading" backTo={ROUTES.FOUNDATION.INVENTORY_STATUS} />;
  }

  if (apiError?.isForbidden) {
    return <DetailPageShell title="Chi tiết trạng thái tồn kho" state="forbidden" backTo={ROUTES.FOUNDATION.INVENTORY_STATUS} />;
  }

  if (detailQuery.error) {
    return (
      <DetailPageShell
        title="Chi tiết trạng thái tồn kho"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateMessage={apiError?.message ?? 'Không thể tải trạng thái tồn kho.'}
        backTo={ROUTES.FOUNDATION.INVENTORY_STATUS}
      />
    );
  }

  if (!status) {
    return <DetailPageShell title="Chi tiết trạng thái tồn kho" state="notFound" backTo={ROUTES.FOUNDATION.INVENTORY_STATUS} />;
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
      subtitle="Cờ hành vi trạng thái tồn kho"
      backTo={ROUTES.FOUNDATION.INVENTORY_STATUS}
      backLabel="Quay lại trạng thái tồn kho"
      summary={
        <>
          <span>{status.stageGroup}</span>
          <span>{status.status}</span>
        </>
      }
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to={ROUTES.FOUNDATION.INVENTORY_STATUS_EDIT(status.id)}>Chỉnh sửa trạng thái</Link>
        </Button>
      }
      state={canManage ? null : 'readOnly'}
    >
      <ActionPanel
        title="Hành động trạng thái tồn kho"
        description="Cập nhật yêu cầu trường mã lý do và audit path hiện có; không tạo giá trị InventoryStatus mới tại đây."
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
