import { useState } from 'react';
import { PlusCircle } from 'lucide-react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { toMutationErrorMessage } from '@modules/MasterData/Application/Commands/MasterDataMutationError';
import { useLocationProfileMutations } from '@modules/MasterData/Application/Commands/UseLocationProfileMutations';
import {
  useLocationProfile,
  useLocationProfiles,
} from '@modules/MasterData/Application/Queries/UseLocationProfiles';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type {
  LocationProfile,
  MasterDataStatus,
} from '@modules/MasterData/Domain/Types/MasterDataEntities';
import { LocationProfileDetailPanel } from '@modules/MasterData/Presentation/Components/LocationProfileDetailPanel';
import {
  LocationProfileStateView,
  type LocationProfileViewState,
} from '@modules/MasterData/Presentation/Components/LocationProfileStateView';
import { LocationProfileTable } from '@modules/MasterData/Presentation/Components/LocationProfileTable';
import { LocationProfileForm } from '@modules/MasterData/Presentation/Forms/LocationProfileForm';
import type { LocationProfileFormValues } from '@modules/MasterData/Presentation/Forms/LocationProfileFormSchema';
import {
  toCreateLocationProfileInput,
  toUpdateLocationProfileInput,
} from '@modules/MasterData/Presentation/Forms/LocationProfileFormSchema';

interface Filters {
  status: MasterDataStatus | '';
  locationType: string;
  profileCode: string;
}

const EMPTY_FILTERS: Filters = { status: '', locationType: '', profileCode: '' };

function selectedProfile(
  selectedId: string | null,
  detail: LocationProfile | undefined,
  items: LocationProfile[],
) {
  return (
    (detail?.id === selectedId ? detail : null) ??
    items.find((item) => item.id === selectedId) ??
    null
  );
}

export function LocationProfileCatalogPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createNonce, setCreateNonce] = useState(0);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const debouncedCode = useDebouncedValue(filters.profileCode);
  const debouncedType = useDebouncedValue(filters.locationType);
  const query = useLocationProfiles({
    page,
    pageSize: MASTER_DATA_DEFAULT_PAGE_SIZE,
    status: filters.status || undefined,
    locationType: debouncedType || undefined,
    profileCode: debouncedCode || undefined,
  });
  const detailQuery = useLocationProfile(selectedId);
  const mutations = useLocationProfileMutations();

  const items = query.data?.items ?? [];
  const meta = query.data;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const detailForbidden = detailQuery.error instanceof ApiError && detailQuery.error.isForbidden;
  const submitForbidden = submitError instanceof ApiError && submitError.isForbidden;
  const canManage = !apiError?.isForbidden && !detailForbidden && !submitForbidden;
  const selected = selectedProfile(selectedId, detailQuery.data, items);
  const listState: LocationProfileViewState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : items.length === 0
          ? 'empty'
          : 'ready';

  const patch = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const select = (id: string | null) => {
    setSelectedId(id);
    setSubmitError(null);
  };

  const submitCreate = (values: LocationProfileFormValues) =>
    mutations.create.mutate(toCreateLocationProfileInput(values), {
      onError: setSubmitError,
      onSuccess: (profile) => {
        setSubmitError(null);
        setSelectedId(profile.id);
        setCreateNonce((value) => value + 1);
      },
    });

  const submitUpdate = (id: string, values: LocationProfileFormValues) =>
    mutations.update.mutate(
      { id, input: toUpdateLocationProfileInput(values) },
      { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
    );

  const submitInactivate = (id: string, values: LocationProfileFormValues) =>
    mutations.update.mutate(
      {
        id,
        input: { ...toUpdateLocationProfileInput(values), status: 'Inactive' },
      },
      { onError: setSubmitError, onSuccess: () => setSubmitError(null) },
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Location Profile Catalog</h1>
          <p className="text-muted-foreground">
            Quan ly policy profile dung cho Location assignment trong Foundation.
          </p>
        </div>
        <Button variant="outline" onClick={() => select(null)}>
          <PlusCircle className="size-4" />
          New profile
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Profile code filter
          <Input
            className="h-9"
            placeholder="e.g. BIN-STD"
            value={filters.profileCode}
            onChange={(event) => patch({ profileCode: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Location type filter
          <Input
            className="h-9"
            placeholder="e.g. Bin"
            value={filters.locationType}
            onChange={(event) => patch({ locationType: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            value={filters.status}
            onChange={(event) => patch({ status: event.target.value as MasterDataStatus | '' })}
          >
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_560px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location profiles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {listState === 'ready' ? (
              <>
                <LocationProfileTable
                  items={items}
                  selectedId={selectedId}
                  onSelect={(item) => select(item.id)}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Page {meta?.page ?? 1} / {meta?.totalPages ?? 1}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= (meta?.totalPages ?? 1)}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <LocationProfileStateView
                state={listState}
                errorMessage={apiError?.message ?? 'Unable to load location profiles.'}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `Edit ${selected.profileCode}` : 'Create location profile'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canManage && <p className="text-muted-foreground text-xs">Read only.</p>}
            {selected ? <LocationProfileDetailPanel profile={selected} /> : null}
            {selected ? (
              <LocationProfileForm
                key={`edit-${selected.id}-${selected.version}`}
                mode="edit"
                initialValue={selected}
                disabled={!canManage}
                pending={mutations.update.isPending}
                inlineError={submitError ? toMutationErrorMessage(submitError) : undefined}
                onSubmit={(values) => submitUpdate(selected.id, values)}
                onInactivate={(values) => submitInactivate(selected.id, values)}
              />
            ) : (
              <LocationProfileForm
                key={`create-${createNonce}`}
                mode="create"
                disabled={!canManage}
                pending={mutations.create.isPending}
                inlineError={submitError ? toMutationErrorMessage(submitError) : undefined}
                onSubmit={submitCreate}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
