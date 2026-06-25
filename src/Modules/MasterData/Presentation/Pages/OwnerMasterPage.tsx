import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { useOwners } from '@modules/MasterData/Application/Queries/CatalogQueries';
import { MASTER_DATA_EMPTY_LABELS } from '@modules/MasterData/Presentation/Constants/MasterDataDisplayText';
import type { Owner } from '@modules/MasterData/Domain/Types/CatalogEntities';
import type { MasterDataStatus } from '@modules/MasterData/Domain/Types/MasterDataEntities';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import { MasterDataStatusBadge } from '@modules/MasterData/Presentation/Components/MasterDataStatusBadge';

type StatusFilter = 'All' | MasterDataStatus;

export function OwnerMasterPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');
  const ownerCode = useDebouncedValue(search, 300);

  const query = useOwners({
    page,
    ownerCode: ownerCode || undefined,
    status: status === 'All' ? undefined : status,
  });

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
  const canCreate = !apiError?.isForbidden;

  const columns: CatalogColumn<Owner>[] = [
    {
      header: 'Mã',
      render: (owner) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.OWNER_DETAIL(owner.id))}
        >
          {owner.ownerCode}
        </button>
      ),
    },
    { header: 'Tên', render: (owner) => owner.ownerName },
    { header: 'Trạng thái', render: (owner) => <MasterDataStatusBadge status={owner.status} /> },
  ];

  return (
    <CatalogListView
      title="Chủ hàng"
      description="Quản lý chủ hàng (khách hàng 3PL / chủ thương hiệu)."
      state={state}
      columns={columns}
      rows={owners}
      rowKey={(owner) => owner.id}
      page={page}
      totalPages={query.data?.totalPages ?? 1}
      onPageChange={setPage}
      canCreate={canCreate}
      emptyLabel={MASTER_DATA_EMPTY_LABELS.owners}
      errorMessage={apiError?.message ?? (query.error ? 'Không thể tải chủ hàng.' : undefined)}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.OWNER_NEW}>Tạo chủ hàng</Link>
          </Button>
        ) : null
      }
      toolbar={
        <>
          <label className="grid gap-1 text-sm">Mã chủ hàng<Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã"
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
