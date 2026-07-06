import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { LookupSelect } from '@shared/Components/Ui/LookupSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/Components/Ui/Table';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useSkus } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { useInventorySerialLookup } from '@modules/InventoryLookup/Application/Queries/UseInventorySerialLookup';
import type { InventorySerialLookupItem } from '@modules/InventoryLookup/Domain/Entities/InventorySerialLookupItem';

function InventoryLookupItemCard({ item }: { item: InventorySerialLookupItem }) {
  return (
    <article className="border-border bg-card text-card-foreground space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{item.serialNumber ?? item.lotNumber ?? '—'}</h2>
          <p className="text-muted-foreground text-sm">
            {item.warehouseCode} - {item.locationCode}
          </p>
        </div>
        <span className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium">
          {item.inventoryStatusCode}
        </span>
      </div>

      <dl className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground">Serial</dt>
          <dd>{item.serialNumber ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Lô</dt>
          <dd>{item.lotNumber ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Hạn dùng</dt>
          <dd>{item.expiryDate ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Tồn / Khả dụng</dt>
          <dd>
            {item.qtyOnHand} / {item.qtyAvailable}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function InventoryLookupItemTable({ items }: { items: InventorySerialLookupItem[] }) {
  return (
    <Table data-testid="inventory-lookup-table">
      <TableHeader>
        <TableRow>
          <TableHead>Serial</TableHead>
          <TableHead>Lô</TableHead>
          <TableHead>Hạn dùng</TableHead>
          <TableHead>Kho</TableHead>
          <TableHead>Vị trí</TableHead>
          <TableHead>Tồn / Khả dụng</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.dimensionId} data-testid={`inventory-lookup-row-${item.dimensionId}`}>
            <TableCell className="font-medium text-foreground">{item.serialNumber ?? '—'}</TableCell>
            <TableCell>{item.lotNumber ?? '—'}</TableCell>
            <TableCell>{item.expiryDate ?? '—'}</TableCell>
            <TableCell>{item.warehouseCode}</TableCell>
            <TableCell>{item.locationCode}</TableCell>
            <TableCell>
              {item.qtyOnHand} / {item.qtyAvailable}
            </TableCell>
            <TableCell>
              <span className="rounded-md border px-2 py-1 text-xs font-medium">
                {item.inventoryStatusCode}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function InventoryLookupPage() {
  const [skuId, setSkuId] = useState('');
  const [serialFilter, setSerialFilter] = useState('');
  const [lotFilter, setLotFilter] = useState('');
  const debouncedSerial = useDebouncedValue(serialFilter, 250);
  const debouncedLot = useDebouncedValue(lotFilter, 250);

  const skuQuery = useSkus({ itemStatus: 'Active', pageSize: 100 });
  const skuOptions = useMemo(
    () =>
      (skuQuery.data?.items ?? []).map((sku) => ({
        value: sku.id,
        label: `${sku.skuCode} - ${sku.skuName}`,
      })),
    [skuQuery.data?.items],
  );

  const query = useInventorySerialLookup({
    skuId: skuId || undefined,
    serialNumber: debouncedSerial || undefined,
    lotNumber: debouncedLot || undefined,
    page: 1,
  });
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = !skuId
    ? 'empty'
    : query.isLoading
      ? 'loading'
      : apiError?.isForbidden
        ? 'forbidden'
        : query.error
          ? 'error'
          : items.length === 0
            ? 'empty'
            : null;

  return (
    <ListPageShell
      title="Tra cứu Serial/Lô"
      description="Xem lại các số serial và lô đã ghi nhận cho một SKU, theo kho và vị trí hiện tại."
      toolbar={
        <Button
          variant="secondary"
          size="icon"
          onClick={() => void query.refetch()}
          aria-label="Làm mới kết quả tra cứu"
          disabled={!skuId}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-3">
          <LookupSelect
            id="inventory-lookup-sku-id"
            name="skuId"
            label="SKU"
            value={skuId}
            placeholder="Chọn SKU"
            options={skuOptions}
            isLoading={skuQuery.isLoading}
            isError={skuQuery.isError}
            emptyMessage="Chưa có SKU active để chọn."
            errorMessage="Không tải được danh sách SKU."
            onChange={setSkuId}
          />
          <label className="grid gap-1 text-sm">
            Lọc số serial
            <Input
              value={serialFilter}
              onChange={(event) => setSerialFilter(event.target.value)}
              placeholder="SN-0001"
              disabled={!skuId}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Lọc số lô
            <Input
              value={lotFilter}
              onChange={(event) => setLotFilter(event.target.value)}
              placeholder="LOT-0001"
              disabled={!skuId}
            />
          </label>
        </div>
      }
      state={state}
      stateTitle={
        !skuId
          ? 'Chọn SKU để bắt đầu tra cứu'
          : state === 'forbidden'
            ? 'Từ chối quyền truy cập'
            : state === 'error'
              ? 'Không thể tải kết quả tra cứu'
              : state === 'empty'
                ? 'Không có kết quả'
                : undefined
      }
      stateMessage={
        !skuId
          ? 'Chọn một SKU ở bộ lọc phía trên để xem các serial/lô đã ghi nhận.'
          : state === 'forbidden'
            ? apiError?.message
            : state === 'error'
              ? query.error instanceof Error
                ? query.error.message
                : 'Không thể tải kết quả tra cứu.'
              : state === 'empty'
                ? 'Không có serial/lô nào khớp bộ lọc hiện tại.'
                : undefined
      }
    >
      {/* Mobile (< md): card grid — easier to tap. Hidden from md up. */}
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <InventoryLookupItemCard key={item.dimensionId} item={item} />
        ))}
      </div>
      {/* Desktop (>= md): dense table for scanning/column comparison. */}
      <div className="hidden md:block">
        <InventoryLookupItemTable items={items} />
      </div>
    </ListPageShell>
  );
}
