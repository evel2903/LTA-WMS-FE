import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { useWarehouseProfiles } from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles';
import {
  useWarehouseProfileStore,
  type ProfileStatusFilter,
} from '@modules/WarehouseProfile/Application/Stores/WarehouseProfileStore';
import { WarehouseProfileTable } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileTable';

function listState(params: {
  error: unknown;
  isLoading: boolean;
  itemCount: number;
}): PageBoundaryState | null {
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (params.error) return 'error';
  if (params.itemCount === 0) return 'empty';
  return null;
}

export function WarehouseProfilesPage() {
  const store = useWarehouseProfileStore();
  const navigate = useNavigate();

  const query = useWarehouseProfiles({
    page: store.page,
    status: store.statusFilter === 'ALL' ? undefined : store.statusFilter,
    warehouseTypeCode: store.warehouseTypeCodeFilter || undefined,
  });

  const profiles = query.data?.items ?? [];
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = listState({ error: query.error, isLoading: query.isLoading, itemCount: profiles.length });

  return (
    <ListPageShell
      title="Warehouse Profiles"
      description="Scan and filter warehouse strategy profiles before opening a dedicated detail/action page."
      toolbar={
        <>
          <Button asChild variant="outline">
            <Link to={ROUTES.FOUNDATION.RULE_MATRIX_PREVIEW}>Preview rules</Link>
          </Button>
          <Button asChild>
            <Link to={ROUTES.FOUNDATION.WAREHOUSE_PROFILE_NEW}>New profile</Link>
          </Button>
        </>
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={store.statusFilter}
              onChange={(event) => store.setStatusFilter(event.target.value as ProfileStatusFilter)}
            >
              <option value="ALL">All</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="RETIRED">Retired</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Warehouse type code
            <Input
              value={store.warehouseTypeCodeFilter}
              onChange={(event) => store.setWarehouseTypeCodeFilter(event.target.value)}
              placeholder="e.g. DC"
            />
          </label>
        </div>
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Permission denied' : undefined}
      stateMessage={state === 'empty' ? 'No profiles yet.' : (apiError?.message ?? 'Unable to load profiles.')}
    >
      <WarehouseProfileTable
        profiles={profiles}
        selectedId={null}
        onSelect={(profile) => {
          void navigate(ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL(profile.id));
        }}
      />
    </ListPageShell>
  );
}
