import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { ListRefetchWarning } from '@shared/Components/Feedback/QueryResilience';
import {
  resolveListViewState,
  useResilientQueryData,
} from '@shared/Utils/QueryResilience';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import {
  ACTION_CODES,
  OBJECT_TYPES,
  type ActionCode,
  type ObjectType,
} from '@modules/Compliance/Domain/Enums/ComplianceEnums';
import { useAuditLogs } from '@modules/Compliance/Application/Queries/UseComplianceQueries';
import { AuditLogTable } from '@modules/Compliance/Presentation/Components/AuditLogTable';

interface AuditFilters {
  actorUserId: string;
  action: ActionCode | '';
  objectType: ObjectType | '';
  reasonCodeId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: AuditFilters = {
  actorUserId: '',
  action: '',
  objectType: '',
  reasonCodeId: '',
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

function readFilters(search: string): AuditFilters {
  const params = new URLSearchParams(search);
  const action = params.get('action');
  const objectType = params.get('objectType');
  const from = readDateParam(params.get('from'));
  const to = readDateParam(params.get('to'));
  const hasValidRange = !from || !to || from <= to;
  return {
    actorUserId: params.get('actorUserId') ?? '',
    action: action && ACTION_CODES.includes(action as ActionCode) ? (action as ActionCode) : '',
    objectType:
      objectType && OBJECT_TYPES.includes(objectType as ObjectType) ? (objectType as ObjectType) : '',
    reasonCodeId: params.get('reasonCodeId') ?? '',
    from: hasValidRange ? from : '',
    to: hasValidRange ? to : '',
  };
}

function readPage(search: string): number {
  const parsed = Number(new URLSearchParams(search).get('page') ?? 1);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildSearchParams(filters: AuditFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  const setIfPresent = (key: string, value: string) => {
    if (value) params.set(key, value);
  };
  setIfPresent('actorUserId', filters.actorUserId);
  setIfPresent('action', filters.action);
  setIfPresent('objectType', filters.objectType);
  setIfPresent('reasonCodeId', filters.reasonCodeId);
  setIfPresent('from', filters.from);
  setIfPresent('to', filters.to);
  if (page > 1) params.set('page', String(page));
  return params;
}

function buildReturnTo(filters: AuditFilters, page: number): string {
  const params = buildSearchParams(filters, page);
  const query = params.toString();
  return query ? `${ROUTES.FOUNDATION.AUDIT}?${query}` : ROUTES.FOUNDATION.AUDIT;
}

export function AuditLogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const filters = useMemo<AuditFilters>(
    () => ({
      ...EMPTY_FILTERS,
      ...readFilters(searchKey),
    }),
    [searchKey],
  );
  const page = useMemo(() => readPage(searchKey), [searchKey]);

  const updateSearch = (nextFilters: AuditFilters, nextPage: number, replace = true) => {
    setSearchParams(buildSearchParams(nextFilters, nextPage), { replace });
  };

  const patch = (next: Partial<AuditFilters>) => {
    updateSearch({ ...filters, ...next }, 1);
  };

  const debounced = useDebouncedValue(filters, 300);
  const isFilterSettled = debounced === filters;
  const requestKey = useMemo(() => JSON.stringify({ filters: debounced, page }), [debounced, page]);
  const [activeDataKey, setActiveDataKey] = useState<string | null>(null);
  const query = useAuditLogs({
    page,
    pageSize: 50,
    actorUserId: debounced.actorUserId || undefined,
    action: debounced.action || undefined,
    objectType: debounced.objectType || undefined,
    reasonCodeId: debounced.reasonCodeId || undefined,
    from: debounced.from || undefined,
    to: debounced.to ? `${debounced.to}T23:59:59.999Z` : undefined,
  });

  const auditData = useResilientQueryData(query.data);
  const entries = auditData?.items ?? [];
  const meta = auditData;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const listState = resolveListViewState({
    error: query.error,
    isLoading: query.isLoading,
    itemCount: entries.length,
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
      title="Nhật ký kiểm toán"
      description="Sự kiện kiểm toán chỉ đọc. Mở một dòng để xem snapshot trước/sau trên trang chi tiết riêng."
      state={boundaryState}
      stateTitle={
        listState === 'denied'
          ? 'Cần quyền truy cập'
          : listState === 'empty'
            ? 'Không tìm thấy bản ghi'
            : listState === 'error'
              ? 'Không thể tải nhật ký kiểm toán'
              : undefined
      }
      stateMessage={
        listState === 'empty'
          ? 'Không có sự kiện kiểm toán khớp bộ lọc.'
          : listState === 'error'
            ? apiError?.message ?? 'Không thể tải nhật ký kiểm toán.'
            : undefined
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">ID người thực hiện<Input value={filters.actorUserId} onChange={(event) => patch({ actorUserId: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">Hành động<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.action}
              onChange={(event) => patch({ action: event.target.value as ActionCode | '' })}
            >
              <option value="">Tất cả</option>
              {ACTION_CODES.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Loại đối tượng<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.objectType}
              onChange={(event) => patch({ objectType: event.target.value as ObjectType | '' })}
            >
              <option value="">Tất cả</option>
              {OBJECT_TYPES.map((objectType) => (
                <option key={objectType} value={objectType}>
                  {objectType}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">ID mã lý do<Input value={filters.reasonCodeId} onChange={(event) => patch({ reasonCodeId: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            Từ ngày
            <Input type="date" value={filters.from} onChange={(event) => patch({ from: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            Đến ngày
            <Input type="date" value={filters.to} onChange={(event) => patch({ to: event.target.value })} />
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
              >Trước</Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= (meta?.totalPages ?? 1)}
                onClick={() => updateSearch(filters, page + 1, false)}
              >Tiếp</Button>
            </div>
          </div>
        ) : null
      }
    >
      <ListRefetchWarning error={query.error} hasData={entries.length > 0} />
      <AuditLogTable
        entries={entries}
        selectedId={null}
        isSelectionDisabled={!canOpenRows}
        onSelect={(entry) =>
          navigate(ROUTES.FOUNDATION.AUDIT_DETAIL(entry.id), {
            state: { returnTo: buildReturnTo(filters, page) },
          })
        }
      />
    </ListPageShell>
  );
}
