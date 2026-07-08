import type { OverrideLog } from '@modules/OverrideLog/Domain/Entities/OverrideLog';
import { OverrideControlModeBadge } from '@modules/OverrideLog/Presentation/Components/OverrideControlModeBadge';
import { JsonBlock } from '@modules/OverrideLog/Presentation/Components/StateViews';
import {
  overrideActionLabel,
  overrideTargetLabelFromParts,
} from '@modules/OverrideLog/Presentation/Constants/OverrideLogDisplayText';

function Field({ label, value }: { label: string; value: string | null }) {
  const displayValue = value?.trim() || '—';

  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm break-words">{displayValue}</span>
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tạo lúc" value={new Date(log.createdAt).toLocaleString()} />
        <Field label="Người thực hiện" value={log.actorUserId} />
        <Field label="Hành động" value={overrideActionLabel(log.action)} />
        <Field
          label="Đối tượng đích"
          value={overrideTargetLabelFromParts(
            log.targetObjectType,
            log.targetObjectCode,
            log.targetObjectId,
          )}
        />
        <Field label="ID mã lý do" value={log.reasonCodeId} />
        <Field label="Ghi chú lý do" value={log.reasonNote} />
        <Field label="ID yêu cầu phê duyệt" value={log.approvalRequestId} />
        <Field
          label="Bằng chứng"
          value={evidenceCount > 0 ? `${evidenceCount} tham chiếu` : 'Chưa có'}
        />
        <Field label="Tham chiếu kiểm toán" value={log.auditRef} />
        <Field label="ID tương quan" value={log.correlationId} />
      </div>

      {log.scope && <JsonBlock label="Phạm vi" value={log.scope} />}
      {evidenceCount > 0 && <JsonBlock label="Tham chiếu bằng chứng" value={log.evidenceRefs} />}

      <div className="grid gap-3 lg:grid-cols-2">
        <JsonBlock label="Trước thay đổi" value={log.beforeJson} />
        <JsonBlock label="Sau thay đổi" value={log.afterJson} />
      </div>
    </div>
  );
}
