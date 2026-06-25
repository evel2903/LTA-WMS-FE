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
        <Field label="Xảy ra lúc" value={new Date(entry.occurredAt).toLocaleString()} />
        <Field label="Kết quả" value={entry.result} />
        <Field label="Người thực hiện" value={entry.actorUserId ?? entry.actorType} />
        <Field label="Vai trò người thực hiện" value={entry.actorRoleCodes.join(', ') || '—'} />
        <Field label="Hành động" value={entry.action} />
        <Field label="Đối tượng" value={`${entry.objectType}${entry.objectCode ? ` · ${entry.objectCode}` : ''}`} />
        <Field label="ID đối tượng" value={entry.objectId} />
        <Field label="ID mã lý do" value={entry.reasonCodeId} />
        <Field label="Ghi chú lý do" value={entry.reasonNote} />
        <Field label="Tham chiếu" value={entry.referenceType ? `${entry.referenceType} · ${entry.referenceId ?? ''}` : entry.referenceId} />
        <Field label="ID tương quan" value={entry.correlationId} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <JsonBlock label="Trước thay đổi" value={entry.beforeJson} />
        <JsonBlock label="Sau thay đổi" value={entry.afterJson} />
      </div>
    </div>
  );
}
