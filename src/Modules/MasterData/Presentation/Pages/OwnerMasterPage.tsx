import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useOwners } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { CATALOG_EMPTY_LABELS } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type { Owner } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';

type StatusFilter = 'All' | MasterDataStatus;

export function OwnerMasterPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const ownerCode = useDebouncedValue(search, 300);

  const query = useOwners({
    page,
    ownerCode: ownerCode || undefined,
    status: status === 'All' ? undefined : status,
  });

  const owners = query.data?.items ?? [];
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : owners.length === 0
          ? 'empty'
          : 'ready';
  const canCreate = !apiError?.isForbidden;

  const columns: CatalogColumn<Owner>[] = [
    {
      header: 'Code',
      render: (owner) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.OWNER_DETAIL(owner.id))}
        >
          {owner.ownerCode}
        </button>
      ),
    },
    { header: 'Name', render: (owner) => owner.ownerName },
    { header: 'Status', render: (owner) => <MasterDataStatusBadge status={owner.status} /> },
  ];

  return (
    <CatalogListView
      title="Owners"
      description="Manage owners (3PL clients / brand owners)."
      state={state}
      columns={columns}
      rows={owners}
      rowKey={(owner) => owner.id}
      page={page}
      totalPages={query.data?.totalPages ?? 1}
      onPageChange={setPage}
      canCreate={canCreate}
      emptyLabel={CATALOG_EMPTY_LABELS.owners}
      errorMessage={apiError?.message ?? (query.error ? 'Unable to load owners.' : undefined)}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.OWNER_NEW}>New owner</Link>
          </Button>
        ) : null
      }
      toolbar={
        <>
          <label className="grid gap-1 text-sm">
            Owner code
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search code"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </>
      }
    />
  );
}
