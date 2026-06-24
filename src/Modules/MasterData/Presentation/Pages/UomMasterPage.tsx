import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useUoms } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { CATALOG_EMPTY_LABELS } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type { Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';

type StatusFilter = 'All' | MasterDataStatus;

export function UomMasterPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [uomTypeFilter, setUomTypeFilter] = useState('');
  const uomCode = useDebouncedValue(search, 300);
  const uomType = useDebouncedValue(uomTypeFilter, 300);

  const query = useUoms({
    page,
    uomCode: uomCode || undefined,
    status: status === 'All' ? undefined : status,
    uomType: uomType || undefined,
  });

  const uoms = query.data?.items ?? [];
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : uoms.length === 0
          ? 'empty'
          : 'ready';
  const canCreate = !apiError?.isForbidden;

  const columns: CatalogColumn<Uom>[] = [
    {
      header: 'Code',
      render: (uom) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.UOM_DETAIL(uom.id))}
        >
          {uom.uomCode}
        </button>
      ),
    },
    { header: 'Name', render: (uom) => uom.uomName },
    { header: 'Type', render: (uom) => uom.uomType ?? '-' },
    { header: 'Precision', render: (uom) => uom.decimalPrecision },
    { header: 'Status', render: (uom) => <MasterDataStatusBadge status={uom.status} /> },
  ];

  return (
    <CatalogListView
      title="Units of measure"
      description="Manage units of measure (UOM)."
      state={state}
      columns={columns}
      rows={uoms}
      rowKey={(uom) => uom.id}
      page={page}
      totalPages={query.data?.totalPages ?? 1}
      onPageChange={setPage}
      canCreate={canCreate}
      emptyLabel={CATALOG_EMPTY_LABELS.uoms}
      errorMessage={apiError?.message ?? (query.error ? 'Unable to load units of measure.' : undefined)}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.UOM_NEW}>New UOM</Link>
          </Button>
        ) : null
      }
      toolbar={
        <>
          <label className="grid gap-1 text-sm">
            UOM code
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
            UOM type
            <Input
              value={uomTypeFilter}
              onChange={(event) => {
                setUomTypeFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Filter type"
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
