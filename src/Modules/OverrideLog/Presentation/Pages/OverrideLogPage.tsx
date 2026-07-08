import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { ListRefetchWarning } from '@shared/Components/Feedback/QueryResilience';
import { resolveListViewState, useResilientQueryData } from '@shared/Utils/QueryResilience';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { OBJECT_TYPES, type ObjectType } from '@modules/OverrideLog/Domain/Enums/OverrideLogEnums';
import { useOverrideLogs } from '@modules/OverrideLog/Application/Queries/UseOverrideLogQueries';
import { OverrideLogTable } from '@modules/OverrideLog/Presentation/Components/OverrideLogTable';
import { overrideObjectTypeLabel } from '@modules/OverrideLog/Presentation/Constants/OverrideLogDisplayText';

interface Filters {
  ruleId: string;
  actorUserId: string;
  targetObjectType: ObjectType | '';
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = {
  ruleId: '',
  actorUserId: '',
  targetObjectType: '',
  from: '',
  to: '',
};

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readDateParam(value: string | null): string {
  if (!value || !DATE_PARAM_PATTERN.test(value)) return '';
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10) === value ? value : '';
}

function readFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  const targetObjectType = params.get('targetObjectType');
  const from = readDateParam(params.get('from'));
  const to = readDateParam(params.get('to'));
  const hasValidRange = !from || !to || from <= to;
  return {
    ruleId: params.get('ruleId') ?? '',
    actorUserId: params.get('actorUserId') ?? '',
    targetObjectType:
      targetObjectType && OBJECT_TYPES.includes(targetObjectType as ObjectType)
        ? (targetObjectType as ObjectType)
        : '',
    from: hasValidRange ? from : '',
    to: hasValidRange ? to : '',
  };
}

