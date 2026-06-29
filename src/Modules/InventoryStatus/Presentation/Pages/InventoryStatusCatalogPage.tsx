import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ListPageShell } from '@shared/Components/Page';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { ListRefetchWarning } from '@shared/Components/Feedback/QueryResilience';
import { resolveListViewState, useResilientQueryData } from '@shared/Utils/QueryResilience';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useInventoryStatuses } from '@modules/InventoryStatus/Application/Queries/UseInventoryStatusQueries';
import type { MasterDataStatus } from '@modules/InventoryStatus/Domain/Enums/InventoryStatusEnums';
import { InventoryStatusStateView } from '@modules/InventoryStatus/Presentation/Components/StateViews';
import { InventoryStatusTable } from '@modules/InventoryStatus/Presentation/Components/InventoryStatusTable';

interface Filters {
  statusCode: string;
  stageGroup: string;
  status: MasterDataStatus | '';
}

const EMPTY_FILTERS: Filters = { statusCode: '', stageGroup: '', status: '' };

export function InventoryStatusCatalogPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const debouncedCode = useDebouncedValue(filters.statusCode);
  const debouncedStage = useDebouncedValue(filters.stageGroup);

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const query = useInventoryStatuses({
    page,
    statusCode: debouncedCode || undefined,
    stageGroup: debouncedStage || undefined,
    status: filters.status || undefined,
  });
  const inventoryStatusData = useResilientQueryData(query.data);
  const items = inventoryStatusData?.items ?? [];
  const meta = inventoryStatusData;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const listState = resolveListViewState({
    error: query.error,
    isLoading: query.isLoading,
    itemCount: items.length,
  });

  return (
    <ListPageShell
      title="Danh mục trạng thái tồn kho"
      description="Quản lý cờ hành vi cho trạng thái tồn kho hiện có. Trang này không thêm trạng thái shipment/gate/GI."
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">Mã trạng thái<Input
              className="h-9"
              placeholder="Ví dụ: AVAILABLE"
              value={filters.statusCode}
              onChange={(e) => patch({ statusCode: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">Nhóm chặng<Input
              className="h-9"
              placeholder="Ví dụ: Storage"
              value={filters.stageGroup}
              onChange={(e) => patch({ stageGroup: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">Trạng thái<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.status}
              onChange={(e) => patch({ status: e.target.value as MasterDataStatus | '' })}
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
          <CardTitle className="text-base">Trạng thái tồn kho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {listState === 'ready' ? (
            <>
              <ListRefetchWarning error={query.error} hasData={items.length > 0} />
              <InventoryStatusTable
                items={items}
                selectedId={null}
                onSelect={(item) => navigate(ROUTES.FOUNDATION.INVENTORY_STATUS_DETAIL(item.id))}
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Trang {meta?.page ?? 1} / {meta?.totalPages ?? 1}
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
            <InventoryStatusStateView
              state={listState}
              emptyLabel="Không có trạng thái tồn kho khớp bộ lọc."
              errorMessage={apiError?.message ?? 'Không thể tải trạng thái tồn kho.'}
            />
          )}
        </CardContent>
      </Card>
    </ListPageShell>
  );
}
