import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { ApiError } from '@shared/Services/Http/ApiError';
import { useLocationProfiles } from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { useSiteLocationTree } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { useSiteLocationTreeStore } from '@modules/MasterData/Application/Stores/SiteLocationTreeStore';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import {
  SiteLocationTreePageView,
  type SiteLocationTreePageMode,
  type SiteLocationTreePageState,
} from '@modules/MasterData/Presentation/Pages/SiteLocationTreePageView';

const EMPTY_SITE_LOCATION_TREE: SiteLocationTree[] = [];

function findNode(nodes: SiteLocationTree[], id: string | null): SiteLocationTree | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
}

function findWarehouseNode(nodes: SiteLocationTree[], warehouseId: string | null | undefined): SiteLocationTree | null {
  const node = warehouseId ? findNode(nodes, warehouseId) : null;
  return node?.type === 'warehouse' ? node : null;
}

function scopeNodesToWarehouse(nodes: SiteLocationTree[], warehouseId: string | null | undefined): SiteLocationTree[] {
  if (!warehouseId) return [];

  return nodes.flatMap((node) => {
    if (node.type !== 'site') return [];
    const warehouseChildren = node.children.filter(
      (child) => child.type === 'warehouse' && child.id === warehouseId,
    );

    if (warehouseChildren.length === 0) return [];
    return [{ ...node, children: warehouseChildren }];
  });
}

interface SiteLocationTreePageProps {
  mode?: SiteLocationTreePageMode;
}

export function SiteLocationTreePage({ mode = 'master' }: SiteLocationTreePageProps) {
  const { warehouseId } = useParams<{ warehouseId?: string }>();
  const selectedNodeId = useSiteLocationTreeStore((state) => state.selectedNodeId);
  const setSelectedNode = useSiteLocationTreeStore((state) => state.setSelectedNode);
  const treeQuery = useSiteLocationTree();
  const profilesQuery = useLocationProfiles({ status: 'Active' });

  const nodes = treeQuery.data ?? EMPTY_SITE_LOCATION_TREE;
  const routeWarehouseNode = useMemo(
    () => findWarehouseNode(nodes, warehouseId),
    [nodes, warehouseId],
  );
  const displayNodes = useMemo(
    () => (mode === 'detail' ? scopeNodesToWarehouse(nodes, warehouseId) : nodes),
    [mode, nodes, warehouseId],
  );
  const selectedNodeFromStore = useMemo(
    () => findNode(nodes, selectedNodeId),
    [nodes, selectedNodeId],
  );
  const selectedNode = useMemo(() => {
    if (mode !== 'detail') return selectedNodeFromStore;
    if (!routeWarehouseNode) return null;
    if (selectedNodeFromStore && findNode([routeWarehouseNode], selectedNodeFromStore.id)) {
      return selectedNodeFromStore;
    }
    return routeWarehouseNode;
  }, [mode, routeWarehouseNode, selectedNodeFromStore]);
  const locationProfiles = profilesQuery.data?.items ?? [];

  const apiError = treeQuery.error instanceof ApiError ? treeQuery.error : null;
  const state: SiteLocationTreePageState = apiError?.isForbidden
    ? 'denied'
    : treeQuery.isLoading
      ? 'loading'
      : treeQuery.error
        ? 'error'
        : nodes.length === 0
          ? 'empty'
          : mode === 'detail' && !routeWarehouseNode
            ? 'not-found'
            : 'ready';

  return (
    <SiteLocationTreePageView
      mode={mode}
      state={state}
      nodes={displayNodes}
      selectedNode={selectedNode}
      locationProfiles={locationProfiles}
      canCreate={!apiError?.isForbidden}
      canEdit={!apiError?.isForbidden}
      errorMessage={apiError?.message ?? (treeQuery.error ? 'Không thể tải dữ liệu master.' : undefined)}
      onSelect={(node) => setSelectedNode(node.id, node.type)}
    />
  );
}
