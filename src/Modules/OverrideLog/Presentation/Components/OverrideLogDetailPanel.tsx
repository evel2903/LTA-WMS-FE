import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';
import { OverrideControlModeBadge } from '@modules/OverrideLog/Presentation/Components/OverrideControlModeBadge';
import { JsonBlock } from '@modules/OverrideLog/Presentation/Components/StateViews';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm break-words">{value ?? '—'}</span>
    </div>
  );
}

/** Read-only override detail with before/after snapshots. No edit/delete (immutable — AC2). */
export function OverrideLogDetailPanel({ log }: { log: OverrideLog }) {
  const evidenceCount = log.evidenceRefs?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <OverrideControlModeBadge mode={log.controlMode} />
        <span className="text-sm font-medium">{log.ruleCode}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Created at" value={new Date(log.createdAt).toLocaleString()} />
        <Field label="Actor" value={log.actorUserId} />
        <Field label="Action" value={log.action} />
        <Field
          label="Target object"
          value={`${log.targetObjectType} · ${log.targetObjectCode ?? log.targetObjectId}`}
        />
        <Field label="Reason code id" value={log.reasonCodeId} />
        <Field label="Reason note" value={log.reasonNote} />
        <Field label="Approval request id" value={log.approvalRequestId} />
        <Field label="Evidence" value={evidenceCount > 0 ? `${evidenceCount} ref(s)` : 'none'} />
        <Field label="Audit ref" value={log.auditRef} />
        <Field label="Correlation id" value={log.correlationId} />
      </div>

      {log.scope && <JsonBlock label="Scope" value={log.scope} />}
      {evidenceCount > 0 && <JsonBlock label="Evidence refs" value={log.evidenceRefs} />}

      <div className="grid gap-3 lg:grid-cols-2">
        <JsonBlock label="Before" value={log.beforeJson} />
        <JsonBlock label="After" value={log.afterJson} />
      </div>
    </div>
  );
}
