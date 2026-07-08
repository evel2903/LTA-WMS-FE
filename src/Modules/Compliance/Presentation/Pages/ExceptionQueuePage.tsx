import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { ListRefetchWarning } from '@shared/Components/Feedback/QueryResilience';
import {
  resolveListViewState,
  useQueryRowGate,
  useResilientQueryData,
} from '@shared/Utils/QueryResilience';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useExceptions } from '@modules/Compliance/Application/Queries/UseComplianceQueries';
import { useComplianceStore } from '@modules/Compliance/Application/Stores/ComplianceStore';
import {
  EXCEPTION_STATES,
  SEVERITIES,
  type ControlExceptionSeverity,
  type ExceptionState,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';
import { ExceptionTable } from '@modules/Compliance/Presentation/Components/ExceptionTable';
import {
  exceptionSeverityLabel,
  exceptionStateLabel,
} from '@modules/Compliance/Presentation/Constants/ComplianceDisplayText';

interface ExceptionFilters {
  state: ExceptionState | '';
  exceptionType: string;
  severity: ControlExceptionSeverity | '';
  assignedToUserId: string;
  warehouseId: string;
  ownerId: string;
  referenceId: string;
}

const EMPTY_FILTERS: ExceptionFilters = {
  state: '',
  exceptionType: '',
  severity: '',
  assignedToUserId: '',
  warehouseId: '',
  ownerId: '',
  referenceId: '',
};

export function ExceptionQueuePage() {
  const store = useComplianceStore();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ExceptionFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const patch = (next: Partial<ExceptionFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  // Only free-text fields are debounced — dropdowns (state, severity) apply immediately,
  // matching ApprovalQueuePage so rows don't flicker-disable on every dropdown selection.
  const debouncedExceptionType = useDebouncedValue(filters.exceptionType, 300);
  const debouncedAssignedToUserId = useDebouncedValue(filters.assignedToUserId, 300);
  const debouncedWarehouseId = useDebouncedValue(filters.warehouseId, 300);
  const debouncedOwnerId = useDebouncedValue(filters.ownerId, 300);
  const debouncedReferenceId = useDebouncedValue(filters.referenceId, 300);
  const settledFilters = {
    state: filters.state,
    exceptionType: debouncedExceptionType,
    severity: filters.severity,
    assignedToUserId: debouncedAssignedToUserId,
    warehouseId: debouncedWarehouseId,
    ownerId: debouncedOwnerId,
    referenceId: debouncedReferenceId,
  };
  const isFilterSettled =
    debouncedExceptionType === filters.exceptionType &&
    debouncedAssignedToUserId === filters.assignedToUserId &&
    debouncedWarehouseId === filters.warehouseId &&
    debouncedOwnerId === filters.ownerId &&
    debouncedReferenceId === filters.referenceId;
  const requestKey = JSON.stringify({ filters: settledFilters, page });
  const query = useExceptions({
    page,
    state: filters.state || undefined,
    exceptionType: debouncedExceptionType || undefined,
    severity: filters.severity || undefined,
    assignedToUserId: debouncedAssignedToUserId || undefined,
    warehouseId: debouncedWarehouseId || undefined,
    ownerId: debouncedOwnerId || undefined,
    referenceId: debouncedReferenceId || undefined,
  });
  const exceptionData = useResilientQueryData(query.data);
  const cases = exceptionData?.items ?? [];
  const meta = exceptionData;
  const listApiError = query.error instanceof ApiError ? query.error : null;
  const listState = resolveListViewState({
    error: query.error,
    isLoading: query.isLoading,
    itemCount: cases.length,
  });
  const boundaryState =
    listState === 'denied' ? 'forbidden' : listState === 'ready' ? null : listState;
  const canOpenRows = useQueryRowGate({
    requestKey,
    isFilterSettled,
    page,
    data: query.data,
    error: query.error,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
  });

  useEffect(() => {
    if (!query.data || query.error || query.isPlaceholderData || query.data.page !== page) return;

    const totalPages = query.data.totalPages ?? 0;
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    } else if (totalPages === 0 && page > 1) {
      setPage(1);
    }
  }, [page, query.data, query.error, query.isPlaceholderData]);

  return (
    <ListPageShell
      title="Hàng đợi ngoại lệ"
      description="Quét các ngoại lệ trước khi mở ngữ cảnh vòng đời trên route chi tiết/action riêng."
      filtersAriaLabel="Bộ lọc hàng đợi ngoại lệ"
      contentAriaLabel="Danh sách hàng đợi ngoại lệ"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            Trạng thái
            <select
              name="state"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.state}
              onChange={(e) => patch({ state: e.target.value as ExceptionState | '' })}
            >
              <option value="">Tất cả</option>
              {EXCEPTION_STATES.map((state) => (
                <option key={state} value={state}>
                  {exceptionStateLabel(state)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Mức độ
            <select
              name="severity"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.severity}
              onChange={(e) => patch({ severity: e.target.value as ControlExceptionSeverity | '' })}
            >
              <option value="">Tất cả</option>
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {exceptionSeverityLabel(severity)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Loại
            <Input
              name="exceptionType"
              value={filters.exceptionType}
              onChange={(e) => patch({ exceptionType: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Được gán cho
            <Input
              name="assignedToUserId"
              value={filters.assignedToUserId}
              onChange={(e) => patch({ assignedToUserId: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            ID tham chiếu
            <Input
              name="referenceId"
              value={filters.referenceId}
              onChange={(e) => patch({ referenceId: e.target.value })}
            />
          </label>
        </div>
      }
      state={boundaryState}
      stateTitle={boundaryState === 'forbidden' ? 'Không có quyền' : undefined}
      stateMessage={
        boundaryState === 'empty'
          ? 'Không có ngoại lệ khớp bộ lọc.'
          : (listApiError?.message ?? 'Không thể tải ngoại lệ.')
      }
      pagination={
        listState === 'ready' ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              Trang {meta?.page ?? 1} / {meta?.totalPages ?? 1}
            </span>
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
        ) : null
      }
    >
      <ListRefetchWarning error={query.error} hasData={cases.length > 0} />
      <ExceptionTable
        cases={cases}
        selectedId={store.selectedExceptionId}
        isSelectionDisabled={!canOpenRows}
        onSelect={(item) => {
          store.setSelectedExceptionId(item.id);
          void navigate(ROUTES.FOUNDATION.EXCEPTION_DETAIL(item.id));
        }}
      />
    </ListPageShell>
  );
}
