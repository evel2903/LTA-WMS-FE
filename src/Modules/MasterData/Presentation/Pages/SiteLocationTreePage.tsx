import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { useLocationProfiles } from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { useSiteLocationTree } from '@modules/MasterData/Application/Queries/UseSiteLocationTree';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useSiteLocationTreeStore } from '@modules/MasterData/Application/Stores/SiteLocationTreeStore';
import type {
  Location,
  LocationProfile,
  Site,
  SiteLocationTree,
  Warehouse,
  Zone,
} from '@modules/MasterData/Domain/Types/MasterDataTree';
import { LocationForm } from '@modules/MasterData/Presentation/Forms/LocationForm';
import {
  SiteLocationTreePageView,
  type SiteLocationTreePageState,
} from '@modules/MasterData/Presentation/Pages/SiteLocationTreePageView';
import { SiteForm } from '@modules/MasterData/Presentation/Forms/SiteForm';
import { WarehouseForm } from '@modules/MasterData/Presentation/Forms/WarehouseForm';
import { ZoneForm } from '@modules/MasterData/Presentation/Forms/ZoneForm';

function findNode(nodes: SiteLocationTree[], id: string | null): SiteLocationTree | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return null;
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

function FormPanel({
  selectedNode,
  locationProfiles,
  canEdit,
}: {
  selectedNode: SiteLocationTree | null;
  locationProfiles: LocationProfile[];
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
        <CardTitle className="text-base">Configuration Form</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        {!selectedNode && (
          <SiteForm
            key={`create-site-${createNonce}`}
            submitLabel="Create Site"
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
              submitLabel="Update Site"
              disabled={!canEdit}
              pending={mutations.updateSite.isPending}
              onSubmit={(values) => mutations.updateSite.mutate({ id: site.id, input: values })}
            />
            <WarehouseForm
              key={`create-warehouse-${site.id}-${createNonce}`}
              siteId={site.id}
              submitLabel="Add Warehouse"
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
              submitLabel="Update Warehouse"
              disabled={!canEdit}
              pending={mutations.updateWarehouse.isPending}
              onSubmit={(values) => mutations.updateWarehouse.mutate({ id: warehouse.id, input: values })}
            />
            <ZoneForm
              key={`create-zone-${warehouse.id}-${createNonce}`}
              warehouseId={warehouse.id}
              submitLabel="Add Zone"
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
              submitLabel="Update Zone"
              disabled={!canEdit}
              pending={mutations.updateZone.isPending}
              onSubmit={(values) => mutations.updateZone.mutate({ id: zone.id, input: values })}
            />
            <LocationForm
              key={`create-location-${zone.id}-${createNonce}`}
              warehouseId={zone.warehouseId}
              zoneId={zone.id}
              locationProfiles={locationProfiles}
              submitLabel="Add Location"
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
            submitLabel="Update Location"
            disabled={!canEdit}
            pending={mutations.updateLocation.isPending}
            onSubmit={(values) => mutations.updateLocation.mutate({ id: location.id, input: values })}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function SiteLocationTreePage() {
  const selectedNodeId = useSiteLocationTreeStore((state) => state.selectedNodeId);
  const setSelectedNode = useSiteLocationTreeStore((state) => state.setSelectedNode);
  const treeQuery = useSiteLocationTree();
  const profilesQuery = useLocationProfiles({ status: 'Active' });

  const nodes = treeQuery.data ?? [];
  const selectedNode = findNode(nodes, selectedNodeId) ?? nodes[0] ?? null;
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
          : 'ready';

  return (
    <SiteLocationTreePageView
      state={state}
      nodes={nodes}
      selectedNode={selectedNode}
      locationProfiles={locationProfiles}
      canCreate={!apiError?.isForbidden}
      canEdit={!apiError?.isForbidden}
      errorMessage={apiError?.message ?? (treeQuery.error ? 'Unable to load master data.' : undefined)}
      formPanel={
        state === 'ready' || state === 'empty' ? (
          <FormPanel selectedNode={selectedNode} locationProfiles={locationProfiles} canEdit={!apiError?.isForbidden} />
        ) : undefined
      }
      onSelect={(node) => setSelectedNode(node.id, node.type)}
    />
  );
}
