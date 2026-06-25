import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useInventoryFilterStore } from '@modules/Inventory/Application/Stores/InventoryFilterStore';
import type { StockStatus } from '@modules/Inventory/Domain/Entities/InventoryItem';

const STOCK_FILTERS: Array<{ label: string; status?: StockStatus }> = [
  { label: 'Tất cả' },
  { label: 'Khả dụng', status: 'IN_STOCK' },
  { label: 'Sắp hết', status: 'LOW_STOCK' },
  { label: 'Hết hàng', status: 'OUT_OF_STOCK' },
];

const PLANNED_FILTERS = ['Chờ kiểm', 'Giữ', 'Không khả dụng'] as const;

/** Search + filter controls bound to the module-local filter store. */
export function InventoryToolbar() {
  const status = useInventoryFilterStore((s) => s.status);
  const setSearch = useInventoryFilterStore((s) => s.setSearch);
  const setStatus = useInventoryFilterStore((s) => s.setStatus);
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term, 300);

  useEffect(() => {
    setSearch(debounced);
  }, [debounced, setSearch]);

  return (
    <div className="grid gap-3">
      <div className="relative w-full sm:w-96">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          className="pl-8"
          placeholder="Tìm SKU, lô, LPN hoặc vị trí"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Bộ lọc tồn kho">
        {STOCK_FILTERS.map((filter) => {
          const isActive = status === filter.status || (!status && !filter.status);
          return (
            <Button
              key={filter.label}
              type="button"
              size="sm"
              variant={isActive ? 'default' : 'outline'}
              onClick={() => setStatus(filter.status)}
            >
              {filter.label}
            </Button>
          );
        })}
        {PLANNED_FILTERS.map((label) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant="outline"
            disabled
            title="Chưa có hợp đồng API khi chạy an toàn cho bộ lọc này"
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
