import { create } from 'zustand';

import { DEFAULT_PAGE_SIZE } from '@modules/Inventory/Domain/Constants/InventoryConstants';
import type { InventoryListFilter } from '@modules/Inventory/Domain/Types/InventoryQuery';

interface InventoryFilterState extends InventoryListFilter {
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setStatus: (status: InventoryListFilter['status']) => void;
  reset: () => void;
}

const INITIAL: InventoryListFilter = { page: 1, pageSize: DEFAULT_PAGE_SIZE, search: '' };

/**
 * Module-local CLIENT state: the inventory table's filter/pagination UI state.
 * Kept out of TanStack Query (which owns server data) and out of any global
 * store — it belongs to this module only (architecture rules 6 & 7).
 */
export const useInventoryFilterStore = create<InventoryFilterState>((set) => ({
  ...INITIAL,
  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),
  setStatus: (status) => set({ status, page: 1 }),
  reset: () => set(INITIAL),
}));
