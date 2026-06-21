import { useMemo, useState } from 'react';

import { ListRefetchWarning } from '@shared/Components/Feedback/QueryResilience';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { resolveListViewState, useResilientQueryData } from '@shared/Utils/QueryResilience';
import { FilterControlValidationCatalogUseCase } from '@modules/ControlValidationCatalog/Application/UseCases/FilterControlValidationCatalogUseCase';
import { useControlValidationCatalog } from '@modules/ControlValidationCatalog/Application/Queries/UseControlValidationCatalog';
import { ControlValidationCatalogTables } from '@modules/ControlValidationCatalog/Presentation/Components/ControlValidationCatalogTables';
import {
  ControlValidationCatalogStateView,
  type ControlValidationCatalogViewState,
} from '@modules/ControlValidationCatalog/Presentation/Components/StateViews';

export function ControlValidationCatalogPage() {
  const [search, setSearch] = useState('');
  const query = useControlValidationCatalog();
  const catalogData = useResilientQueryData(query.data);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const catalogItemCount =
    (catalogData?.validationRules.length ?? 0) + (catalogData?.controlExceptions.length ?? 0);

  const state: ControlValidationCatalogViewState = resolveListViewState({
    error: query.error,
    isLoading: query.isPending,
    itemCount: catalogItemCount,
  });

  const filteredCatalog = useMemo(() => {
    if (!catalogData) {
      return null;
    }
    return new FilterControlValidationCatalogUseCase().execute({
      catalog: catalogData,
      search,
    });
  }, [catalogData, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Control & Validation Catalog</h1>
        <p className="text-muted-foreground">
          Read-only view of the C8 RBAC-VAL and CTRL-EX catalogs for FR-22 / V0-AC-02.2.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid w-full max-w-lg gap-1 text-sm">
          Filter catalog
          <Input
            className="h-9"
            placeholder="Search code, category, trigger, owner, deferred..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {state !== 'ready' ? (
        <ControlValidationCatalogStateView
          state={state}
          errorMessage={apiError?.message ?? 'Unable to load control and validation catalog.'}
        />
      ) : catalogData && filteredCatalog ? (
        <div className="space-y-3">
          <ListRefetchWarning error={query.error} hasData={catalogItemCount > 0} />
          <ControlValidationCatalogTables catalog={catalogData} filteredCatalog={filteredCatalog} />
        </div>
      ) : (
        <ControlValidationCatalogStateView state="empty" />
      )}
    </div>
  );
}
