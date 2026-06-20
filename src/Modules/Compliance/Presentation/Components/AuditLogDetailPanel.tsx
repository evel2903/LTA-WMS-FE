import type { AuditLogEntry } from '@modules/Compliance/Domain/Entities/Compliance';
import { JsonBlock } from '@modules/Compliance/Presentation/Components/StateViews';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm break-words">{value ?? '—'}</span>
    </div>
  );
}

/** Read-only audit detail with before/after snapshots. No edit/delete (immutable — AC2). */
export function AuditLogDetailPanel({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Occurred at" value={new Date(entry.occurredAt).toLocaleString()} />
        <Field label="Result" value={entry.result} />
        <Field label="Actor" value={entry.actorUserId ?? entry.actorType} />
        <Field label="Actor roles" value={entry.actorRoleCodes.join(', ') || '—'} />
        <Field label="Action" value={entry.action} />
        <Field label="Object" value={`${entry.objectType}${entry.objectCode ? ` · ${entry.objectCode}` : ''}`} />
        <Field label="Object id" value={entry.objectId} />
        <Field label="Reason code id" value={entry.reasonCodeId} />
        <Field label="Reason note" value={entry.reasonNote} />
        <Field label="Reference" value={entry.referenceType ? `${entry.referenceType} · ${entry.referenceId ?? ''}` : entry.referenceId} />
        <Field label="Correlation id" value={entry.correlationId} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <JsonBlock label="Before" value={entry.beforeJson} />
        <JsonBlock label="After" value={entry.afterJson} />
      </div>
    </div>
  );
}
