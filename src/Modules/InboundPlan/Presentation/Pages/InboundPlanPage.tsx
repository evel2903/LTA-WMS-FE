import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EllipsisVertical, Plus, RefreshCw } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@shared/Components/Page/CatalogListView';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import {
  useInboundPlanLockMutationIds,
  useInboundPlanMutations,
} from '@modules/InboundPlan/Application/Commands/UseInboundPlanMutations';
import { useInboundPlans } from '@modules/InboundPlan/Application/Queries/UseInboundPlans';
import type { InboundPlan } from '@modules/InboundPlan/Domain/Types/InboundPlan';

const DEFAULT_PAGE_SIZE = 50;

function statusLabel(plan: InboundPlan) {
  return `${vietnameseOperationalLabel(plan.status)} / ${vietnameseOperationalLabel(plan.gateInStatus)}`;
}

interface InboundPlanActionsProps {
  plan: InboundPlan;
  // Re-review fix (P1, round 4): renamed from `isCancelling` -- this now reflects ANY
  // lock-relevant plan mutation pending for this plan (Sửa/Xác nhận/Xóa/gate-in), not just
  // this row's OWN cancelInboundPlan.isPending. A plan whose gate-in/update/confirm was
  // started from the DETAIL page and is still in flight must ALSO disable this row's Xóa --
  // otherwise the list page's own local-only check let a second, genuinely concurrent
  // mutation fire for the same plan (adversarial-verify finding, round 4).
  isBusy: boolean;
  onCancel: (plan: InboundPlan) => void;
}

