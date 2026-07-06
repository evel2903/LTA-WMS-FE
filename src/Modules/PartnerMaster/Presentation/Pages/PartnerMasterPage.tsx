import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@app/Config/Routes';
import { Button } from '@shared/Components/Ui/Button';
import { Input } from '@shared/Components/Ui/Input';
import { ApiError } from '@shared/Services/Http/ApiError';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import {
  PARTNER_STATUSES,
  PARTNER_TYPES,
} from '@modules/PartnerMaster/Domain/Constants/PartnerConstants';
import {
  PARTNER_EMPTY_LABEL_VI,
  displayPartnerStatus,
  displayPartnerType,
} from '@modules/PartnerMaster/Presentation/Constants/PartnerDisplayText';
import type { Partner, PartnerStatus, PartnerType } from '@modules/PartnerMaster/Domain/Types/Partner';
import { usePartners } from '@modules/PartnerMaster/Application/Queries/UsePartners';
import { PartnerStatusBadge } from '@modules/PartnerMaster/Presentation/Components/PartnerStatusBadge';

type PartnerTypeFilter = 'All' | PartnerType;
type PartnerStatusFilter = 'All' | PartnerStatus;

export function PartnerMasterPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [codeFilter, setCodeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [externalReferenceFilter, setExternalReferenceFilter] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerTypeFilter>('All');
  const [status, setStatus] = useState<PartnerStatusFilter>('All');

  const partnerCode = useDebouncedValue(codeFilter, 300);
  const partnerName = useDebouncedValue(nameFilter, 300);
  const externalReference = useDebouncedValue(externalReferenceFilter, 300);
  const query = usePartners({
    page,
    partnerCode: partnerCode || undefined,
    partnerName: partnerName || undefined,
    externalReference: externalReference || undefined,
    partnerType: partnerType === 'All' ? undefined : partnerType,
    status: status === 'All' ? undefined : status,
  });

  const partners = query.data?.items ?? [];
  const apiError = query.error instanceof ApiError ? query.error : null;
  const state: CatalogListState = apiError?.isForbidden
    ? 'denied'
    : query.isLoading
      ? 'loading'
      : query.error
        ? 'error'
        : partners.length === 0
          ? 'empty'
          : 'ready';
  const canCreate = !apiError?.isForbidden;

  const columns: CatalogColumn<Partner>[] = [
    {
      header: 'Mã',
      render: (partner) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => navigate(ROUTES.FOUNDATION.MASTER_DATA.PARTNER_DETAIL(partner.id))}
        >
          {partner.partnerCode}
        </button>
      ),
    },
    { header: 'Tên', render: (partner) => partner.partnerName },
    { header: 'Loại', render: (partner) => displayPartnerType(partner.partnerType) },
    { header: 'Trạng thái', render: (partner) => <PartnerStatusBadge status={partner.status} /> },
    { header: 'Tham chiếu ngoài', render: (partner) => partner.externalReference },
  ];

  return (
    <CatalogListView
      title="Đối tác"
      description="Quản lý nhà cung cấp, khách hàng và đơn vị vận chuyển tối thiểu cho luồng V1."
      state={state}
      columns={columns}
      rows={partners}
      rowKey={(partner) => partner.id}
      page={page}
      totalPages={query.data?.totalPages ?? 1}
      onPageChange={setPage}
      canCreate={canCreate}
      emptyLabel={PARTNER_EMPTY_LABEL_VI}
      errorMessage={apiError?.message ?? (query.error ? 'Không thể tải đối tác.' : undefined)}
      headerAction={
        canCreate ? (
          <Button asChild size="sm">
            <Link to={ROUTES.FOUNDATION.MASTER_DATA.PARTNER_NEW}>Tạo đối tác</Link>
          </Button>
        ) : null
      }
      toolbar={
        <>
          <label className="grid gap-1 text-sm">Lọc mã đối tác<Input
              value={codeFilter}
              onChange={(event) => {
                setCodeFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã"
            />
          </label>
          <label className="grid gap-1 text-sm">Lọc tên đối tác<Input
              value={nameFilter}
              onChange={(event) => {
                setNameFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên"
            />
          </label>
          <label className="grid gap-1 text-sm">Lọc tham chiếu ngoài<Input
              value={externalReferenceFilter}
              onChange={(event) => {
                setExternalReferenceFilter(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tham chiếu"
            />
          </label>
          <label className="grid gap-1 text-sm">Lọc loại đối tác<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={partnerType}
              onChange={(event) => {
                setPartnerType(event.target.value as PartnerTypeFilter);
                setPage(1);
              }}
            >
              <option value="All">Tất cả</option>
              {PARTNER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {displayPartnerType(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Lọc trạng thái<select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as PartnerStatusFilter);
                setPage(1);
              }}
            >
              <option value="All">Tất cả</option>
              {PARTNER_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {displayPartnerStatus(item)}
                </option>
              ))}
            </select>
          </label>
        </>
      }
    />
  );
}
