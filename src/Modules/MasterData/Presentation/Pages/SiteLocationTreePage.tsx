import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Alert, AlertDescription } from '@shared/Components/Reui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { useLocationProfiles } from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { useSiteLocationTree } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { useActiveWarehouseTypes } from '@modules/MasterData/Application/Queries/UseWarehouseTypes';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useSiteLocationTreeStore } from '@modules/MasterData/Application/Stores/SiteLocationTreeStore';
import type {
  Location,
  LocationProfile,
  Site,
  SiteLocationTree,
  Warehouse,
  WarehouseType,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import { LocationForm } from '@modules/MasterData/Presentation/Forms/LocationForm';
import {
  SiteLocationTreePageView,
  type SiteLocationTreePageMode,
  type SiteLocationTreePageState,
} from '@modules/MasterData/Presentation/Pages/SiteLocationTreePageView';
import { SiteForm } from '@modules/MasterData/Presentation/Forms/SiteForm';
import { WarehouseForm } from '@modules/MasterData/Presentation/Forms/WarehouseForm';
import { ZoneForm } from '@modules/MasterData/Presentation/Forms/ZoneForm';

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

function siteNodes(nodes: SiteLocationTree[]): Array<Extract<SiteLocationTree, { type: 'site' }>> {
  return nodes.filter((node): node is Extract<SiteLocationTree, { type: 'site' }> => node.type === 'site');
}

function selectedSite(node: SiteLocationTree | null): Site | undefined {
  return node?.type === 'site' ? node.entity : undefined;
}

function selectedWarehouse(node: SiteLocationTree | null): Warehouse | undefined {
  return node?.type === 'warehouse' ? node.entity : undefined;
}

function selectedZone(node: SiteLocationTree | null): Zone | undefined {
  return node?.type === 'zone' ? node.entity : undefined;
}

function selectedLocation(node: SiteLocationTree | null): Location | undefined {
  return node?.type === 'location' ? node.entity : undefined;
}

function CreateSitePanel({
  canEdit,
  onCreated,
}: {
  canEdit: boolean;
  onCreated: () => void;
}) {
  const mutations = useMasterDataMutations();
  const [createNonce, setCreateNonce] = useState(0);
  const handleCreated = () => {
    setCreateNonce((nonce) => nonce + 1);
    onCreated();
  };

  return (
    <SiteForm
      key={`master-create-site-${createNonce}`}
      submitLabel="Tạo site"
      disabled={!canEdit}
      pending={mutations.createSite.isPending}
      onSubmit={(values) => mutations.createSite.mutate(values, { onSuccess: handleCreated })}
    />
  );
}

function CreateWarehousePanel({
  sites,
  warehouseTypes,
  canEdit,
  onCreated,
}: {
  sites: Array<Extract<SiteLocationTree, { type: 'site' }>>;
  warehouseTypes: WarehouseType[];
  canEdit: boolean;
  onCreated: () => void;
}) {
  const mutations = useMasterDataMutations();
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? '');
  const [createNonce, setCreateNonce] = useState(0);

  useEffect(() => {
    if (sites.length === 0) {
      if (selectedSiteId !== '') setSelectedSiteId('');
      return;
    }

    if (!sites.some((site) => site.id === selectedSiteId)) {
      setSelectedSiteId(sites[0]?.id ?? '');
    }
  }, [selectedSiteId, sites]);

  const handleCreated = () => {
    setCreateNonce((nonce) => nonce + 1);
    onCreated();
  };

  if (sites.length === 0) {
    return (
      <Alert role="status" variant="info">
        <AlertDescription>Tạo site trước khi thêm kho.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        Site
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          disabled={!canEdit}
          value={selectedSiteId}
          onChange={(event) => setSelectedSiteId(event.target.value)}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.entity.siteCode} - {site.entity.siteName}
            </option>
          ))}
        </select>
      </label>
      <WarehouseForm
        key={`master-create-warehouse-${selectedSiteId}-${createNonce}`}
        siteId={selectedSiteId}
        warehouseTypes={warehouseTypes}
        submitLabel="Tạo kho"
        disabled={!canEdit || !selectedSiteId}
        pending={mutations.createWarehouse.isPending}
        onSubmit={(values) =>
          mutations.createWarehouse.mutate(
            { ...values, siteId: selectedSiteId },
            { onSuccess: handleCreated },
          )
        }
      />
    </div>
  );
}

