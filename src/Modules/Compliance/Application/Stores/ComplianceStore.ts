import { create } from 'zustand';

interface ComplianceState {
  selectedAuditLogId: string | null;
  selectedExceptionId: string | null;
  setSelectedAuditLogId: (id: string | null) => void;
  setSelectedExceptionId: (id: string | null) => void;
}

/**
 * Module-local UI selection state. Filters + pagination are kept as local page state
 * (so they reset on navigation and never go stale against a refreshed catalog).
 */
export const useComplianceStore = create<ComplianceState>((set) => ({
  selectedAuditLogId: null,
  selectedExceptionId: null,
  setSelectedAuditLogId: (id) => set({ selectedAuditLogId: id }),
  setSelectedExceptionId: (id) => set({ selectedExceptionId: id }),
}));
