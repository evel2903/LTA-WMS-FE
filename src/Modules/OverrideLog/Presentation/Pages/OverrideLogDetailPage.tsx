import { useLocation, useParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { DetailPageShell } from '@shared/Components/Page/DetailPageShell';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useOverrideLogDetail } from '@modules/OverrideLog/Application/Queries/UseOverrideLogQueries';
import { OverrideControlModeBadge } from '@modules/OverrideLog/Presentation/Components/OverrideControlModeBadge';
import { OverrideLogDetailPanel } from '@modules/OverrideLog/Presentation/Components/OverrideLogDetailPanel';
import { overrideTargetLabelFromParts } from '@modules/OverrideLog/Presentation/Constants/OverrideLogDisplayText';

function resolveState(params: {
  id: string | undefined;
  isLoading: boolean;
  error: unknown;
  hasLog: boolean;
}) {
  if (!params.id) return 'notFound';
  if (params.isLoading) return 'loading';
  if (params.error instanceof ApiError && params.error.isForbidden) return 'forbidden';
  if (params.error instanceof ApiError && params.error.status === 404) return 'notFound';
  if (params.error) return 'error';
  if (!params.hasLog) return 'notFound';
  return null;
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Không thể tải chi tiết ghi đè.';
}

export function OverrideLogDetailPage() {
  const { id } = useParams();
  const overrideId = id ?? null;
  const location = useLocation();
  const routeState = location.state as { returnTo?: string } | null;
  const query = useOverrideLogDetail(overrideId);
  const log = query.data?.id === overrideId ? query.data : null;
  const state = resolveState({
    id: overrideId ?? undefined,
    isLoading: query.isLoading,
    error: query.error,
    hasLog: Boolean(log),
  });

  return (
    <DetailPageShell
      title={log?.ruleCode ?? 'Chi tiết ghi đè'}
      subtitle="Bằng chứng ghi đè chỉ đọc với lý do, tham chiếu phê duyệt và snapshot trước/sau."
      backTo={routeState?.returnTo ?? ROUTES.FOUNDATION.OVERRIDES}
      backLabel="Quay lại nhật ký ghi đè"
      status={log ? <OverrideControlModeBadge mode={log.controlMode} /> : null}
      state={state}
      stateTitle={
        state === 'forbidden'
          ? 'Cần quyền truy cập'
          : state === 'notFound'
            ? 'Không tìm thấy bản ghi'
            : state === 'loading'
              ? 'Đang tải nội dung'
              : state === 'error'
                ? 'Không thể tải chi tiết ghi đè'
                : undefined
      }
      stateMessage={
        state === 'notFound'
          ? 'Bản ghi ghi đè đã chọn không tồn tại hoặc không còn khả dụng.'
          : state === 'forbidden'
            ? 'Bạn không có quyền xem bản ghi ghi đè này.'
            : state === 'error'
              ? errorMessage(query.error)
              : undefined
      }
      summary={
        log ? (
          <>
            <span>
              {overrideTargetLabelFromParts(
                log.targetObjectType,
                log.targetObjectCode,
                log.targetObjectId,
              )}
            </span>
            <span>{log.actorUserId}</span>
            <span>{new Date(log.createdAt).toLocaleString()}</span>
          </>
        ) : null
      }
      contentAriaLabel="Chi tiết nhật ký ghi đè"
    >
      {log ? <OverrideLogDetailPanel log={log} /> : null}
    </DetailPageShell>
  );
}
