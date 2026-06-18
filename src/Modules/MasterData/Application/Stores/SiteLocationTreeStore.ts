import { create } from 'zustand';

import type { SiteLocationNodeType } from '@modules/MasterData/Domain/Types/MasterDataTree';

interface SiteLocationTreeState {
  selectedNodeId: string | null;
  selectedNodeType: SiteLocationNodeType | null;
  setSelectedNode: (id: string, type: SiteLocationNodeType) => void;
}

export const useSiteLocationTreeStore = create<SiteLocationTreeState>((set) => ({
  selectedNodeId: null,
  selectedNodeType: null,
  setSelectedNode: (id, type) => set({ selectedNodeId: id, selectedNodeType: type }),
}));
