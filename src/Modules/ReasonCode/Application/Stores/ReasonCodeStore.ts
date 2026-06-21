import { create } from 'zustand';

interface ReasonCodeState {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

/** Module-local UI selection state. Filters + pagination are local page state. */
export const useReasonCodeStore = create<ReasonCodeState>((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
}));
