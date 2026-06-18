import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import { useOwners } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { CATALOG_EMPTY_LABELS } from '@modules/MasterData/Domain/Constants/CatalogConstants';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { Owner } from '@modules/MasterData/Domain/Types/CatalogEntities';
import { AuditMetadata } from '@modules/MasterData/Presentation/Components/AuditMetadata';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';
import { OwnerPolicyView } from '@modules/MasterData/Presentation/Components/OwnerPolicyView';
import { OwnerForm } from '@modules/MasterData/Presentation/Forms/OwnerForm';

type StatusFilter = 'All' | MasterDataStatus;

export function OwnerMasterPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const [selected, setSelected] = useState<Owner | null>(null);
  const [createNonce, setCreateNonce] = useState(0);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const ownerCode = useDebouncedValue(search, 300);

  const query = useOwners({
    page,
    ownerCode: ownerCode || undefined,
    status: status === 'All' ? undefined : status,
  });
  const mutations = useCatalogMutations();

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
  const canEdit = !apiError?.isForbidden;

  const columns: CatalogColumn<Owner>[] = [
    {
      header: 'Code',
      render: (owner) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => {
            setSelected(owner);
            setSubmitError(null);
          }}
        >
          {owner.ownerCode}
        </button>
      ),
    },
    { header: 'Name', render: (owner) => owner.ownerName },
    { header: 'Status', render: (owner) => <MasterDataStatusBadge status={owner.status} /> },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
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
        canCreate={canEdit}
        emptyLabel={CATALOG_EMPTY_LABELS.owners}
        errorMessage={apiError?.message ?? (query.error ? 'Unable to load owners.' : undefined)}
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{selected ? 'Edit owner' : 'Create owner'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected ? (
            <OwnerForm
              key={`owner-${selected.id}`}
              initialValue={selected}
              submitLabel="Update Owner"
              disabled={!canEdit}
              pending={mutations.updateOwner.isPending}
              conflict={conflictMessage(submitError) ?? undefined}
              onSubmit={(values) =>
                mutations.updateOwner.mutate(
                  { id: selected.id, input: values },
                  { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
                )
              }
            />
          ) : (
            <OwnerForm
              key={`create-owner-${createNonce}`}
              submitLabel="Create Owner"
              disabled={!canEdit}
              pending={mutations.createOwner.isPending}
              conflict={conflictMessage(submitError) ?? undefined}
              onSubmit={(values) =>
                mutations.createOwner.mutate(values, {
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
              <OwnerPolicyView
                billingPolicy={selected.billingPolicy}
                visibilityScope={selected.visibilityScope}
              />
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
