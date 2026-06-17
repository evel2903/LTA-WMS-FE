import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useInventoryFilterStore } from '@modules/Inventory/Application/Stores/InventoryFilterStore';

/** Search + filter controls bound to the module-local filter store. */
export function InventoryToolbar() {
  const setSearch = useInventoryFilterStore((s) => s.setSearch);
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term, 300);

  useEffect(() => {
    setSearch(debounced);
  }, [debounced, setSearch]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-72 max-w-full">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          className="pl-8"
          placeholder="Search SKU or product…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
    </div>
  );
}
