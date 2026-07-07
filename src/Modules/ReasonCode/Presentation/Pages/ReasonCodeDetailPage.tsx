import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ActionPanel, DetailPageShell } from '@shared/Components/Page';
import { Badge } from '@shared/Components/Ui/Badge';
import { Button } from '@shared/Components/Ui/Button';
import { ApiError } from '@shared/Services/Http/ApiError';
import { conflictMessage } from '@modules/ReasonCode/Application/Commands/ReasonCodeMutationError';
import { useReasonCodeMutations } from '@modules/ReasonCode/Application/Commands/UseReasonCodeMutations';
import { useReasonCodeDetail } from '@modules/ReasonCode/Application/Queries/UseReasonCodeQueries';
import { ReasonCodeForm } from '@modules/ReasonCode/Presentation/Forms/ReasonCodeForm';
import type { ReasonCodeFormValues } from '@modules/ReasonCode/Presentation/Forms/ReasonCodeFormSchema';
import {
  reasonCodeStatusLabel,
  reasonGroupLabel,
} from '@modules/ReasonCode/Presentation/Constants/ReasonCodeDisplayText';

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

  useEffect(() => {
    setSubmitError(null);
  }, [id, mode]);

  if (!isCreate && detailQuery.isLoading) {
    return (
      <DetailPageShell
        title="Chi tiết mã lý do"
        state="loading"
        stateTitle="Đang tải nội dung"
        backTo={ROUTES.FOUNDATION.REASON_CODES}
        backLabel="Quay lại mã lý do"
      />
    );
  }

  if (!isCreate && apiError?.isForbidden) {
    return (
      <DetailPageShell
        title="Chi tiết mã lý do"
        state="forbidden"
        stateTitle="Cần quyền truy cập"
        stateMessage="Bạn không có quyền xem hoặc thay đổi mã lý do này."
        backTo={ROUTES.FOUNDATION.REASON_CODES}
        backLabel="Quay lại mã lý do"
      />
    );
  }

  if (!isCreate && detailQuery.error) {
    return (
      <DetailPageShell
        title="Chi tiết mã lý do"
        state={apiError?.status === 404 ? 'notFound' : 'error'}
        stateTitle={apiError?.status === 404 ? 'Không tìm thấy bản ghi' : 'Không thể tải mã lý do'}
        stateMessage="Không thể tải chi tiết mã lý do."
        backTo={ROUTES.FOUNDATION.REASON_CODES}
        backLabel="Quay lại mã lý do"
      />
    );
  }

  if (!isCreate && !reasonCode) {
    return (
      <DetailPageShell
        title="Chi tiết mã lý do"
        state="notFound"
        stateTitle="Không tìm thấy bản ghi"
        stateMessage="Mã lý do đã chọn không tồn tại hoặc không còn khả dụng."
        backTo={ROUTES.FOUNDATION.REASON_CODES}
        backLabel="Quay lại mã lý do"
      />
    );
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

  const clearableOptional = (value: string | null | undefined) => value ?? '';

  const submitUpdate = (reasonCodeId: string, values: ReasonCodeFormValues) =>
    mutations.update.mutate(
      {
        id: reasonCodeId,
        input: {
          reasonGroup: values.reasonGroup,
          description: clearableOptional(values.description),
          appliesToActions: values.appliesToActions,
          appliesToObjects: values.appliesToObjects,
          evidenceRequired: values.evidenceRequired,
          approvalRequired: values.approvalRequired,
          allowedRoleCodes: values.allowedRoleCodes,
          status: values.status,
          effectiveFrom: clearableOptional(values.effectiveFrom),
          effectiveTo: clearableOptional(values.effectiveTo),
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
  const title = isCreate ? 'Tạo mã lý do' : existingReasonCode.reasonCode;

  return (
    <DetailPageShell
      title={title}
      subtitle="Danh mục quản trị mã lý do"
      backTo={ROUTES.FOUNDATION.REASON_CODES}
      backLabel="Quay lại mã lý do"
      status={
        !isCreate ? (
          <Badge variant={existingReasonCode.status === 'ACTIVE' ? 'success' : 'outline'}>
            {reasonCodeStatusLabel(existingReasonCode.status)}
          </Badge>
        ) : null
      }
      summary={
        !isCreate ? (
          <>
            <span>Phiên bản {existingReasonCode.version}</span>
            <span>Nhóm: {reasonGroupLabel(existingReasonCode.reasonGroup)}</span>
          </>
        ) : null
      }
      actions={
        !isCreate ? (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.REASON_CODE_EDIT(existingReasonCode.id)}>Chỉnh sửa mã lý do</Link>
          </Button>
        ) : null
      }
      state={canManage ? null : 'readOnly'}
    >
      <ActionPanel
        title={isCreate ? 'Tạo mã lý do' : 'Hành động mã lý do'}
        description="Thay đổi mã lý do giữ hành vi audit theo phiên bản hiện có."
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
            conflict={conflictMessage(submitError) ?? undefined}
            onSubmit={(values) => submitUpdate(existingReasonCode.id, values)}
          />
        )}
      </ActionPanel>
    </DetailPageShell>
  );
}
