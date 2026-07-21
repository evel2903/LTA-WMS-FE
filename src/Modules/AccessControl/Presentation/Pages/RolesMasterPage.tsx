import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
  type CatalogSortState,
} from '@shared/Components/Page/CatalogListView';
import { Button } from '@shared/Components/Ui/Button';
import { ComboboxSelect } from '@shared/Components/Ui/ComboboxSelect';
import { FormModal } from '@shared/Components/Ui/FormModal';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import {
  isBadRequestError,
  isConflictError,
  isForbiddenError,
  toMutationErrorMessage,
} from '@modules/AccessControl/Application/Commands/AccessControlMutationError';
import { useAccessControlMutations } from '@modules/AccessControl/Application/Commands/UseAccessControlMutations';
import { accessControlQueryKeys } from '@modules/AccessControl/Application/Queries/AccessControlQueryKeys';
import { useAllRoles, useRoleDetails } from '@modules/AccessControl/Application/Queries/UseAccessControlQueries';
import type { Role, RoleDetail } from '@modules/AccessControl/Domain/Entities/AccessControl';
import { ROLE_STATUS_LABELS } from '@modules/AccessControl/Domain/Enums/AccessControlEnums';
import { RoleStatusBadge } from '@modules/AccessControl/Presentation/Components/RoleStatusBadge';
import { RoleForm } from '@modules/AccessControl/Presentation/Forms/RoleForm';

const DEFAULT_PAGE_SIZE = 20;
const EMPTY_ROLES: Role[] = [];
const ROLE_COLLATOR = new Intl.Collator('vi-VN', { numeric: true, sensitivity: 'base' });

function normalizeSearch(value: string) {
  return value.normalize('NFC').trim().toLocaleLowerCase('vi-VN');
}

function roleTypeLabel(role: Role) {
  return role.isSystem ? 'Hệ thống' : 'Tùy chỉnh';
}

function filterRoles(roles: Role[], searchTerm: string, statusFilter: string) {
  const normalizedSearch = normalizeSearch(searchTerm);
  return roles.filter((role) => {
    if (statusFilter && role.status !== statusFilter) return false;
    if (!normalizedSearch) return true;
    return [role.roleCode, role.roleName].some((value) => normalizeSearch(value).includes(normalizedSearch));
  });
}

function roleSortValue(role: Role, column: string) {
  switch (column) {
    case 'role-code':
      return role.roleCode;
    case 'role-name':
      return role.roleName;
    case 'role-type':
      return roleTypeLabel(role);
    case 'status':
      return ROLE_STATUS_LABELS[role.status] ?? role.status;
    default:
      return '';
  }
}

function sortRoles(roles: Role[], sort: CatalogSortState | null) {
  if (!sort) return roles;
  return [...roles].sort((left, right) => {
    const primary = ROLE_COLLATOR.compare(roleSortValue(left, sort.column), roleSortValue(right, sort.column));
    if (primary !== 0) return sort.direction === 'desc' ? -primary : primary;
    return ROLE_COLLATOR.compare(left.roleCode, right.roleCode);
  });
}

function catalogState(params: { error: unknown; hasData: boolean; itemCount: number }): CatalogListState {
  const apiError = params.error instanceof ApiError ? params.error : null;
  if (apiError?.isForbidden) return 'denied';
  if (!params.hasData) return params.error ? 'error' : 'loading';
  if (params.itemCount === 0) return 'empty';
  return 'ready';
}

