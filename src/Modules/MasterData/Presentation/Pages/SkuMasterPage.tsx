import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import {
  useActiveOwners,
  useActiveUoms,
  useSkus,
} from '@modules/MasterData/Application/Queries/CatalogQueries';
import { SKU_STATUSES } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type { Sku, SkuStatus } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { CreateSkuInput } from '@modules/MasterData/Domain/Types/CatalogQuery';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { SkuRelationsPanel } from '@modules/MasterData/Presentation/Components/SkuRelationsPanel';
import { SkuStatusBadge } from '@modules/MasterData/Presentation/Components/SkuStatusBadge';
import type { SkuFormValues } from '@modules/MasterData/Presentation/Forms/CatalogFormSchemas';
import { SkuForm } from '@modules/MasterData/Presentation/Forms/SkuForm';

type ItemStatusFilter = 'All' | SkuStatus;

/** Maps validated form values into a repository create/update input. */
function toSkuInput(values: SkuFormValues): CreateSkuInput {
  return {
    skuCode: values.skuCode,
    skuName: values.skuName,
    itemClass: values.itemClass,
    itemStatus: values.itemStatus,
    baseUomId: values.baseUomId,
    inventoryUomId: values.inventoryUomId,
    defaultOwnerId: values.defaultOwnerId || null,
    lotControlled: values.lotControlled,
    expiryControlled: values.expiryControlled,
    serialControlled: values.serialControlled,
    ownerControlled: values.ownerControlled,
    lpnControlled: values.lpnControlled,
    temperatureControlled: values.temperatureControlled,
    dgControlled: values.dgControlled,
    customsControlled: values.customsControlled,
    qcRequired: values.qcRequired,
    bondedFlag: values.bondedFlag,
    temperatureClass: values.temperatureClass || null,
    dgClass: values.dgClass || null,
    shelfLifeDays: values.shelfLifeDays ?? null,
    minRemainingShelfLifeDays: values.minRemainingShelfLifeDays ?? null,
  };
}

export function SkuMasterPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [itemStatus, setItemStatus] = useState<ItemStatusFilter>('All');
  const [defaultOwnerId, setDefaultOwnerId] = useState('');
  const [selected, setSelected] = useState<Sku | null>(null);
  const [createNonce, setCreateNonce] = useState(0);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const skuCode = useDebouncedValue(search, 300);

  const query = useSkus({
    page,
    skuCode: skuCode || undefined,
    itemStatus: itemStatus === 'All' ? undefined : itemStatus,
    defaultOwnerId: defaultOwnerId || undefined,
  });
  const ownersQuery = useActiveOwners();
  const uomsQuery = useActiveUoms();
  const mutations = useCatalogMutations();

  const skus = query.data?.items ?? [];
  const owners = ownersQuery.data?.items ?? [];
  const uoms = uomsQuery.data?.items ?? [];
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
  const canEdit = !apiError?.isForbidden;

  const columns: CatalogColumn<Sku>[] = [
    {
      header: 'Code',
      render: (sku) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => {
            setSelected(sku);
            setSubmitError(null);
          }}
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
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
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
          canCreate={canEdit}
          errorMessage={apiError?.message ?? (query.error ? 'Unable to load SKUs.' : undefined)}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selected ? 'Edit SKU' : 'Create SKU'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <SkuForm
                key={`sku-${selected.id}`}
                initialValue={selected}
                owners={owners}
                uoms={uoms}
                submitLabel="Update SKU"
                disabled={!canEdit}
                pending={mutations.updateSku.isPending}
                conflict={conflictMessage(submitError) ?? undefined}
                onSubmit={(values) =>
                  mutations.updateSku.mutate(
                    { id: selected.id, input: toSkuInput(values) },
                    { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
                  )
                }
              />
            ) : (
              <SkuForm
                key={`create-sku-${createNonce}`}
                owners={owners}
                uoms={uoms}
                submitLabel="Create SKU"
                disabled={!canEdit}
                pending={mutations.createSku.isPending}
                conflict={conflictMessage(submitError) ?? undefined}
                onSubmit={(values) =>
                  mutations.createSku.mutate(toSkuInput(values), {
                    onError: setSubmitError,
                    onSuccess: () => {
                      setSubmitError(null);
                      setCreateNonce((value) => value + 1);
                    },
                  })
                }
              />
            )}
            {selected && (
              <>
                <AuditMetadata
                  createdAt={selected.createdAt}
                  updatedAt={selected.updatedAt}
                  createdBy={selected.createdBy}
                  updatedBy={selected.updatedBy}
                />
                <button
                  className="text-muted-foreground text-xs underline"
                  onClick={() => {
                    setSelected(null);
                    setSubmitError(null);
                  }}
                >
                  Cancel edit / create new
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {selected && (
        <SkuRelationsPanel key={selected.id} skuId={selected.id} uoms={uoms} canEdit={canEdit} />
      )}
    </div>
  );
}
