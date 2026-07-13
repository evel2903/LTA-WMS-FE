import { useMemo, useState } from 'react';

import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { FormModal } from '@shared/Components/Ui/FormModal';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useCatalogMutations } from '@modules/MasterData/Application/Commands/UseCatalogMutations';
import { useUoms } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { MASTER_DATA_DEFAULT_PAGE_SIZE } from '@modules/MasterData/Domain/Constants/MasterDataConstants';
import {
  MASTER_DATA_EMPTY_LABELS,
  MASTER_DATA_STATUS_LABELS,
  displayUomType,
  toUomTypeRawValue,
} from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import type { Uom } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { StatusBadge } from '@modules/MasterData/Presentation/Components/StatusBadge';
import { UomForm } from '@modules/MasterData/Presentation/Forms/UomForm';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'Active', label: MASTER_DATA_STATUS_LABELS.Active },
  { value: 'Inactive', label: MASTER_DATA_STATUS_LABELS.Inactive },
];

function compareUoms(a: Uom, b: Uom, column: string): number {
  switch (column) {
    case 'code':
      return a.uomCode.localeCompare(b.uomCode, 'vi', { numeric: true });
    case 'name':
      return a.uomName.localeCompare(b.uomName, 'vi');
    case 'type':
      return displayUomType(a.uomType).localeCompare(displayUomType(b.uomType), 'vi');
    case 'precision':
      return a.decimalPrecision - b.decimalPrecision;
    case 'status':
      return a.status.localeCompare(b.status, 'vi');
    default:
      return 0;
  }
}

// Sort is client-side and scoped to the current server page only (server
// pagination is kept as-is; the BE has no sort param), matching DSR-05/Loại kho.
function sortUoms(items: Uom[], sort: CatalogSortState | null): Uom[] {
  if (!sort) return items;
  const sorted = [...items].sort((a, b) => compareUoms(a, b, sort.column));
  return sort.direction === 'desc' ? sorted.reverse() : sorted;
}

export function UomMasterPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MasterDataStatus | ''>('');
  const [uomTypeFilter, setUomTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(MASTER_DATA_DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Uom | null>(null);

  const debouncedCode = useDebouncedValue(searchTerm);
  const debouncedType = toUomTypeRawValue(useDebouncedValue(uomTypeFilter));
  const query = useUoms({
    page,
    pageSize,
    status: statusFilter || undefined,
    uomCode: debouncedCode || undefined,
    uomType: debouncedType || undefined,
  });
  const mutations = useCatalogMutations();

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const totalPages = query.data?.totalPages ?? 1;
  const apiError = query.error instanceof ApiError ? query.error : null;
  const sortedItems = useMemo(() => sortUoms(items, sort), [items, sort]);

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

  const columns: CatalogColumn<Uom>[] = [
    { id: 'code', header: 'Mã', render: (row) => <span className="font-medium">{row.uomCode}</span>, sortable: true },
    { id: 'name', header: 'Tên', render: (row) => row.uomName, sortable: true },
    { id: 'type', header: 'Loại', render: (row) => displayUomType(row.uomType), sortable: true },
    { id: 'precision', header: 'Số lẻ', render: (row) => row.decimalPrecision, sortable: true },
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
        title="Đơn vị tính"
        description="Quản lý đơn vị tính."
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
        emptyLabel={MASTER_DATA_EMPTY_LABELS.uoms}
        errorMessage={apiError?.message ?? (query.error ? 'Không thể tải đơn vị tính.' : undefined)}
        headerAction={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              Tạo đơn vị tính
            </Button>
          ) : null
        }
        toolbar={
          <div className="grid min-w-0 gap-3">
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
              <label className="grid min-w-0 gap-1 text-sm">
                Tìm
                <Input
                  className="min-w-0"
                  placeholder="Mã đơn vị tính"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <ComboboxSelect
                id="uom-status-filter"
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
            <label className="grid min-w-0 gap-1 text-sm md:max-w-xs">
              Loại đơn vị tính
              <Input
                className="min-w-0"
                placeholder="Lọc loại"
                value={uomTypeFilter}
                onChange={(event) => {
                  setUomTypeFilter(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
        }
      />

      <FormModal title="Tạo đơn vị tính" open={createOpen} onClose={closeCreate}>
        <UomForm
          submitLabel="Tạo đơn vị tính"
          pending={mutations.createUom.isPending}
          onSubmit={(values) => mutations.createUom.mutate(values, { onSuccess: closeCreate })}
        />
      </FormModal>
      <FormModal title="Cập nhật đơn vị tính" open={editing != null} onClose={closeEdit}>
        {editing ? (
          <UomForm
            key={editing.id}
            initialValue={editing}
            submitLabel="Cập nhật đơn vị tính"
            pending={mutations.updateUom.isPending}
            onSubmit={(values) =>
              mutations.updateUom.mutate({ id: editing.id, input: values }, { onSuccess: closeEdit })
            }
          />
        ) : null}
      </FormModal>
    </>
  );
}
