import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import type { PageBoundaryState } from '@shared/Components/Page/PageStateBoundary';
import { useWarehouseProfiles } from '@modules/WarehouseProfile/Application/Queries/UseWarehouseProfiles';
import {
  useWarehouseProfileStore,
  type ProfileStatusFilter,
} from '@modules/WarehouseProfile/Application/Stores/WarehouseProfileStore';
import { WarehouseProfileTable } from '@modules/WarehouseProfile/Presentation/Components/WarehouseProfileTable';

function listState(params: {
  error: unknown;
  isLoading: boolean;
  itemCount: number;
}): PageBoundaryState | null {
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'forbidden';
  if (params.isLoading) return 'loading';
  if (params.error) return 'error';
  if (params.itemCount === 0) return 'empty';
  return null;
}

export function WarehouseProfilesPage() {
  const store = useWarehouseProfileStore();
  const navigate = useNavigate();

  const query = useWarehouseProfiles({
    page: store.page,
    status: store.statusFilter === 'ALL' ? undefined : store.statusFilter,
    warehouseTypeCode: store.warehouseTypeCodeFilter || undefined,
  });

  const profiles = query.data?.items ?? [];
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = listState({ error: query.error, isLoading: query.isLoading, itemCount: profiles.length });

  return (
    <ListPageShell
      title="Hồ sơ kho"
      description="Quét và lọc hồ sơ chiến lược kho trước khi mở trang chi tiết/action riêng."
      toolbar={
        <>
          <Button asChild variant="outline">
            <Link to={ROUTES.FOUNDATION.RULE_MATRIX_PREVIEW}>Preview quy tắc</Link>
          </Button>
          <Button asChild>
            <Link to={ROUTES.FOUNDATION.WAREHOUSE_PROFILE_NEW}>Tạo hồ sơ</Link>
          </Button>
        </>
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">Trạng thái<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={store.statusFilter}
              onChange={(event) => store.setStatusFilter(event.target.value as ProfileStatusFilter)}
            >
              <option value="ALL">Tất cả</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="EXPIRED">Hết hiệu lực</option>
              <option value="RETIRED">Ngưng sử dụng</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Mã loại kho<Input
              value={store.warehouseTypeCodeFilter}
              onChange={(event) => store.setWarehouseTypeCodeFilter(event.target.value)}
              placeholder="VD: DC"
            />
          </label>
        </div>
      }
      state={state}
      stateTitle={state === 'forbidden' ? 'Không có quyền' : undefined}
      stateMessage={state === 'empty' ? 'Chưa có hồ sơ.' : (apiError?.message ?? 'Không thể tải hồ sơ.')}
    >
      <WarehouseProfileTable
        profiles={profiles}
        selectedId={null}
        onSelect={(profile) => {
          void navigate(ROUTES.FOUNDATION.WAREHOUSE_PROFILE_DETAIL(profile.id));
        }}
      />
    </ListPageShell>
  );
}