/** RA-06: Site-aligned role catalog. Role detail/editor remains owned by RA-04. */
export function RolesMasterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rolesQuery = useAllRoles();
  const roles = rolesQuery.data ?? EMPTY_ROLES;
  const mutations = useAccessControlMutations();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<CatalogSortState | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filteredRoles = useMemo(
    () => filterRoles(roles, searchTerm, statusFilter),
    [roles, searchTerm, statusFilter],
  );
  const sortedRoles = useMemo(() => sortRoles(filteredRoles, sort), [filteredRoles, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedRoles.length / pageSize));
  const effectivePage = Math.min(Math.max(page, 1), totalPages);
  const visibleRoles = useMemo(
    () => sortedRoles.slice((effectivePage - 1) * pageSize, effectivePage * pageSize),
    [effectivePage, pageSize, sortedRoles],
  );
  const detailQueries = useRoleDetails(visibleRoles.map((role) => role.roleCode));
  const detailQueryByRoleCode = useMemo(
    () => new Map(visibleRoles.map((role, index) => [role.roleCode, detailQueries[index]])),
    [detailQueries, visibleRoles],
  );

  const createError = mutations.createRole.error;
  const forbiddenToCreate = isForbiddenError(createError);
  const inlineCreateError =
    isConflictError(createError) || isBadRequestError(createError) ? toMutationErrorMessage(createError) : null;

  useEffect(() => {
    if (forbiddenToCreate) setCreateOpen(false);
  }, [forbiddenToCreate]);

  const openCreateModal = () => {
    mutations.createRole.reset();
    setCreateOpen(true);
  };

  const handleSortChange = (column: string) => {
    setSort((current) => {
      if (current?.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
    setPage(1);
  };

  const apiError = rolesQuery.error instanceof ApiError ? rolesQuery.error : null;
  const state = catalogState({
    error: rolesQuery.error,
    hasData: rolesQuery.data !== undefined,
    itemCount: filteredRoles.length,
  });
  const canCreate = !apiError?.isForbidden && !forbiddenToCreate;

  const columns = useMemo<CatalogColumn<Role>[]>(
    () => [
      {
        id: 'role-code',
        header: 'Mã vai trò',
        render: (role) => <span className="font-medium">{role.roleCode}</span>,
        sortable: true,
      },
      {
        id: 'role-name',
        header: 'Tên vai trò',
        render: (role) => role.roleName,
        sortable: true,
      },
      {
        id: 'role-type',
        header: 'Loại',
        render: roleTypeLabel,
        sortable: true,
      },
      {
        id: 'status',
        header: 'Trạng thái',
        render: (role) => <RoleStatusBadge status={role.status} />,
        sortable: true,
      },
      {
        header: 'Số quyền',
        render: (role) => {
          const detail = detailQueryByRoleCode.get(role.roleCode);
          return detail?.data?.permissions.length ?? (detail?.isLoading ? '…' : '—');
        },
        className: 'text-right',
      },
      {
        header: 'Hành động',
        render: (role) => (
          <Button asChild size="sm" variant="outline">
            <Link to={ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(role.roleCode)} state={{ role }}>
              Chi tiết
            </Link>
          </Button>
        ),
        className: 'text-right',
      },
    ],
    [detailQueryByRoleCode],
  );

  return (
    <>
      <CatalogListView
        title="Vai trò"
        description="Danh sách vai trò RBAC — tạo vai trò tùy chỉnh hoặc mở chi tiết để xem quyền."
        state={state}
        columns={columns}
        rows={visibleRoles}
        rowKey={(role) => role.roleCode}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
        sort={sort}
        onSortChange={handleSortChange}
        canCreate={canCreate}
        readOnlyMessage="Bạn không có quyền tạo vai trò trong phạm vi này."
        emptyLabel={
          roles.length === 0 ? 'Chưa có vai trò.' : 'Không tìm thấy vai trò phù hợp với bộ lọc hiện tại.'
        }
        errorMessage={apiError?.message ?? (rolesQuery.error ? 'Không thể tải danh sách vai trò.' : undefined)}
        headerAction={
          canCreate ? (
            <Button type="button" size="sm" onClick={openCreateModal}>
              Tạo vai trò
            </Button>
          ) : null
        }
        toolbar={
          <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
            <label className="grid min-w-0 gap-1 text-sm">
              Tìm
              <Input
                className="min-w-0"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Mã hoặc tên vai trò"
              />
            </label>
            <ComboboxSelect
              id="role-status-filter"
              name="statusFilter"
              label="Trạng thái"
              value={statusFilter}
              placeholder="Tất cả"
              optional
              options={[
                { value: '', label: 'Tất cả' },
                { value: 'ACTIVE', label: 'Đang hoạt động' },
                { value: 'INACTIVE', label: 'Ngừng hoạt động' },
              ]}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
          </div>
        }
      />

      <FormModal title="Tạo vai trò" open={createOpen} onClose={() => setCreateOpen(false)}>
        <RoleForm
          pending={mutations.createRole.isPending}
          error={inlineCreateError}
          onSubmit={(values) =>
            mutations.createRole.mutate(values, {
              onSuccess: (role) => {
                setCreateOpen(false);
                // Navigate straight to the new role's detail page instead of relying on it
                // appearing in this catalog's own list refetch, which can be stale/paused/
                // failed — seed the detail cache first so RoleDetailPage renders immediately
                // (0 permissions is truthful: no grant call has happened yet). This is the
                // AC3/AC6 create-to-detail bridge; do not simplify back to just closing the
                // modal (Review Finding, RA-05 round 13).
                queryClient.setQueryData<RoleDetail>(accessControlQueryKeys.roleDetail(role.roleCode), {
                  ...role,
                  permissions: [],
                });
                void navigate(ROUTES.FOUNDATION.ACCESS.ROLE_DETAIL(role.roleCode));
              },
            })
          }
        />
      </FormModal>
    </>
  );
}
