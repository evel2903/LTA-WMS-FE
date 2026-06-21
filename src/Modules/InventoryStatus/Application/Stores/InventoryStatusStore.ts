import { create } from 'zustand';

interface InventoryStatusState {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

/** Module-local UI selection state. Filters + pagination are local page state. */
export const useInventoryStatusStore = create<InventoryStatusState>((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
}));
