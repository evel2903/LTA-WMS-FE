import { create } from 'zustand';

interface AccessControlState {
  selectedUserId: string | null;
  objectTypeFilter: string;
  page: number;
  rolesPage: number;
  setSelectedUserId: (id: string | null) => void;
  setObjectTypeFilter: (objectType: string) => void;
  setPage: (page: number) => void;
  setRolesPage: (page: number) => void;
}

/** Module-local UI state (selection / matrix filter / pagination). Server state lives in TanStack Query. */
export const useAccessControlStore = create<AccessControlState>((set) => ({
  selectedUserId: null,
  objectTypeFilter: 'ALL',
  page: 1,
  rolesPage: 1,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  setObjectTypeFilter: (objectType) => set({ objectTypeFilter: objectType }),
  setPage: (page) => set({ page }),
  setRolesPage: (page) => set({ rolesPage: page }),
}));
