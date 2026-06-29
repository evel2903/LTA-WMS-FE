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
import { useExceptions } from '@modules/Compliance/Application/Queries/UseComplianceQueries';
import { useComplianceStore } from '@modules/Compliance/Application/Stores/ComplianceStore';
import {
  EXCEPTION_STATES,
  EXCEPTION_STATE_LABELS,
  SEVERITIES,
  type ControlExceptionSeverity,
  type ExceptionState,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';
import { ExceptionTable } from '@modules/Compliance/Presentation/Components/ExceptionTable';

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

  const debounced = useDebouncedValue(filters, 300);
  const query = useExceptions({
    page,
    state: debounced.state || undefined,
    exceptionType: debounced.exceptionType || undefined,
    severity: debounced.severity || undefined,
    assignedToUserId: debounced.assignedToUserId || undefined,
    warehouseId: debounced.warehouseId || undefined,
    ownerId: debounced.ownerId || undefined,
    referenceId: debounced.referenceId || undefined,
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
  const boundaryState = listState === 'denied' ? 'forbidden' : listState === 'ready' ? null : listState;
  return (
    <ListPageShell
      title="Hàng đợi ngoại lệ"
      description="Quét các ngoại lệ trước khi mở ngữ cảnh vòng đời trên route chi tiết/action riêng."
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">Trạng thái<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.state}
              onChange={(e) => patch({ state: e.target.value as ExceptionState | '' })}
            >
              <option value="">Tất cả</option>
              {EXCEPTION_STATES.map((state) => (
                <option key={state} value={state}>
                  {EXCEPTION_STATE_LABELS[state]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Mức độ<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.severity}
              onChange={(e) => patch({ severity: e.target.value as ControlExceptionSeverity | '' })}
            >
              <option value="">Tất cả</option>
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Loại<Input value={filters.exceptionType} onChange={(e) => patch({ exceptionType: e.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">Được gán cho<Input
              value={filters.assignedToUserId}
              onChange={(e) => patch({ assignedToUserId: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">ID tham chiếu<Input value={filters.referenceId} onChange={(e) => patch({ referenceId: e.target.value })} />
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
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Trang {meta?.page ?? 1} / {meta?.totalPages ?? 1}
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
      <ListRefetchWarning error={query.error} hasData={cases.length > 0} />
      <ExceptionTable
        cases={cases}
        selectedId={store.selectedExceptionId}
        onSelect={(item) => {
          store.setSelectedExceptionId(item.id);
          void navigate(ROUTES.FOUNDATION.EXCEPTION_DETAIL(item.id));
        }}
      />
    </ListPageShell>
  );
}
