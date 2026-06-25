import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useUoms } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { MASTER_DATA_EMPTY_LABELS } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
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
      header: 'Mã',
      render: (uom) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.UOM_DETAIL(uom.id))}
        >
          {uom.uomCode}
        </button>
      ),
    },
    { header: 'Tên', render: (uom) => uom.uomName },
    { header: 'Type', render: (uom) => uom.uomType ?? '-' },
    { header: 'Precision', render: (uom) => uom.decimalPrecision },
    { header: 'Trạng thái', render: (uom) => <MasterDataStatusBadge status={uom.status} /> },
  ];

  return (
    <CatalogListView
      title="Đơn vị tính"
      description="Quản lý đơn vị tính."
      state={state}
      columns={columns}
      rows={uoms}
      rowKey={(uom) => uom.id}
      page={page}
      totalPages={query.data?.totalPages ?? 1}
      onPageChange={setPage}
      canCreate={canCreate}
      emptyLabel={MASTER_DATA_EMPTY_LABELS.uoms}
      errorMessage={apiError?.message ?? (query.error ? 'Không thể tải đơn vị tính.' : undefined)}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.UOM_NEW}>Tạo đơn vị tính</Link>
          </Button>
        ) : null
      }
      toolbar={
        <>
          <label className="grid gap-1 text-sm">Mã đơn vị tính<Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã"
            />
          </label>
          <label className="grid gap-1 text-sm">Loại đơn vị tính<Input
              value={uomTypeFilter}
              onChange={(event) => {
                setUomTypeFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Lọc loại"
            />
          </label>
          <label className="grid gap-1 text-sm">Trạng thái<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="All">Tất cả</option>
              <option value="Active">Đang hoạt động</option>
              <option value="Inactive">Không hoạt động</option>
            </select>
          </label>
        </>
      }
    />
  );
}
