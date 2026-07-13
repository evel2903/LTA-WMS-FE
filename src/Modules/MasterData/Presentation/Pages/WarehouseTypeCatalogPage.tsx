import { useMemo, useState } from 'react';

import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { FormModal } from '@shared/Components/Ui/FormModal';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useMasterDataMutations } from '@modules/MasterData/Application/Commands/UseMasterDataMutations';
import { useWarehouseTypes } from '@modules/MasterData/Application/Queries/UseWarehouseTypes';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import type { MasterDataStatus, WarehouseType } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import type { UpdateWarehouseTypeInput } from '@modules/MasterData/Domain/Types/MasterDataTree';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import { MASTER_DATA_STATUS_LABELS } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import { WarehouseTypeForm } from '@modules/MasterData/Presentation/Forms/WarehouseTypeForm';
import type { WarehouseTypeFormValues } from '@modules/MasterData/Presentation/Forms/MasterDataFormSchemas';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'Active', label: MASTER_DATA_STATUS_LABELS.Active },
  { value: 'Inactive', label: MASTER_DATA_STATUS_LABELS.Inactive },
];

function toUpdateWarehouseTypeInput(values: WarehouseTypeFormValues): UpdateWarehouseTypeInput {
  return {
    warehouseTypeName: values.warehouseTypeName,
    description: values.description,
    status: values.status,
    sourceSystem: values.sourceSystem,
    referenceId: values.referenceId,
    reasonCode: values.reasonCode,
  };
}

function compareWarehouseTypes(a: WarehouseType, b: WarehouseType, column: string): number {
  switch (column) {
    case 'code':
      return a.warehouseTypeCode.localeCompare(b.warehouseTypeCode, 'vi', { numeric: true });
    case 'name':
      return a.warehouseTypeName.localeCompare(b.warehouseTypeName, 'vi');
    case 'description':
      return (a.description ?? '').localeCompare(b.description ?? '', 'vi');
    case 'status':
      return a.status.localeCompare(b.status, 'vi');
    default:
      return 0;
  }
}

// Sort is client-side and scoped to the current server page only (server pagination is
// kept as-is; the BE has no sort param). Re-orders the visible page, not the whole dataset.
function sortWarehouseTypes(items: WarehouseType[], sort: CatalogSortState | null): WarehouseType[] {
  if (!sort) return items;
  const sorted = [...items].sort((a, b) => compareWarehouseTypes(a, b, sort.column));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

export function WarehouseTypeCatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MasterDataStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(MASTER_DATA_DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseType | null>(null);

  const debouncedCode = useDebouncedValue(searchTerm);
  const query = useWarehouseTypes({
    page,
    pageSize,
    status: statusFilter || undefined,
    warehouseTypeCode: debouncedCode || undefined,
  });
  const mutations = useMasterDataMutations();

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const totalPages = query.data?.totalPages ?? 1;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const sortedItems = useMemo(() => sortWarehouseTypes(items, sort), [items, sort]);

  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : items.length === 0
          ? 'empty'
          : 'ready';
  const canCreate = !apiError?.isForbidden;

  function handleSortChange(column: string) {
    setSort((current) => {
      if (current?.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
  }

  const columns: CatalogColumn<WarehouseType>[] = [
    { id: 'code', header: 'Mã loại kho', render: (row) => <span className="font-medium">{row.warehouseTypeCode}</span>, sortable: true },
    { id: 'name', header: 'Tên loại kho', render: (row) => row.warehouseTypeName, sortable: true },
    {
      id: 'description',
      header: 'Mô tả',
      render: (row) => row.description ?? '-',
      sortable: true,
      className: 'max-w-md truncate text-muted-foreground',
    },
    { id: 'status', header: 'Trạng thái', render: (row) => <StatusBadge status={row.status} />, sortable: true },
    {
      header: 'Hành động',
      render: (row) => (
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(row)}>
          Sửa
        </Button>
      ),
      className: 'text-right',
    },
  ];

  const closeCreate = () => setCreateOpen(false);
  const closeEdit = () => setEditing(null);

  return (
    <>
      <CatalogListView
        title="Danh mục loại kho"
        description="Quản lý taxonomy loại kho dùng cho form kho và cấu hình profile."
        state={state}
        columns={columns}
        rows={sortedItems}
        rowKey={(row) => row.id}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        sort={sort}
        onSortChange={handleSortChange}
        canCreate={canCreate}
        emptyLabel="Chưa có loại kho phù hợp với bộ lọc hiện tại."
        errorMessage={apiError?.message ?? (query.error ? 'Không thể tải danh mục loại kho.' : undefined)}
        headerAction={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Tạo loại kho
            </Button>
          ) : null
        }
        toolbar={
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
            <label className="grid min-w-0 gap-1 text-sm">
              Tìm
              <Input
                className="min-w-0"
                placeholder="Mã loại kho"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <ComboboxSelect
              id="warehouse-type-status-filter"
              name="statusFilter"
              label="Trạng thái"
              value={statusFilter}
              placeholder="Tất cả"
              optional
              options={STATUS_FILTER_OPTIONS}
              onChange={(value) => {
                setStatusFilter(value as MasterDataStatus | '');
                setPage(1);
              }}
            />
          </div>
        }
      />

      <FormModal title="Tạo loại kho" open={createOpen} onClose={closeCreate}>
        <WarehouseTypeForm
          submitLabel="Tạo loại kho"
          pending={mutations.createWarehouseType.isPending}
          onSubmit={(values) => mutations.createWarehouseType.mutate(values, { onSuccess: closeCreate })}
        />
      </FormModal>
      <FormModal title="Cập nhật loại kho" open={editing != null} onClose={closeEdit}>
        {editing ? (
          <WarehouseTypeForm
            key={editing.id}
            initialValue={editing}
            submitLabel="Cập nhật loại kho"
            pending={mutations.updateWarehouseType.isPending}
            onSubmit={(values) =>
              mutations.updateWarehouseType.mutate(
                { id: editing.id, input: toUpdateWarehouseTypeInput(values) },
                { onSuccess: closeEdit },
              )
            }
          />
        ) : null}
      </FormModal>
    </>
  );
}
