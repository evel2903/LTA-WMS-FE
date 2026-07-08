import type { AuditLogEntry } from '@modules/Compliance/Domain/Entities/Compliance';
import { JsonBlock } from '@modules/Compliance/Presentation/Components/StateViews';
import {
  actorDisplayName,
  auditResultLabel,
  businessReferenceLabel,
  complianceActionLabel,
  objectReferenceLabelFromParts,
} from '@modules/Compliance/Presentation/Constants/ComplianceDisplayText';

function Field({ label, value }: { label: string; value: string | null }) {
  const displayValue = value?.trim() || '—';

  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm break-words">{displayValue}</span>
    </div>
  );
}

/** Read-only audit detail with before/after snapshots. No edit/delete (immutable — AC2). */
export function AuditLogDetailPanel({ entry }: { entry: AuditLogEntry }) {
  const evidenceCount = entry.evidenceRefs?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Xảy ra lúc" value={new Date(entry.occurredAt).toLocaleString()} />
        <Field label="Kết quả" value={auditResultLabel(entry.result)} />
        <Field
          label="Người thực hiện"
          value={actorDisplayName(entry.actorUserId, entry.actorType)}
        />
        <Field label="Vai trò người thực hiện" value={entry.actorRoleCodes.join(', ') || '—'} />
        <Field label="Hành động" value={complianceActionLabel(entry.action)} />
        <Field
          label="Đối tượng"
          value={objectReferenceLabelFromParts(entry.objectType, entry.objectCode, entry.objectId)}
        />
        <Field label="ID đối tượng" value={entry.objectId} />
        <Field label="ID mã lý do" value={entry.reasonCodeId} />
        <Field label="Ghi chú lý do" value={entry.reasonNote} />
        <Field
          label="Bằng chứng"
          value={evidenceCount > 0 ? `${evidenceCount} tham chiếu` : 'Chưa có'}
        />
        <Field
          label="Tham chiếu"
          value={businessReferenceLabel(entry.referenceType, entry.referenceId)}
        />
        <Field label="ID tương quan" value={entry.correlationId} />
      </div>
      {evidenceCount > 0 && <JsonBlock label="Tham chiếu bằng chứng" value={entry.evidenceRefs} />}
      <div className="grid gap-3 lg:grid-cols-2">
        <JsonBlock label="Trước thay đổi" value={entry.beforeJson} />
        <JsonBlock label="Sau thay đổi" value={entry.afterJson} />
      </div>
    </div>
  );
}
