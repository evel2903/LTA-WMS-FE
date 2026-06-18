import { create } from 'zustand';

import type { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileEnums';

export type ProfileStatusFilter = 'ALL' | WarehouseProfileStatus;

interface WarehouseProfileState {
  selectedProfileId: string | null;
  statusFilter: ProfileStatusFilter;
  warehouseTypeCodeFilter: string;
  page: number;
  setSelectedProfileId: (id: string | null) => void;
  setStatusFilter: (status: ProfileStatusFilter) => void;
  setWarehouseTypeCodeFilter: (code: string) => void;
  setPage: (page: number) => void;
}

/** Module-local UI state (selection / filter / pagination). Server state lives in TanStack Query. */
export const useWarehouseProfileStore = create<WarehouseProfileState>((set) => ({
  selectedProfileId: null,
  statusFilter: 'ALL',
  warehouseTypeCodeFilter: '',
  page: 1,
  setSelectedProfileId: (id) => set({ selectedProfileId: id }),
  setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),
  setWarehouseTypeCodeFilter: (code) => set({ warehouseTypeCodeFilter: code, page: 1 }),
  setPage: (page) => set({ page }),
}));
