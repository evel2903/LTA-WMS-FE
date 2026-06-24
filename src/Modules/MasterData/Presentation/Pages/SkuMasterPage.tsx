import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useActiveOwners, useSkus } from '@modules/MasterData/Application/Queries/CatalogQueries';
import {
  CATALOG_EMPTY_LABELS,
  SKU_STATUSES,
} from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type { Sku, SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { SkuStatusBadge } from '@modules/MasterData/Presentation/Components/SkuStatusBadge';

type ItemStatusFilter = 'All' | SkuStatus;

export function SkuMasterPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [itemStatus, setItemStatus] = useState<ItemStatusFilter>('All');
  const [defaultOwnerId, setDefaultOwnerId] = useState('');
  const skuCode = useDebouncedValue(search, 300);

  const query = useSkus({
    page,
    skuCode: skuCode || undefined,
    itemStatus: itemStatus === 'All' ? undefined : itemStatus,
    defaultOwnerId: defaultOwnerId || undefined,
  });
  const ownersQuery = useActiveOwners();

  const skus = query.data?.items ?? [];
  const owners = ownersQuery.data?.items ?? [];
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : skus.length === 0
          ? 'empty'
          : 'ready';
  const canCreate = !apiError?.isForbidden;

  const columns: CatalogColumn<Sku>[] = [
    {
      header: 'Code',
      render: (sku) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.SKU_DETAIL(sku.id))}
        >
          {sku.skuCode}
        </button>
      ),
    },
    { header: 'Name', render: (sku) => sku.skuName },
    { header: 'Class', render: (sku) => sku.itemClass },
    { header: 'Status', render: (sku) => <SkuStatusBadge status={sku.itemStatus} /> },
  ];

  return (
    <CatalogListView
      title="SKUs"
      description="Manage item master (SKU) records and control flags."
      state={state}
      columns={columns}
      rows={skus}
      rowKey={(sku) => sku.id}
      page={page}
      totalPages={query.data?.totalPages ?? 1}
      onPageChange={setPage}
      canCreate={canCreate}
      emptyLabel={CATALOG_EMPTY_LABELS.skus}
      errorMessage={apiError?.message ?? (query.error ? 'Unable to load SKUs.' : undefined)}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.SKU_NEW}>New SKU</Link>
          </Button>
        ) : null
      }
      toolbar={
        <>
          <label className="grid gap-1 text-sm">
            SKU code
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
            Item status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={itemStatus}
              onChange={(event) => {
                setItemStatus(event.target.value as ItemStatusFilter);
                setPage(1);
              }}
            >
              <option value="All">All</option>
              {SKU_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Default owner
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={defaultOwnerId}
              onChange={(event) => {
                setDefaultOwnerId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.ownerCode} - {owner.ownerName}
                </option>
              ))}
            </select>
          </label>
        </>
      }
    />
  );
}
