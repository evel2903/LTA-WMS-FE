import { create } from 'zustand';

interface OverrideLogState {
  selectedLogId: string | null;
  setSelectedLogId: (id: string | null) => void;
}

/** Module-local UI selection state. Filters + pagination are kept as local page state. */
export const useOverrideLogStore = create<OverrideLogState>((set) => ({
  selectedLogId: null,
  setSelectedLogId: (id) => set({ selectedLogId: id }),
}));
