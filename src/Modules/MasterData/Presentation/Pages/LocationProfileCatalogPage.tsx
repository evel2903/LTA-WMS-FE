import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell, type PageBoundaryState } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useLocationProfiles } from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { LocationProfileTable } from '@modules/MasterData/Presentation/Components/LocationProfileTable';

type LocationProfileViewState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface Filters {
  status: MasterDataStatus | '';
  locationType: string;
  profileCode: string;
}

const EMPTY_FILTERS: Filters = { status: '', locationType: '', profileCode: '' };

function toPageState(state: LocationProfileViewState): PageBoundaryState | null {
  switch (state) {
    case 'loading':
      return 'loading';
    case 'empty':
      return 'empty';
    case 'error':
      return 'error';
    case 'denied':
      return 'forbidden';
    case 'ready':
      return null;
    default:
      return null;
  }
}

export function LocationProfileCatalogPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const debouncedCode = useDebouncedValue(filters.profileCode);
  const debouncedType = useDebouncedValue(filters.locationType);
  const debouncedProfileCode = debouncedCode.trim();
  const debouncedLocationType = debouncedType.trim();
  const hasActiveFilters = Boolean(debouncedProfileCode || debouncedLocationType || filters.status);
  const query = useLocationProfiles({
    page,
    pageSize: MASTER_DATA_DEFAULT_PAGE_SIZE,
    status: filters.status || undefined,
    locationType: debouncedLocationType || undefined,
    profileCode: debouncedProfileCode || undefined,
  });

  const items = query.data?.items ?? [];
  const meta = query.data;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const targetPage = Math.max(1, meta?.totalPages ?? 1);
  const pageOutOfRange =
    !query.isLoading && !query.error && (meta?.totalItems ?? 0) > 0 && page > targetPage;

  useEffect(() => {
    if (pageOutOfRange) {
      setPage(targetPage);
    }
  }, [pageOutOfRange, targetPage]);

  const listState: LocationProfileViewState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : pageOutOfRange
          ? 'loading'
          : items.length === 0
            ? 'empty'
            : 'ready';
  const pageState = toPageState(listState);
  const stateTitle =
    listState === 'denied'
      ? 'Không có quyền'
      : listState === 'error'
        ? 'Không thể tải hồ sơ vị trí'
        : listState === 'loading'
          ? 'Đang tải hồ sơ vị trí'
          : listState === 'empty'
            ? hasActiveFilters
              ? 'Không có hồ sơ vị trí phù hợp'
              : 'Chưa có hồ sơ vị trí'
            : undefined;
  const stateMessage =
    listState === 'denied'
      ? 'Bạn không có quyền xem hồ sơ vị trí trong phạm vi này.'
      : listState === 'error'
        ? (apiError?.message ?? 'Không thể tải hồ sơ vị trí.')
        : listState === 'loading'
          ? 'Đang tải hồ sơ vị trí...'
          : listState === 'empty'
            ? hasActiveFilters
              ? 'Không có hồ sơ vị trí phù hợp với bộ lọc hiện tại.'
              : 'Tạo hồ sơ vị trí đầu tiên trước khi gán hồ sơ cho vị trí vật lý.'
            : undefined;
  const stateAction =
    listState === 'empty' && !hasActiveFilters ? (
      <Button asChild size="sm" variant="outline">
        <Link to={ROUTES.FOUNDATION.LOCATION_PROFILE_NEW}>Tạo hồ sơ vị trí</Link>
      </Button>
    ) : undefined;

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  return (
    <ListPageShell
      title="Danh mục hồ sơ vị trí"
      description="Quản lý hồ sơ chính sách dùng để gán vị trí trong nền tảng."
      toolbar={
        apiError?.isForbidden ? null : (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.LOCATION_PROFILE_NEW}>Tạo hồ sơ</Link>
          </Button>
        )
      }
      filters={
        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px] md:items-end">
          <label className="grid min-w-0 gap-1 text-sm">
            Lọc mã hồ sơ
            <Input
              placeholder="VD: BIN-STD"
              value={filters.profileCode}
              onChange={(event) => patch({ profileCode: event.target.value })}
            />
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            Lọc loại vị trí
            <Input
              placeholder="VD: Ô chứa"
              value={filters.locationType}
              onChange={(event) => patch({ locationType: event.target.value })}
            />
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            Trạng thái
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.status}
              onChange={(event) => patch({ status: event.target.value as MasterDataStatus | '' })}
            >
              <option value="">Tất cả</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Inactive">Không hoạt động</option>
            </select>
          </label>
        </div>
      }
      state={pageState}
      stateTitle={stateTitle}
      stateMessage={stateMessage}
      stateAction={stateAction}
      filtersAriaLabel="Danh mục hồ sơ vị trí bộ lọc"
      contentAriaLabel="Danh mục hồ sơ vị trí danh sách"
      pagination={
        listState === 'ready' ? (
          <>
            <span className="text-muted-foreground mr-auto text-sm">
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
          </>
        ) : null
      }
    >
      {listState === 'ready' ? (
        <LocationProfileTable
          items={items}
          selectedId={null}
          onSelect={(item) => navigate(ROUTES.FOUNDATION.LOCATION_PROFILE_DETAIL(item.id))}
        />
      ) : null}
    </ListPageShell>
  );
}
