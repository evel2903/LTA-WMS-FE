import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

import { ROUTES } from '@app/Config/Routes';
import { Input } from '@shared/Components/Ui/Input';
import { ListPageShell } from '@shared/Components/Page/ListPageShell';
import { DEAD_LETTER_READABLE_STATUSES } from '@modules/Integration/Domain/Constants/IntegrationConstants';
import { useIntegrationDeadLetters } from '@modules/Integration/Application/Queries/UseIntegrationDeadLetters';
import type { OutboxMessage, OutboxMessageStatus } from '@modules/Integration/Domain/Types/Integration';

type StatusFilter = OutboxMessageStatus;

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Unable to load integration dead-letters.';
}

function StatusBadge({ status }: { status: OutboxMessageStatus }) {
  return <span className="rounded-md border px-2 py-1 text-xs font-medium">{status}</span>;
}

function DeadLetterRow({ message }: { message: OutboxMessage }) {
  return (
    <Link
      to={ROUTES.INTEGRATION.DEAD_LETTER_DETAIL(message.id)}
      className="grid w-full gap-2 rounded-md border p-3 text-left text-sm hover:bg-muted"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{message.businessReference}</div>
          <div className="text-muted-foreground truncate text-xs">{message.messageId}</div>
        </div>
        <StatusBadge status={message.status} />
      </div>
      <div className="text-muted-foreground grid gap-1 text-xs">
        <div>{message.eventType}</div>
        <div>
          {message.warehouseContext}
          {message.ownerContext ? ` / ${message.ownerContext}` : ''}
        </div>
        <div>
          Attempt {message.attemptCount}/{message.maxAttempts}
          {message.nextRetryAt ? ` - next ${message.nextRetryAt}` : ''}
        </div>
        <div className="truncate">{message.lastError ?? message.deadLetterReason ?? 'No error captured'}</div>
      </div>
    </Link>
  );
}

export function IntegrationPage() {
  const [businessReference, setBusinessReference] = useState('');
  const [warehouseContext, setWarehouseContext] = useState('');
  const [ownerContext, setOwnerContext] = useState('');
  const [eventType, setEventType] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [updatedFrom, setUpdatedFrom] = useState('');
  const [updatedTo, setUpdatedTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('DeadLetter');

  const query = useIntegrationDeadLetters({
    businessReference: businessReference.trim() || undefined,
    warehouseContext: warehouseContext.trim() || undefined,
    ownerContext: ownerContext.trim() || undefined,
    eventType: eventType.trim() || undefined,
    createdFrom: createdFrom.trim() || undefined,
    createdTo: createdTo.trim() || undefined,
    updatedFrom: updatedFrom.trim() || undefined,
    updatedTo: updatedTo.trim() || undefined,
    status: statusFilter,
  });
  const messages = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const state = query.isLoading ? 'loading' : query.error ? 'error' : messages.length === 0 ? 'empty' : null;

  return (
    <ListPageShell
      title="Integration dead-letters"
      description="Scan failed integration messages and open a focused detail/action page for retry, manual fix, acknowledge or ignore."
      state={state}
      stateTitle={query.error ? 'Unable to load integration dead-letters' : undefined}
      stateMessage={query.error ? errorMessage(query.error) ?? undefined : 'No integration dead-letters match the filters.'}
      filters={
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="grid gap-1 text-sm">
            Business reference
            <Input value={businessReference} onChange={(event) => setBusinessReference(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Warehouse
            <Input value={warehouseContext} onChange={(event) => setWarehouseContext(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Owner
            <Input value={ownerContext} onChange={(event) => setOwnerContext(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Event type
            <Input value={eventType} onChange={(event) => setEventType(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              {DEAD_LETTER_READABLE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Created from
            <Input
              value={createdFrom}
              placeholder="2026-06-25T00:00:00.000Z"
              onChange={(event) => setCreatedFrom(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Created to
            <Input
              value={createdTo}
              placeholder="2026-06-25T23:59:59.999Z"
              onChange={(event) => setCreatedTo(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Updated from
            <Input
              value={updatedFrom}
              placeholder="2026-06-25T00:00:00.000Z"
              onChange={(event) => setUpdatedFrom(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Updated to
            <Input
              value={updatedTo}
              placeholder="2026-06-25T23:59:59.999Z"
              onChange={(event) => setUpdatedTo(event.target.value)}
            />
          </label>
        </div>
      }
    >
      {query.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <RefreshCw className="size-4 animate-spin" />
          Loading integration dead-letters
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {messages.map((message) => (
            <DeadLetterRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </ListPageShell>
  );
}
