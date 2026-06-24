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
      title="Inventory Status Catalog"
      description="Manage behavior flags for existing inventory statuses. This page does not add shipment/gate/GI statuses."
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            Status code
            <Input
              className="h-9"
              placeholder="e.g. AVAILABLE"
              value={filters.statusCode}
              onChange={(e) => patch({ statusCode: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Stage group
            <Input
              className="h-9"
              placeholder="e.g. Storage"
              value={filters.stageGroup}
              onChange={(e) => patch({ stageGroup: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={filters.status}
              onChange={(e) => patch({ status: e.target.value as MasterDataStatus | '' })}
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory statuses</CardTitle>
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
                  Page {meta?.page ?? 1} / {meta?.totalPages ?? 1}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= (meta?.totalPages ?? 1)}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <InventoryStatusStateView
              state={listState}
              emptyLabel="No inventory statuses match the filters."
              errorMessage={apiError?.message ?? 'Unable to load inventory statuses.'}
            />
          )}
        </CardContent>
      </Card>
    </ListPageShell>
  );
}
