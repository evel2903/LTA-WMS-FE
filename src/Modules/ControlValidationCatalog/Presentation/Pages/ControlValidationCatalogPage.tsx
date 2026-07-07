import { useMemo, useState } from 'react';

import { ListRefetchWarning } from '@shared/Components/Feedback/QueryResilience';
import { GovernanceStateBanner } from '@shared/Components/Page/GovernanceStateBanner';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { resolveListViewState, useResilientQueryData } from '@shared/Utils/QueryResilience';
import { FilterControlValidationCatalogUseCase } from '@modules/ControlValidationCatalog/Application/UseCases/FilterControlValidationCatalogUseCase';
import { useControlValidationCatalog } from '@modules/ControlValidationCatalog/Application/Queries/UseControlValidationCatalog';
import { ControlValidationCatalogTables } from '@modules/ControlValidationCatalog/Presentation/Components/ControlValidationCatalogTables';

export function ControlValidationCatalogPage() {
  const [search, setSearch] = useState('');
  const query = useControlValidationCatalog();
  const catalogData = useResilientQueryData(query.data);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const catalogItemCount =
    (catalogData?.validationRules.length ?? 0) + (catalogData?.controlExceptions.length ?? 0);

  const state = resolveListViewState({
    error: query.error,
    isLoading: query.isPending,
    itemCount: catalogItemCount,
  });
  const shellState: PageBoundaryState | null =
    state === 'ready' ? null : state === 'denied' ? 'forbidden' : state;

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
    <ListPageShell
      title="Danh mục kiểm soát và xác thực"
      description="Màn hình chỉ đọc của danh mục C8 RBAC-VAL và CTRL-EX cho FR-22 / V0-AC-02.2."
      filters={
        <label className="grid w-full max-w-lg gap-1 text-sm">
          Lọc danh mục
          <Input
            id="control-catalog-search"
            name="controlCatalogSearch"
            placeholder="Tìm theo mã, nhóm, điều kiện kích hoạt, chủ sở hữu, trạng thái hoãn..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      }
      filtersAriaLabel="Bộ lọc danh mục kiểm soát và xác thực"
      contentAriaLabel="Danh sách kiểm soát và xác thực"
      state={shellState}
      stateTitle={shellState === 'forbidden' ? 'Không có quyền xem catalog' : undefined}
      stateMessage={
        shellState === 'loading'
          ? undefined
          : shellState === 'empty'
            ? 'Chưa có bản ghi danh mục kiểm soát hoặc xác thực.'
            : (apiError?.message ?? 'Không thể tải danh mục kiểm soát và xác thực.')
      }
    >
      <GovernanceStateBanner
        state="readOnly"
        title="Catalog seed chỉ đọc"
        message="Danh mục này dùng để rà soát quy tắc xác thực và ngoại lệ kiểm soát đã cấu hình. Story này không thêm thao tác tạo, cập nhật hoặc xóa cho catalog."
      />
      <ListRefetchWarning error={query.error} hasData={catalogItemCount > 0} />
      {catalogData && filteredCatalog ? (
        <ControlValidationCatalogTables catalog={catalogData} filteredCatalog={filteredCatalog} />
      ) : null}
    </ListPageShell>
  );
}
