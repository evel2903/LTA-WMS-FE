import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useLocationProfiles } from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  LocationProfileStateView,
  type LocationProfileViewState,
} from '@modules/MasterData/Presentation/Components/LocationProfileStateView';
import { LocationProfileTable } from '@modules/MasterData/Presentation/Components/LocationProfileTable';

interface Filters {
  status: MasterDataStatus | '';
  locationType: string;
  profileCode: string;
}

const EMPTY_FILTERS: Filters = { status: '', locationType: '', profileCode: '' };

export function LocationProfileCatalogPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const debouncedCode = useDebouncedValue(filters.profileCode);
  const debouncedType = useDebouncedValue(filters.locationType);
  const query = useLocationProfiles({
    page,
    pageSize: MASTER_DATA_DEFAULT_PAGE_SIZE,
    status: filters.status || undefined,
    locationType: debouncedType || undefined,
    profileCode: debouncedCode || undefined,
  });

  const items = query.data?.items ?? [];
  const meta = query.data;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const listState: LocationProfileViewState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : items.length === 0
          ? 'empty'
          : 'ready';

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
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">Lọc mã hồ sơ<Input
              className="h-9"
              placeholder="e.g. BIN-STD"
              value={filters.profileCode}
              onChange={(event) => patch({ profileCode: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">Lọc loại vị trí<Input
              className="h-9"
              placeholder="e.g. Bin"
              value={filters.locationType}
              onChange={(event) => patch({ locationType: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">Trạng thái<select
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
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hồ sơ vị trí</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {listState === 'ready' ? (
            <>
              <LocationProfileTable
                items={items}
                selectedId={null}
                onSelect={(item) => navigate(ROUTES.FOUNDATION.LOCATION_PROFILE_DETAIL(item.id))}
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {meta?.page ?? 1} / {meta?.totalPages ?? 1}
                </span>
                <div className="flex gap-2">
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
              </div>
            </>
          ) : (
            <LocationProfileStateView
              state={listState}
              errorMessage={apiError?.message ?? 'Không thể tải hồ sơ vị trí.'}
            />
          )}
        </CardContent>
      </Card>
    </ListPageShell>
  );
}
