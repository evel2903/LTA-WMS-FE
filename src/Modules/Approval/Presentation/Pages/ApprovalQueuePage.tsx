import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { ListRefetchWarning } from '@shared/Components/Feedback/QueryResilience';
import { resolveListViewState, useResilientQueryData } from '@shared/Utils/QueryResilience';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useApprovalRequests } from '@modules/Approval/Application/Queries/UseApprovalQueries';
import { useApprovalStore } from '@modules/Approval/Application/Stores/ApprovalStore';
import {
  ACTION_CODES,
  APPROVAL_DECISIONS,
  APPROVAL_DECISION_LABELS,
  OBJECT_TYPES,
  type ActionCode,
  type ApprovalDecision,
  type ObjectType,
} from '@modules/Approval/Domain/Enums/ApprovalEnums';
import { ApprovalRequestTable } from '@modules/Approval/Presentation/Components/ApprovalRequestTable';

interface Filters {
  decision: ApprovalDecision | '';
  action: ActionCode | '';
  targetObjectType: ObjectType | '';
  requesterUserId: string;
  targetObjectId: string;
}

const EMPTY_FILTERS: Filters = {
  decision: '',
  action: '',
  targetObjectType: '',
  requesterUserId: '',
  targetObjectId: '',
};

export function ApprovalQueuePage() {
  const store = useApprovalStore();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const debouncedRequester = useDebouncedValue(filters.requesterUserId, 300);
  const debouncedTargetId = useDebouncedValue(filters.targetObjectId, 300);
  const query = useApprovalRequests({
    page,
    decision: filters.decision || undefined,
    action: filters.action || undefined,
    targetObjectType: filters.targetObjectType || undefined,
    requesterUserId: debouncedRequester || undefined,
    targetObjectId: debouncedTargetId || undefined,
  });
  const approvalData = useResilientQueryData(query.data);
  const items = approvalData?.items ?? [];
  const meta = approvalData;
  const listApiError = query.error instanceof ApiError ? query.error : null;
  const listState = resolveListViewState({
    error: query.error,
    isLoading: query.isLoading,
    itemCount: items.length,
  });
  const boundaryState = listState === 'denied' ? 'forbidden' : listState === 'ready' ? null : listState;

  return (
    <ListPageShell
      title="Hàng đợi phê duyệt"
      description="Quét yêu cầu phê duyệt trước khi mở ngữ cảnh quyết định trên route chi tiết/action riêng."
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">Quyết định<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.decision}
              onChange={(e) => patch({ decision: e.target.value as ApprovalDecision | '' })}
            >
              <option value="">Tất cả</option>
              {APPROVAL_DECISIONS.map((decision) => (
                <option key={decision} value={decision}>
                  {APPROVAL_DECISION_LABELS[decision]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Loại<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.targetObjectType}
              onChange={(e) => patch({ targetObjectType: e.target.value as ObjectType | '' })}
            >
              <option value="">Tất cả</option>
              {OBJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Hành động<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.action}
              onChange={(e) => patch({ action: e.target.value as ActionCode | '' })}
            >
              <option value="">Tất cả</option>
              {ACTION_CODES.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">ID người yêu cầu<Input
              value={filters.requesterUserId}
              onChange={(e) => patch({ requesterUserId: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">ID đối tượng đích<Input
              value={filters.targetObjectId}
              onChange={(e) => patch({ targetObjectId: e.target.value })}
            />
          </label>
        </div>
      }
      state={boundaryState}
      stateTitle={boundaryState === 'forbidden' ? 'Không có quyền' : undefined}
      stateMessage={
        boundaryState === 'empty'
          ? 'Không có yêu cầu phê duyệt khớp bộ lọc.'
          : (listApiError?.message ?? 'Không thể tải yêu cầu phê duyệt.')
      }
      pagination={
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Page {meta?.page ?? 1} / {meta?.totalPages ?? 1}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >Trước</Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= (meta?.totalPages ?? 1)}
            onClick={() => setPage((value) => value + 1)}
          >Tiếp</Button>
        </div>
      }
    >
      <ListRefetchWarning error={query.error} hasData={items.length > 0} />
      <ApprovalRequestTable
        items={items}
        selectedId={store.selectedRequestId}
        onSelect={(item) => {
          store.setSelectedRequestId(item.id);
          void navigate(ROUTES.FOUNDATION.APPROVAL_DETAIL(item.id));
        }}
      />
    </ListPageShell>
  );
}
