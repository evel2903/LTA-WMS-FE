import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { ApiError } from '@shared/Services/Http/ApiError';
import { ListRefetchWarning } from '@shared/Components/Feedback/QueryResilience';
import { resolveListViewState, useResilientQueryData } from '@shared/Utils/QueryResilience';
import { useReasonCodes } from '@modules/ReasonCode/Application/Queries/UseReasonCodeQueries';
import {
  ACTION_CODES,
  REASON_GROUPS,
  type ActionCode,
  type ReasonCodeStatus,
  type ReasonGroup,
} from '@modules/ReasonCode/Domain/Enums/ReasonCodeEnums';
import { ReasonCodeTable } from '@modules/ReasonCode/Presentation/Components/ReasonCodeTable';
import {
  actionCodeLabel,
  reasonCodeStatusLabel,
  reasonGroupLabel,
} from '@modules/ReasonCode/Presentation/Constants/ReasonCodeDisplayText';

interface Filters {
  reasonGroup: ReasonGroup | '';
  status: ReasonCodeStatus | '';
  action: ActionCode | '';
}

const EMPTY_FILTERS: Filters = { reasonGroup: '', status: '', action: '' };

export function ReasonCodeCatalogPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const query = useReasonCodes({
    page,
    reasonGroup: filters.reasonGroup || undefined,
    status: filters.status || undefined,
    action: filters.action || undefined,
  });
  const reasonCodeData = useResilientQueryData(query.data);
  const items = reasonCodeData?.items ?? [];
  const meta = reasonCodeData;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const listState = resolveListViewState({
    error: query.error,
    isLoading: query.isLoading,
    itemCount: items.length,
  });
  const shellState: PageBoundaryState | null =
    listState === 'ready' ? null : listState === 'denied' ? 'forbidden' : listState;

  return (
    <ListPageShell
      title="Danh mục mã lý do"
      description="Quản lý mã lý do chuẩn hóa theo nhóm, hành động, bằng chứng và phiên bản."
      toolbar={
        apiError?.isForbidden ? null : (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.REASON_CODE_NEW}>Tạo mã lý do</Link>
          </Button>
        )
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-48 gap-1 text-sm">Nhóm<select
              id="reason-code-group-filter"
              name="reasonCodeGroup"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.reasonGroup}
              onChange={(e) => patch({ reasonGroup: e.target.value as ReasonGroup | '' })}
            >
              <option value="">Tất cả</option>
              {REASON_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {reasonGroupLabel(group)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-44 gap-1 text-sm">Hành động<select
              id="reason-code-action-filter"
              name="reasonCodeAction"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.action}
              onChange={(e) => patch({ action: e.target.value as ActionCode | '' })}
            >
              <option value="">Tất cả</option>
              {ACTION_CODES.map((action) => (
                <option key={action} value={action}>
                  {actionCodeLabel(action)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-44 gap-1 text-sm">Trạng thái<select
              id="reason-code-status-filter"
              name="reasonCodeStatus"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.status}
              onChange={(e) => patch({ status: e.target.value as ReasonCodeStatus | '' })}
            >
              <option value="">Tất cả</option>
              <option value="ACTIVE">{reasonCodeStatusLabel('ACTIVE')}</option>
              <option value="INACTIVE">{reasonCodeStatusLabel('INACTIVE')}</option>
            </select>
          </label>
        </div>
      }
      filtersAriaLabel="Bộ lọc mã lý do"
      contentAriaLabel="Danh sách mã lý do"
      state={shellState}
      stateTitle={shellState === 'forbidden' ? 'Không có quyền xem mã lý do' : undefined}
      stateMessage={
        shellState === 'loading'
          ? undefined
          : shellState === 'empty'
            ? 'Không có mã lý do khớp bộ lọc.'
            : (apiError?.message ?? 'Không thể tải mã lý do.')
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mã lý do</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ListRefetchWarning error={query.error} hasData={items.length > 0} />
          <ReasonCodeTable
            items={items}
            selectedId={null}
            onSelect={(item) => navigate(ROUTES.FOUNDATION.REASON_CODE_DETAIL(item.id))}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              Trang {meta?.page ?? 1} / {meta?.totalPages ?? 1}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= (meta?.totalPages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                Tiếp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </ListPageShell>
  );
}
