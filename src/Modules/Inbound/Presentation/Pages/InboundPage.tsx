import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { ApiError } from '@shared/Services/Http/ApiError';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { vietnameseOperationalLabel } from '@shared/Presentation/VietnameseOperationalLabels';
import { useInboundPlans } from '@modules/Inbound/Application/Queries/UseInboundPlans';
import type { InboundPlan } from '@modules/Inbound/Domain/Types/InboundPlan';

function statusLabel(plan: InboundPlan) {
  return `${vietnameseOperationalLabel(plan.status)} / ${vietnameseOperationalLabel(plan.gateInStatus)}`;
}

function InboundPlanCard({ plan }: { plan: InboundPlan }) {
  return (
    <article className="border-border bg-card text-card-foreground space-y-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{plan.sourceDocumentNumber}</h2>
          <p className="text-muted-foreground text-sm">
            {plan.sourceSystem} - {plan.sourceDocumentType}
          </p>
        </div>
        <span className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium">
          {statusLabel(plan)}
        </span>
      </div>

      <dl className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground">Kho</dt>
          <dd>{plan.warehouseCode ?? plan.warehouseId}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Chủ hàng</dt>
          <dd>{plan.ownerCode ?? plan.ownerId}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Số dòng</dt>
          <dd>{plan.lines.length}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">CoreFlow</dt>
          <dd>{plan.coreFlowInstanceId ?? 'chưa liên kết'}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to={ROUTES.INBOUND.DETAIL(plan.id)}>Mở chi tiết</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to={ROUTES.INBOUND.ACTION(plan.id, 'receiving')}>Thao tác tiếp nhận</Link>
        </Button>
      </div>
    </article>
  );
}

export function InboundPage() {
  const [sourceSystemFilter, setSourceSystemFilter] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');
  const debouncedSourceSystem = useDebouncedValue(sourceSystemFilter, 250);
  const debouncedDocument = useDebouncedValue(documentFilter, 250);
  const query = useInboundPlans({
    page: 1,
    sourceSystem: debouncedSourceSystem || undefined,
    sourceDocumentNumber: debouncedDocument || undefined,
  });
  const plans = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state = query.isLoading
    ? 'loading'
    : apiError?.isForbidden
      ? 'forbidden'
      : query.error
        ? 'error'
        : plans.length === 0
          ? 'empty'
          : null;

  return (
    <ListPageShell
      title="Chứng từ nguồn nhập kho"
      description="Quét, lọc và chọn kế hoạch nhập kho. Tiếp nhận, QC, LPN và phát hành được xử lý ở trang chi tiết/thao tác."
      toolbar={
        <>
          <Button asChild>
            <Link to={ROUTES.INBOUND.NEW}>
              <Plus className="size-4" aria-hidden="true" />
              Tạo kế hoạch nhập kho
            </Link>
          </Button>
          <Button variant="secondary" size="icon" onClick={() => void query.refetch()} aria-label="Làm mới danh sách nhập kho">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </>
      }
      filters={
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Lọc hệ thống nguồn
            <Input
              value={sourceSystemFilter}
              onChange={(event) => setSourceSystemFilter(event.target.value)}
              placeholder="ERP"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Lọc số chứng từ
            <Input
              value={documentFilter}
              onChange={(event) => setDocumentFilter(event.target.value)}
              placeholder="ASN-10001"
            />
          </label>
        </div>
      }
      state={state}
      stateTitle={
        state === 'forbidden'
          ? 'Từ chối quyền truy cập'
          : state === 'error'
            ? 'Không thể tải kế hoạch nhập kho'
            : state === 'empty'
              ? 'Chưa có kế hoạch nhập kho'
              : undefined
      }
      stateMessage={
        state === 'forbidden'
          ? apiError?.message
          : state === 'error'
            ? query.error instanceof Error
              ? query.error.message
              : 'Không thể tải kế hoạch nhập kho.'
            : state === 'empty'
              ? 'Không có chứng từ nguồn khớp bộ lọc hiện tại.'
              : undefined
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <InboundPlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </ListPageShell>
  );
}