function FormPanel({
  selectedNode,
  locationProfiles,
  warehouseTypes,
  canEdit,
}: {
  selectedNode: SiteLocationTree | null;
  locationProfiles: LocationProfile[];
  warehouseTypes: WarehouseType[];
  canEdit: boolean;
}) {
  const mutations = useMasterDataMutations();
  // Bumped after each successful create so the create forms remount with a clean
  // slate, preventing an accidental duplicate submit of the same values.
  const [createNonce, setCreateNonce] = useState(0);
  const onCreated = () => setCreateNonce((nonce) => nonce + 1);
  const site = selectedSite(selectedNode);
  const warehouse = selectedWarehouse(selectedNode);
  const zone = selectedZone(selectedNode);
  const location = selectedLocation(selectedNode);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Biểu mẫu cấu hình</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        {!selectedNode && (
          <SiteForm
            key={`create-site-${createNonce}`}
            submitLabel="Tạo site"
            disabled={!canEdit}
            pending={mutations.createSite.isPending}
            onSubmit={(values) => mutations.createSite.mutate(values, { onSuccess: onCreated })}
          />
        )}
        {site && (
          <>
            <SiteForm
              key={`site-${site.id}`}
              initialValue={site}
              submitLabel="Cập nhật site"
              disabled={!canEdit}
              pending={mutations.updateSite.isPending}
              onSubmit={(values) => mutations.updateSite.mutate({ id: site.id, input: values })}
            />
            <WarehouseForm
              key={`create-warehouse-${site.id}-${createNonce}`}
              siteId={site.id}
              warehouseTypes={warehouseTypes}
              submitLabel="Thêm kho"
              disabled={!canEdit}
              pending={mutations.createWarehouse.isPending}
              onSubmit={(values) =>
                mutations.createWarehouse.mutate(values, { onSuccess: onCreated })
              }
            />
          </>
        )}
        {warehouse && (
          <>
            <WarehouseForm
              key={`warehouse-${warehouse.id}`}
              initialValue={warehouse}
              warehouseTypes={warehouseTypes}
              submitLabel="Cập nhật kho"
              disabled={!canEdit}
              pending={mutations.updateWarehouse.isPending}
              onSubmit={(values) => mutations.updateWarehouse.mutate({ id: warehouse.id, input: values })}
            />
            <ZoneForm
              key={`create-zone-${warehouse.id}-${createNonce}`}
              warehouseId={warehouse.id}
              submitLabel="Thêm khu vực"
              disabled={!canEdit}
              pending={mutations.createZone.isPending}
              onSubmit={(values) => mutations.createZone.mutate(values, { onSuccess: onCreated })}
            />
          </>
        )}
        {zone && (
          <>
            <ZoneForm
              key={`zone-${zone.id}`}
              initialValue={zone}
              submitLabel="Cập nhật khu vực"
              disabled={!canEdit}
              pending={mutations.updateZone.isPending}
              onSubmit={(values) => mutations.updateZone.mutate({ id: zone.id, input: values })}
            />
            <LocationForm
              key={`create-location-${zone.id}-${createNonce}`}
              warehouseId={zone.warehouseId}
              zoneId={zone.id}
              locationProfiles={locationProfiles}
              submitLabel="Thêm vị trí"
              disabled={!canEdit}
              pending={mutations.createLocation.isPending}
              onSubmit={(values) =>
                mutations.createLocation.mutate(values, { onSuccess: onCreated })
              }
            />
          </>
        )}
        {location && (
          <LocationForm
            key={`location-${location.id}`}
            initialValue={location}
            locationProfiles={locationProfiles}
            submitLabel="Cập nhật vị trí"
            disabled={!canEdit}
            pending={mutations.updateLocation.isPending}
            onSubmit={(values) => mutations.updateLocation.mutate({ id: location.id, input: values })}
          />
        )}
      </CardContent>
    </Card>
  );
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
  const warehouseTypesQuery = useActiveWarehouseTypes();

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
  const sites = useMemo(() => siteNodes(nodes), [nodes]);
  const locationProfiles = profilesQuery.data?.items ?? [];
  const warehouseTypes = warehouseTypesQuery.data?.items ?? [];

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
      formPanel={
        mode === 'detail' && (state === 'ready' || state === 'empty') ? (
          <FormPanel
            selectedNode={selectedNode}
            locationProfiles={locationProfiles}
            warehouseTypes={warehouseTypes}
            canEdit={!apiError?.isForbidden}
          />
        ) : undefined
      }
      createSitePanel={
        (close) => <CreateSitePanel canEdit={!apiError?.isForbidden} onCreated={close} />
      }
      createWarehousePanel={
        (close) => (
          <CreateWarehousePanel
            sites={sites}
            warehouseTypes={warehouseTypes}
            canEdit={!apiError?.isForbidden}
            onCreated={close}
          />
        )
      }
      onSelect={(node) => setSelectedNode(node.id, node.type)}
    />
  );
}
