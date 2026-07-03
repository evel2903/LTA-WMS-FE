import type { WarehouseProfileReadinessRow } from '@modules/FoundationOverview/Domain/Entities/FoundationReadiness';
import { FoundationStatusBadge } from '@modules/FoundationOverview/Presentation/Components/FoundationStatusBadge';
import type { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileChecklist';

const CHECKLIST_STATUS_LABELS: Record<ProfileChecklistItemStatus, string> = {
  PASS: 'Đạt',
  FAIL: 'Chưa đạt',
  WARNING: 'Cần kiểm tra',
  DEFERRED: 'Dời sau',
};

const CHECKLIST_TITLE_LABELS: Record<string, string> = {
  'Active profile': 'Hồ sơ đang hoạt động',
  'Related rule groups': 'Nhóm quy tắc liên quan',
  'Control modes': 'Chế độ kiểm soát',
  'Precedence conflict': 'Xung đột thứ tự ưu tiên',
  'Default profile (type fallback)': 'Hồ sơ mặc định theo loại kho',
  'System default profile seed': 'Seed hồ sơ mặc định hệ thống',
  'Override readiness': 'Mức sẵn sàng ghi đè',
  'Override execution': 'Thực thi ghi đè',
  'Audit readiness': 'Mức sẵn sàng audit',
  'Immutable audit trail': 'Audit trail bất biến',
  'Reason code catalog': 'Catalog mã lý do',
  'Effective date / version': 'Hiệu lực ngày và phiên bản',
  'Owner segregation': 'Tách biệt chủ hàng',
  'RBAC / data-scope enforcement': 'RBAC và phạm vi dữ liệu',
  'Compliance rule': 'Quy tắc tuân thủ',
  'Default system seed': 'Seed mặc định hệ thống',
};

const CHECKLIST_MESSAGE_LABELS: Record<string, string> = {
  'Exactly one active profile exists for this scope.':
    'Có đúng một hồ sơ ACTIVE cho phạm vi này.',
  'Bound rules belong to ACTIVE catalog groups.':
    'Các rule đã bind thuộc nhóm catalog ACTIVE.',
  'No rule resolved, so there is no control mode to confirm for this profile.':
    'Chưa resolve được rule, nên chưa thể xác nhận chế độ kiểm soát cho hồ sơ này.',
  'No same-tier same-scope rule conflict was detected.':
    'Không phát hiện xung đột rule cùng cấp và cùng phạm vi.',
  'An active fallback profile exists for warehouse type WT-01.':
    'Có hồ sơ fallback ACTIVE cho loại kho WT-01.',
  'A global system-default fallback profile (architecture 5.5) is not seeded in V0.':
    'Hồ sơ fallback mặc định toàn hệ thống (architecture 5.5) chưa được seed trong V0.',
  'No rule resolved at the self-context, so override-readiness flags could not be confirmed.':
    'Chưa resolve được quy tắc tại ngữ cảnh tự kiểm, nên chưa thể xác nhận cờ sẵn sàng ghi đè.',
  'Applying/executing an override is out of V0 scope.':
    'Áp dụng hoặc thực thi ghi đè nằm ngoài phạm vi V0.',
  'Active profile has no LastActivation audit metadata recorded.':
    'Hồ sơ ACTIVE chưa có metadata audit LastActivation.',
  'Immutable before/after audit-trail enforcement is out of V0 scope.':
    'Cơ chế bắt buộc audit trail trước/sau bất biến nằm ngoài phạm vi V0.',
  'reason_code catalog validation is out of V0 scope.':
    'Validation catalog reason_code nằm ngoài phạm vi V0.',
  'Effective window contains EvaluatedAt and Version is valid.':
    'Khoảng hiệu lực bao gồm thời điểm đánh giá và phiên bản hợp lệ.',
  'Profile and owner-scoped rules share a consistent owner scope.':
    'Hồ sơ và rule theo chủ hàng có phạm vi chủ hàng nhất quán.',
  'Granular RBAC and multi-owner data-scope enforcement are out of V0 scope.':
    'RBAC chi tiết và kiểm soát phạm vi dữ liệu nhiều chủ hàng nằm ngoài phạm vi V0.',
  'No winning rule; no compliance misconfiguration present.':
    'Chưa có rule thắng; không phát hiện cấu hình tuân thủ sai.',
  'Default seed is ready.': 'Seed mặc định đã sẵn sàng.',
  'Active profile resolved.': 'Đã resolve hồ sơ ACTIVE.',
};

function matchMessage(message: string, pattern: RegExp): string | null {
  return message.match(pattern)?.[1] ?? null;
}

function localizeChecklistTitle(title: string): string {
  return CHECKLIST_TITLE_LABELS[title] ?? 'Mục kiểm tra chưa định danh';
}

function localizeChecklistMessage(message: string): string {
  const knownMessage = CHECKLIST_MESSAGE_LABELS[message];
  if (knownMessage) return knownMessage;

  const activeFallbackWarehouseType = matchMessage(
    message,
    /^An active fallback profile exists for warehouse type (.+)\.$/,
  );
  if (activeFallbackWarehouseType) {
    return `Có hồ sơ fallback ACTIVE cho loại kho ${activeFallbackWarehouseType}.`;
  }

  const missingFallbackWarehouseType = matchMessage(
    message,
    /^No active fallback profile exists for warehouse type (.+)\.$/,
  );
  if (missingFallbackWarehouseType) {
    return `Chưa có hồ sơ fallback ACTIVE cho loại kho ${missingFallbackWarehouseType}.`;
  }

  const inactiveProfileStatus = matchMessage(
    message,
    /^Profile is (.+); it must be ACTIVE for the scope to operate\.$/,
  );
  if (inactiveProfileStatus) {
    return `Hồ sơ đang ở trạng thái ${inactiveProfileStatus}; cần ACTIVE để vận hành trong phạm vi này.`;
  }

  const invalidControlMode = matchMessage(
    message,
    /^Resolved control mode "(.+)" is not one of the four valid V0 control modes\.$/,
  );
  if (invalidControlMode) {
    return `Chế độ kiểm soát đã resolve "${invalidControlMode}" không thuộc bốn chế độ hợp lệ của V0.`;
  }

  const validControlMode = matchMessage(
    message,
    /^Resolved control mode "(.+)" is a valid V0 control mode\.$/,
  );
  if (validControlMode) {
    return `Chế độ kiểm soát đã resolve "${validControlMode}" hợp lệ trong V0.`;
  }

  const nonComplianceHardBlock = message.match(
    /^A non-Compliance hard block \((.+), tier (.+)\) wins at the self-context; this is a misconfiguration\.$/,
  );
  if (nonComplianceHardBlock) {
    return `Rule hard block không thuộc nhóm tuân thủ (${nonComplianceHardBlock[1]}, tầng ${nonComplianceHardBlock[2]}) đang thắng tại ngữ cảnh tự kiểm; đây là cấu hình sai.`;
  }

  const complianceHardBlock = matchMessage(
    message,
    /^Compliance hard block \((.+)\) is a legitimate winner \(handoff rule 11\)\.$/,
  );
  if (complianceHardBlock) {
    return `Rule hard block tuân thủ (${complianceHardBlock}) là rule thắng hợp lệ theo handoff rule 11.`;
  }

  if (message === 'More than one active profile shares this scope (B5 one-active-per-scope invariant violated).') {
    return 'Có nhiều hồ sơ ACTIVE dùng cùng phạm vi; vi phạm ràng buộc B5 mỗi phạm vi chỉ có một hồ sơ ACTIVE.';
  }
  if (message === 'The active profile has no rule bound; nothing to verify for rule groups.') {
    return 'Hồ sơ ACTIVE chưa bind rule; chưa có nhóm rule để kiểm tra.';
  }
  if (message === 'All bound rules belong to PLACEHOLDER catalog groups (V1+ business groups, not evaluated in V0).') {
    return 'Tất cả rule đã bind thuộc nhóm catalog PLACEHOLDER của V1+ và chưa được đánh giá trong V0.';
  }
  if (message === 'Unresolved same-tier same-scope rule conflict(s) detected; an admin must resolve them.') {
    return 'Phát hiện xung đột rule cùng tầng và cùng phạm vi chưa được xử lý; admin cần xử lý trước khi vận hành.';
  }
  if (message === 'No winning rule, so override-readiness flags are not yet determinable.') {
    return 'Chưa có rule thắng, nên chưa xác định được cờ sẵn sàng ghi đè.';
  }
  if (message === 'Override-readiness flags (AllowOverride/RequiresReason/RequiresEvidence) are readable from the winner.') {
    return 'Có thể đọc cờ sẵn sàng ghi đè từ rule thắng.';
  }
  if (message === 'Audit-readiness flags and activation metadata are readable.') {
    return 'Có thể đọc cờ sẵn sàng audit và metadata kích hoạt.';
  }
  if (message === 'Effective window does not contain EvaluatedAt or Version is below 1.') {
    return 'Khoảng hiệu lực không bao gồm thời điểm đánh giá hoặc phiên bản nhỏ hơn 1.';
  }
  if (message === 'Profile is owner-agnostic (wildcard owner scope); no segregation to verify in V0.') {
    return 'Hồ sơ không cố định chủ hàng; V0 chưa có tách biệt chủ hàng cần kiểm tra.';
  }
  if (message === 'A bound rule is scoped to a different owner than the profile; verify owner segregation.') {
    return 'Một rule đã bind thuộc chủ hàng khác với hồ sơ; cần kiểm tra tách biệt chủ hàng.';
  }
  if (message === 'Winner is not a hard block; no compliance misconfiguration.') {
    return 'Rule thắng không phải hard block; không phát hiện cấu hình tuân thủ sai.';
  }

  return 'Thông báo kiểm tra chưa được chuẩn hóa tiếng Việt; cần kiểm tra chi tiết kỹ thuật của mục này.';
}

function localizeChecklistStatus(status: string): string {
  return CHECKLIST_STATUS_LABELS[status as ProfileChecklistItemStatus] ?? 'Không rõ';
}

export function FoundationChecklistPanel({ rows }: { rows: WarehouseProfileReadinessRow[] }) {
  const rowsWithChecklist = rows.filter((row) => row.checklist);

  if (rowsWithChecklist.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Chưa có hồ sơ ACTIVE đủ điều kiện để gọi checklist B7 trong phạm vi hiện tại.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rowsWithChecklist.map((row) => (
        <section key={row.activeProfileId} className="rounded-md border p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">
                {row.warehouseCode} · {row.activeProfileCode}
              </h3>
              <p className="text-muted-foreground text-xs">
                Đánh giá lúc {row.checklist?.evaluatedAt ?? '—'}
              </p>
            </div>
            <FoundationStatusBadge status={row.status} />
          </div>
          <div className="space-y-2">
            {row.checklist?.items.map((item) => (
              <div key={item.code} className="grid gap-1 rounded-md bg-muted/40 p-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{localizeChecklistTitle(item.title)}</span>
                  <span className="text-muted-foreground text-xs">
                    {localizeChecklistStatus(item.status)}
                  </span>
                </div>
                <p className="text-muted-foreground">{localizeChecklistMessage(item.message)}</p>
                {item.deferredToStory ? (
                  <p className="text-muted-foreground text-xs">
                    Dời sang {item.deferredToStory}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