function readPage(search: string): number {
  const parsed = Number(new URLSearchParams(search).get('page') ?? 1);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildSearchParams(filters: Filters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  const setIfPresent = (key: string, value: string) => {
    if (value) params.set(key, value);
  };
  setIfPresent('ruleId', filters.ruleId);
  setIfPresent('actorUserId', filters.actorUserId);
  setIfPresent('targetObjectType', filters.targetObjectType);
  setIfPresent('from', filters.from);
  setIfPresent('to', filters.to);
  if (page > 1) params.set('page', String(page));
  return params;
}

function buildReturnTo(filters: Filters, page: number): string {
  const params = buildSearchParams(filters, page);
  const query = params.toString();
  return query ? `${ROUTES.FOUNDATION.OVERRIDES}?${query}` : ROUTES.FOUNDATION.OVERRIDES;
}

export function OverrideLogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const filters = useMemo<Filters>(
    () => ({
      ...EMPTY_FILTERS,
      ...readFilters(searchKey),
    }),
    [searchKey],
  );
  const page = useMemo(() => readPage(searchKey), [searchKey]);

  const updateSearch = (nextFilters: Filters, nextPage: number, replace = true) => {
    setSearchParams(buildSearchParams(nextFilters, nextPage), { replace });
  };

  const patch = (next: Partial<Filters>) => {
    updateSearch({ ...filters, ...next }, 1);
  };

  const debounced = useDebouncedValue(filters, 300);
  const isFilterSettled = debounced === filters;
  const requestKey = useMemo(() => JSON.stringify({ filters: debounced, page }), [debounced, page]);
  const [activeDataKey, setActiveDataKey] = useState<string | null>(null);
  const query = useOverrideLogs({
    page,
    pageSize: 50,
    ruleId: debounced.ruleId || undefined,
    actorUserId: debounced.actorUserId || undefined,
    targetObjectType: debounced.targetObjectType || undefined,
    from: debounced.from || undefined,
    to: debounced.to ? `${debounced.to}T23:59:59.999Z` : undefined,
  });

  const overrideLogData = useResilientQueryData(query.data);
  const logs = overrideLogData?.items ?? [];
  const meta = overrideLogData;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const listState = resolveListViewState({
    error: query.error,
    isLoading: query.isLoading,
    itemCount: logs.length,
  });
  const boundaryState =
    listState === 'ready' ? null : listState === 'denied' ? 'forbidden' : listState;
  const canOpenRows = isFilterSettled && !query.isFetching && activeDataKey === requestKey;

  useEffect(() => {
    if (query.data && !query.error && !query.isPlaceholderData) {
      setActiveDataKey(requestKey);
    }
  }, [query.data, query.error, query.isPlaceholderData, requestKey]);

  useEffect(() => {
    const canonicalSearch = buildSearchParams(filters, page).toString();
    if (canonicalSearch !== searchKey) {
      setSearchParams(canonicalSearch, { replace: true });
    }
  }, [filters, page, searchKey, setSearchParams]);

  useEffect(() => {
    if (!query.data) return;

    const totalPages = query.data.totalPages ?? 0;
    if (totalPages > 0 && page > totalPages) {
      setSearchParams(buildSearchParams(filters, totalPages), { replace: true });
    } else if (totalPages === 0 && page > 1) {
      setSearchParams(buildSearchParams(filters, 1), { replace: true });
    }
  }, [filters, page, query.data, setSearchParams]);

  return (
    <ListPageShell
      title="Nhật ký ghi đè"
      description="Bản ghi ghi đè chỉ đọc. Mở một dòng để xem lý do, phê duyệt, bằng chứng và snapshot trước/sau."
      filtersAriaLabel="Bộ lọc nhật ký ghi đè"
      contentAriaLabel="Danh sách nhật ký ghi đè"
      state={boundaryState}
      stateTitle={
        listState === 'denied'
          ? 'Cần quyền truy cập'
          : listState === 'empty'
            ? 'Không tìm thấy bản ghi'
            : listState === 'error'
              ? 'Không thể tải nhật ký ghi đè'
              : undefined
      }
      stateMessage={
        listState === 'empty'
          ? 'Không có nhật ký ghi đè khớp bộ lọc.'
          : listState === 'error'
            ? (apiError?.message ?? 'Không thể tải nhật ký ghi đè.')
            : undefined
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            ID quy tắc
            <Input
              name="ruleId"
              value={filters.ruleId}
              onChange={(event) => patch({ ruleId: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            ID người thực hiện
            <Input
              name="actorUserId"
              value={filters.actorUserId}
              onChange={(event) => patch({ actorUserId: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Loại đích
            <select
              name="targetObjectType"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.targetObjectType}
              onChange={(event) =>
                patch({ targetObjectType: event.target.value as ObjectType | '' })
              }
            >
              <option value="">Tất cả</option>
              {OBJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {overrideObjectTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Từ ngày
            <Input
              name="from"
              type="date"
              value={filters.from}
              onChange={(event) => patch({ from: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Đến ngày
            <Input
              name="to"
              type="date"
              value={filters.to}
              onChange={(event) => patch({ to: event.target.value })}
            />
          </label>
        </div>
      }
      pagination={
        listState === 'ready' ? (
          <div className="flex w-full items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Trang {meta?.page ?? 1} / {meta?.totalPages ?? 1}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => updateSearch(filters, Math.max(1, page - 1), false)}
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= (meta?.totalPages ?? 1)}
                onClick={() => updateSearch(filters, page + 1, false)}
              >
                Tiếp
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      <ListRefetchWarning error={query.error} hasData={logs.length > 0} />
      <OverrideLogTable
        logs={logs}
        selectedId={null}
        isSelectionDisabled={!canOpenRows}
        onSelect={(log) =>
          navigate(ROUTES.FOUNDATION.OVERRIDE_DETAIL(log.id), {
            state: { returnTo: buildReturnTo(filters, page) },
          })
        }
      />
    </ListPageShell>
  );
}
