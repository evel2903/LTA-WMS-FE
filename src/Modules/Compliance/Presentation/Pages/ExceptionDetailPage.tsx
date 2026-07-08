import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { ActionPanel } from '@shared/Components/Page/ActionPanel';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { blockedMessage } from '@modules/Compliance/Application/Commands/ComplianceMutationError';
import { useExceptionMutations } from '@modules/Compliance/Application/Commands/UseExceptionMutations';
import { useExceptionDetail } from '@modules/Compliance/Application/Queries/UseComplianceQueries';
import { ExceptionDetailPanel } from '@modules/Compliance/Presentation/Components/ExceptionDetailPanel';
import { ExceptionStateBadge } from '@modules/Compliance/Presentation/Components/ExceptionStateBadge';
import {
  businessReferenceLabel,
  exceptionSeverityLabel,
} from '@modules/Compliance/Presentation/Constants/ComplianceDisplayText';

type ExceptionDetailMode = 'detail' | 'action';

interface ExceptionDetailPageProps {
  mode: ExceptionDetailMode;
}

function detailState(params: {
  id?: string;
  isLoading: boolean;
  error: unknown;
  hasException: boolean;
}): PageBoundaryState | null {
  if (!params.id) return 'notFound';
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (apiError?.status === 404) return 'notFound';
  if (params.error) return 'error';
  if (!params.hasException) return 'notFound';
  return null;
}

export function ExceptionDetailPage({ mode }: ExceptionDetailPageProps) {
  const { id } = useParams();
  const [actionError, setActionError] = useState<unknown>(null);
  useEffect(() => {
    setActionError(null);
  }, [id]);
  const detailQuery = useExceptionDetail(id ?? null);
  const exceptionCase = detailQuery.data ?? null;
  const mutations = useExceptionMutations();
  const apiError = detailQuery.error instanceof ApiError ? detailQuery.error : null;
  const isAction = mode === 'action';
  const canMutate = isAction && !apiError?.isForbidden;
  const detailReadOnlyMessage =
    'Route xem chi tiết chỉ hiển thị evidence. Mở vòng đời để thao tác.';
  const pending =
    mutations.logException.isPending ||
    mutations.assignException.isPending ||
    mutations.submitException.isPending ||
    mutations.resolveException.isPending ||
    mutations.closeException.isPending;
  const runOptions = { onError: setActionError, onSuccess: () => setActionError(null) };
  const state = detailState({
    id,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    hasException: Boolean(exceptionCase),
  });

  return (
    <DetailPageShell
      title={exceptionCase ? exceptionCase.exceptionType : 'Hồ sơ ngoại lệ'}
      subtitle="Rà soát ngữ cảnh ngoại lệ trước khi chạy action vòng đời trên route action."
      backTo={ROUTES.FOUNDATION.EXCEPTIONS}
      backLabel="Quay lại hàng đợi ngoại lệ"
      status={exceptionCase ? <ExceptionStateBadge state={exceptionCase.state} /> : null}
      summary={
        exceptionCase ? (
          <>
            <span>
              Tham chiếu:{' '}
              {businessReferenceLabel(exceptionCase.referenceType, exceptionCase.referenceId)}
            </span>
            <span>Mức độ: {exceptionSeverityLabel(exceptionCase.severity)}</span>
          </>
        ) : null
      }
      actions={
        exceptionCase ? (
          isAction ? (
            <Button asChild variant="outline">
              <Link to={ROUTES.FOUNDATION.EXCEPTION_DETAIL(exceptionCase.id)}>Xem chi tiết</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={ROUTES.FOUNDATION.EXCEPTION_ACTION(exceptionCase.id)}>Mở vòng đời</Link>
            </Button>
          )
        ) : null
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Không có quyền' : undefined}
      stateMessage={apiError?.message ?? 'Không thể tải hồ sơ ngoại lệ.'}
      contentAriaLabel="Chi tiết hồ sơ ngoại lệ"
    >
      {exceptionCase ? (
        <ActionPanel
          title={isAction ? 'Hành động vòng đời' : 'Ngữ cảnh ngoại lệ'}
          description="Chuyển trạng thái ngoại lệ giữ nguyên state, reason và audit behavior hiện có."
          state={pending ? 'pending' : 'idle'}
          governanceState={canMutate ? undefined : 'readOnly'}
          governanceMessage={!isAction ? detailReadOnlyMessage : undefined}
        >
          <ExceptionDetailPanel
            key={exceptionCase.id}
            exceptionCase={exceptionCase}
            canManage={canMutate}
            pending={pending}
            blocked={blockedMessage(actionError) ?? undefined}
            readOnlyMessage={!isAction ? detailReadOnlyMessage : undefined}
            onLog={(input) =>
              mutations.logException.mutate({ id: exceptionCase.id, input }, runOptions)
            }
            onAssign={(input) =>
              mutations.assignException.mutate({ id: exceptionCase.id, input }, runOptions)
            }
            onSubmit={(input) =>
              mutations.submitException.mutate({ id: exceptionCase.id, input }, runOptions)
            }
            onResolve={(input) =>
              mutations.resolveException.mutate({ id: exceptionCase.id, input }, runOptions)
            }
            onClose={() => mutations.closeException.mutate({ id: exceptionCase.id }, runOptions)}
          />
        </ActionPanel>
      ) : null}
    </DetailPageShell>
  );
}