function InboundPlanActions({ plan, isBusy, onCancel }: InboundPlanActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm">
        <Link to={ROUTES.INBOUND_PLAN.DETAIL(plan.id)}>Mở chi tiết</Link>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link to={ROUTES.INBOUND_RECEIVING.DETAIL(plan.id)}>Thao tác tiếp nhận</Link>
      </Button>
      {plan.status === 'Draft' ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Thao tác khác cho ${plan.sourceDocumentNumber}`}
            >
              <EllipsisVertical className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="bg-popover text-popover-foreground z-50 min-w-36 rounded-md border p-1 shadow-md"
            >
              <DropdownMenu.Item
                asChild
                disabled={isBusy}
                className="focus:bg-accent focus:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <Link to={ROUTES.INBOUND_PLAN.EDIT(plan.id)}>Sửa</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={isBusy}
                onSelect={() => onCancel(plan)}
                className="focus:bg-destructive/10 focus:text-destructive text-destructive relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                Xóa
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : null}
    </div>
  );
}

export function InboundPlanPage() {
  const [sourceSystemFilter, setSourceSystemFilter] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const debouncedSourceSystem = useDebouncedValue(sourceSystemFilter, 250);
  const debouncedDocument = useDebouncedValue(documentFilter, 250);
  const query = useInboundPlans({
    page,
    pageSize,
    sourceSystem: debouncedSourceSystem || undefined,
    sourceDocumentNumber: debouncedDocument || undefined,
  });
  const mutations = useInboundPlanMutations();
  const plans = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  // Re-review fix (P1, round 4): previously only checked THIS page's own
  // `cancelInboundPlan.isPending`, blind to a lock-relevant mutation (Sửa/Xác nhận/gate-in)
  // still in flight from the Detail page for the same plan -- an operator could start one
  // there, navigate back to the list before it settled, and Xóa the same plan, firing a
  // second genuinely concurrent mutation (adversarial-verify finding). Reads the SAME shared
  // global lock the Detail page uses, so both pages agree on what "locked" means.
  const pendingLockMutationPlanIds = useInboundPlanLockMutationIds();
  const isBusy = (plan: InboundPlan) => pendingLockMutationPlanIds.includes(plan.id);
  const handleCancel = (plan: InboundPlan) => {
    if (!window.confirm(`Xóa kế hoạch nhập kho ${plan.sourceDocumentNumber}?`)) return;
    mutations.cancelInboundPlan.mutate({ id: plan.id });
  };
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state: CatalogListState = query.isLoading
    ? 'loading'
    : apiError?.isForbidden
      ? 'denied'
      : query.error
        ? 'error'
        : plans.length === 0
          ? 'empty'
          : 'ready';
  // During a page transition TanStack Query may still expose the previous page's
  // metadata (or no data at all). Keep the requested page reachable until the
  // response for that exact page arrives; CatalogPagination can then clamp only
  // against authoritative metadata from the current request.
  const totalPages =
    query.data?.page === page
      ? query.data.totalPages
      : Math.max(query.data?.totalPages ?? 1, page);
  const columns: CatalogColumn<InboundPlan>[] = [
    {
      header: 'Số chứng từ',
      render: (plan) => (
        <span className="font-medium text-foreground">{plan.sourceDocumentNumber}</span>
      ),
      mobileLabel: 'Kế hoạch nhập kho',
      mobileRender: (plan) => (
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{plan.sourceDocumentNumber}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.sourceSystem} - {plan.sourceDocumentType}
          </p>
          <span className="mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-medium text-foreground">
            {statusLabel(plan)}
          </span>
        </div>
      ),
    },
    {
      header: 'Hệ thống / Loại',
      render: (plan) => (
        <span className="text-muted-foreground">
          {plan.sourceSystem} - {plan.sourceDocumentType}
        </span>
      ),
      mobileHidden: true,
    },
    {
      header: 'Trạng thái',
      render: (plan) => (
        <span className="rounded-md border px-2 py-1 text-xs font-medium">{statusLabel(plan)}</span>
      ),
      mobileHidden: true,
    },
    {
      header: 'Kho',
      render: (plan) => plan.warehouseCode ?? plan.warehouseId,
    },
    {
      header: 'Chủ hàng',
      render: (plan) => plan.ownerCode ?? plan.ownerId,
    },
    {
      header: 'Số dòng',
      render: (plan) => plan.lines.length,
    },
    {
      header: 'CoreFlow',
      render: (plan) => plan.coreFlowInstanceId ?? 'chưa liên kết',
    },
    {
      header: 'Hành động',
      render: (plan) => (
        <InboundPlanActions plan={plan} isBusy={isBusy(plan)} onCancel={handleCancel} />
      ),
    },
  ];

  return (
    <CatalogListView
      title="Chứng từ nguồn nhập kho"
      description="Quét, lọc và chọn kế hoạch nhập kho. Tiếp nhận, QC, LPN và phát hành được xử lý ở trang chi tiết/thao tác."
      headerAction={
        <>
          <Button asChild>
            <Link to={ROUTES.INBOUND_PLAN.NEW}>
              <Plus className="size-4" aria-hidden="true" />
              Tạo kế hoạch nhập kho
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => void query.refetch()}
            aria-label="Làm mới danh sách nhập kho"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </>
      }
      toolbar={
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Lọc hệ thống nguồn
            <Input
              value={sourceSystemFilter}
              onChange={(event) => {
                setSourceSystemFilter(event.target.value);
                setPage(1);
              }}
              placeholder="ERP"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Lọc số chứng từ
            <Input
              value={documentFilter}
              onChange={(event) => {
                setDocumentFilter(event.target.value);
                setPage(1);
              }}
              placeholder="ASN-10001"
            />
          </label>
        </div>
      }
      state={state}
      columns={columns}
      rows={plans}
      rowKey={(plan) => plan.id}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={(nextPageSize) => {
        setPageSize(nextPageSize);
        setPage(1);
      }}
      errorMessage={
        apiError?.message ??
        (query.error instanceof Error
          ? query.error.message
          : query.error
            ? 'Không thể tải kế hoạch nhập kho.'
            : undefined)
      }
      emptyLabel="Không có chứng từ nguồn khớp bộ lọc hiện tại."
    />
  );
}
