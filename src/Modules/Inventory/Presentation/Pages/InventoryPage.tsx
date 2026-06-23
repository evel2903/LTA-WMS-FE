import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Button } from '@shared/Components/Ui/Button';
import { useInventoryList } from '@modules/Inventory/Application/Queries/UseInventoryList';
import { useInventoryFilterStore } from '@modules/Inventory/Application/Stores/InventoryFilterStore';
import { InventoryControlPanel } from '@modules/Inventory/Presentation/Components/InventoryControlPanel';
import { InventoryTable } from '@modules/Inventory/Presentation/Components/InventoryTable';
import { InventoryToolbar } from '@modules/Inventory/Presentation/Components/InventoryToolbar';

/**
 * Inventory list page. Composes module-local state (filter store) with
 * server state (useInventoryList) and presentational components. It wires
 * pieces together — it contains no business or fetching logic itself.
 */
export function InventoryPage() {
  const navigate = useNavigate();
  const filter = useInventoryFilterStore();
  const setPage = useInventoryFilterStore((s) => s.setPage);
  const { data, isLoading, isFetching } = useInventoryList({
    page: filter.page,
    pageSize: filter.pageSize,
    search: filter.search,
    status: filter.status,
    warehouseId: filter.warehouseId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Stock levels across all locations</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Items {data ? `(${data.totalItems})` : ''}</CardTitle>
            <InventoryToolbar />
          </CardHeader>
          <CardContent className="space-y-4">
            <InventoryTable
              items={data?.items ?? []}
              isLoading={isLoading}
              onRowClick={(item) => navigate(ROUTES.INVENTORY.DETAIL(item.id))}
            />

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filter.page ?? 1) <= 1 || isFetching}
                  onClick={() => setPage((filter.page ?? 1) - 1)}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground text-sm">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filter.page ?? 1) >= data.totalPages || isFetching}
                  onClick={() => setPage((filter.page ?? 1) + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <InventoryControlPanel />
      </div>
    </div>
  );
}
