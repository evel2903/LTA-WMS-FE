import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import { useUoms } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { CATALOG_EMPTY_LABELS } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';
import { UomForm } from '@modules/MasterData/Presentation/Forms/UomForm';

type StatusFilter = 'All' | MasterDataStatus;

export function UomMasterPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [uomTypeFilter, setUomTypeFilter] = useState('');
  const [selected, setSelected] = useState<Uom | null>(null);
  const [createNonce, setCreateNonce] = useState(0);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const uomCode = useDebouncedValue(search, 300);
  const uomType = useDebouncedValue(uomTypeFilter, 300);

  const query = useUoms({
    page,
    uomCode: uomCode || undefined,
    status: status === 'All' ? undefined : status,
    uomType: uomType || undefined,
  });
  const mutations = useCatalogMutations();

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
  const canEdit = !apiError?.isForbidden;

  const columns: CatalogColumn<Uom>[] = [
    {
      header: 'Code',
      render: (uom) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => {
            setSelected(uom);
            setSubmitError(null);
          }}
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
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
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
        canCreate={canEdit}
        emptyLabel={CATALOG_EMPTY_LABELS.uoms}
        errorMessage={apiError?.message ?? (query.error ? 'Unable to load units of measure.' : undefined)}
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{selected ? 'Edit UOM' : 'Create UOM'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected ? (
            <UomForm
              key={`uom-${selected.id}`}
              initialValue={selected}
              submitLabel="Update UOM"
              disabled={!canEdit}
              pending={mutations.updateUom.isPending}
              conflict={conflictMessage(submitError) ?? undefined}
              onSubmit={(values) =>
                mutations.updateUom.mutate(
                  { id: selected.id, input: values },
                  { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
                )
              }
            />
          ) : (
            <UomForm
              key={`create-uom-${createNonce}`}
              submitLabel="Create UOM"
              disabled={!canEdit}
              pending={mutations.createUom.isPending}
              conflict={conflictMessage(submitError) ?? undefined}
              onSubmit={(values) =>
                mutations.createUom.mutate(values, {
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
  );
}
