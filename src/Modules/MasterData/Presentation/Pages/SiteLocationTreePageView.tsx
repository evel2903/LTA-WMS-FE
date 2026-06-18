import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import type { LocationProfile } from '@modules/MasterData/Domain/Types/MasterDataTree';
import type { SiteLocationTree } from '@modules/MasterData/Domain/Types/MasterDataTree';
import { EntityTree } from '@modules/MasterData/Presentation/Components/EntityTree';
import { SiteLocationDetailPanel } from '@modules/MasterData/Presentation/Components/SiteLocationDetailPanel';

export type SiteLocationTreePageState = 'loading' | 'empty' | 'ready' | 'error' | 'denied';

interface SiteLocationTreePageViewProps {
  state: SiteLocationTreePageState;
  nodes: SiteLocationTree[];
  selectedNode: SiteLocationTree | null;
  locationProfiles: LocationProfile[];
  canCreate: boolean;
  canEdit: boolean;
  errorMessage?: string;
  formPanel?: ReactNode;
  onSelect: (node: SiteLocationTree) => void;
}

export function SiteLocationTreePageView({
  state,
  nodes,
  selectedNode,
  locationProfiles,
  canCreate,
  canEdit,
  errorMessage,
  formPanel,
  onSelect,
}: SiteLocationTreePageViewProps) {
  if (state === 'denied') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission denied</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            You do not have permission to read the site and location tree for this scope.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Loading site and location tree...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unable to load site and location tree</CardTitle>
          </CardHeader>
          <CardContent className="text-destructive text-sm">
            {errorMessage ?? 'An unexpected API error occurred.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No sites yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Create the first Site before adding warehouses, zones, and locations.</p>
            {canCreate ? (
              (formPanel ?? <p>Use the Create Site form to begin.</p>)
            ) : (
              <p>Read only</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Site & Location Tree</CardTitle>
          </CardHeader>
          <CardContent>
            <EntityTree nodes={nodes} selectedNodeId={selectedNode?.id ?? null} onSelect={onSelect} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <SiteLocationDetailPanel
            selectedNode={selectedNode}
            locationProfiles={locationProfiles}
            canEdit={canEdit}
          />
          {formPanel}
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site & Location Tree</h1>
        <p className="text-muted-foreground">
          Configure Site, Warehouse, Zone, Location and location profile constraints.
        </p>
      </div>
    </div>
  );
}
