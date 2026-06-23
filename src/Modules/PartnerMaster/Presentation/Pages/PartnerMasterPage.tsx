import { useState } from 'react';

import { ApiError } from '@shared/Services/Http/ApiError';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import { Input } from '@shared/Components/Ui/Input';
import { useDebouncedValue } from '@shared/Hooks/UseDebouncedValue';
import { conflictMessage } from '@modules/MasterData/Application/Commands/CatalogConflictError';
import {
  CatalogListView,
  type CatalogColumn,
  type CatalogListState,
} from '@modules/MasterData/Presentation/Components/CatalogListView';
import {
  PARTNER_EMPTY_LABEL,
  PARTNER_STATUSES,
  PARTNER_TYPES,
} from '@modules/PartnerMaster/Domain/Constants/PartnerConstants';
import type {
  Partner,
  PartnerStatus,
  PartnerType,
} from '@modules/PartnerMaster/Domain/Types/Partner';
import { usePartnerMutations } from '@modules/PartnerMaster/Application/Commands/UsePartnerMutations';
import { usePartners } from '@modules/PartnerMaster/Application/Queries/UsePartners';
import { PartnerForm } from '@modules/PartnerMaster/Presentation/Forms/PartnerForm';

type PartnerTypeFilter = 'All' | PartnerType;
type PartnerStatusFilter = 'All' | PartnerStatus;

function StatusBadge({ status }: { status: PartnerStatus }) {
  return (
    <span className="rounded-md border px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

export function PartnerMasterPage() {
  const [page, setPage] = useState(1);
  const [codeFilter, setCodeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [externalReferenceFilter, setExternalReferenceFilter] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerTypeFilter>('All');
  const [status, setStatus] = useState<PartnerStatusFilter>('All');
  const [selected, setSelected] = useState<Partner | null>(null);
  const [createNonce, setCreateNonce] = useState(0);
  const [submitError, setSubmitError] = useState<unknown>(null);

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
  const mutations = usePartnerMutations();

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
  const canEdit = !apiError?.isForbidden;

  const columns: CatalogColumn<Partner>[] = [
    {
      header: 'Code',
      render: (partner) => (
        <button
          className="underline-offset-2 hover:underline"
          onClick={() => {
            setSelected(partner);
            setSubmitError(null);
          }}
        >
          {partner.partnerCode}
        </button>
      ),
    },
    { header: 'Name', render: (partner) => partner.partnerName },
    { header: 'Type', render: (partner) => partner.partnerType },
    { header: 'Status', render: (partner) => <StatusBadge status={partner.status} /> },
    { header: 'External Reference', render: (partner) => partner.externalReference },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <CatalogListView
        title="Partners"
        description="Manage minimal Supplier, Customer and Carrier records for V1 flows."
        state={state}
        columns={columns}
        rows={partners}
        rowKey={(partner) => partner.id}
        page={page}
        totalPages={query.data?.totalPages ?? 1}
        onPageChange={setPage}
        canCreate={canEdit}
        emptyLabel={PARTNER_EMPTY_LABEL}
        errorMessage={apiError?.message ?? (query.error ? 'Unable to load partners.' : undefined)}
        toolbar={
          <>
            <label className="grid gap-1 text-sm">
              Partner code filter
              <Input
                value={codeFilter}
                onChange={(event) => {
                  setCodeFilter(event.target.value);
                  setPage(1);
                }}
                placeholder="Search code"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Partner name filter
              <Input
                value={nameFilter}
                onChange={(event) => {
                  setNameFilter(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name"
              />
            </label>
            <label className="grid gap-1 text-sm">
              External reference filter
              <Input
                value={externalReferenceFilter}
                onChange={(event) => {
                  setExternalReferenceFilter(event.target.value);
                  setPage(1);
                }}
                placeholder="Search reference"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Partner type filter
              <select
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                value={partnerType}
                onChange={(event) => {
                  setPartnerType(event.target.value as PartnerTypeFilter);
                  setPage(1);
                }}
              >
                <option value="All">All</option>
                {PARTNER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Status filter
              <select
                className="h-9 rounded-md border bg-transparent px-3 text-sm"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as PartnerStatusFilter);
                  setPage(1);
                }}
              >
                <option value="All">All</option>
                {PARTNER_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selected ? 'Edit partner' : 'Create partner'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!canEdit ? (
            <p className="text-muted-foreground text-sm">Read only</p>
          ) : selected ? (
            <PartnerForm
              key={`partner-${selected.id}`}
              initialValue={selected}
              submitLabel="Update partner"
              disabled={!canEdit}
              pending={mutations.updatePartner.isPending}
              deactivatePending={mutations.deactivatePartner.isPending}
              conflict={conflictMessage(submitError) ?? undefined}
              onSubmit={(values) => {
                mutations.updatePartner.mutate(
                  {
                    id: selected.id,
                    input: {
                      partnerCode: values.partnerCode,
                      partnerName: values.partnerName,
                      status: values.status,
                      sourceSystem: values.sourceSystem,
                      externalReference: values.externalReference,
                      referenceText: values.referenceText,
                    },
                  },
                  {
                    onError: setSubmitError,
                    onSuccess: (partner) => {
                      setSubmitError(null);
                      setSelected(partner);
                    },
                  },
                );
              }}
              onDeactivate={(values) =>
                mutations.deactivatePartner.mutate(
                  { id: selected.id, input: values },
                  {
                    onError: setSubmitError,
                    onSuccess: (partner) => {
                      setSubmitError(null);
                      setSelected(partner);
                    },
                  },
                )
              }
            />
          ) : (
            <PartnerForm
              key={`create-partner-${createNonce}`}
              submitLabel="Create partner"
              disabled={!canEdit}
              pending={mutations.createPartner.isPending}
              conflict={conflictMessage(submitError) ?? undefined}
              onSubmit={(values) =>
                mutations.createPartner.mutate(values, {
                  onError: setSubmitError,
                  onSuccess: (partner) => {
                    setSubmitError(null);
                    setSelected(partner);
                    setCreateNonce((value) => value + 1);
                  },
                })
              }
            />
          )}
          {selected && (
            <button
              className="text-muted-foreground text-xs underline"
              onClick={() => {
                setSelected(null);
                setSubmitError(null);
              }}
            >
              Cancel edit / create new
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
