import { create } from 'zustand';

interface ApprovalState {
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
}

/**
 * Module-local UI selection state. Filters + pagination are kept as local page state
 * (so they reset on navigation and never go stale against a refreshed queue).
 */
export const useApprovalStore = create<ApprovalState>((set) => ({
  selectedRequestId: null,
  setSelectedRequestId: (id) => set({ selectedRequestId: id }),
}));
