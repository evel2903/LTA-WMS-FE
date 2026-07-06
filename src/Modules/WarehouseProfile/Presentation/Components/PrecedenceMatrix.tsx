import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import type { PrecedenceTierDescriptor } from '@modules/WarehouseProfile/Domain/Constants/PrecedenceOrder';
import type { RuleDefinition } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinition';
import type { RuleGroup } from '@modules/WarehouseProfile/Domain/Entities/RuleGroup';
import { ControlModeBadge } from '@modules/WarehouseProfile/Presentation/Components/ControlModeBadge';
import {
  viPrecedenceTierDescription,
  viPrecedenceTierLabel,
} from '@modules/WarehouseProfile/Presentation/Constants/WarehouseProfileDisplayText';

interface PrecedenceMatrixProps {
  /** The fixed tier order (Domain `PRECEDENCE_ORDER`). Rendered top-to-bottom as given. */
  tiers: readonly PrecedenceTierDescriptor[];
  rules: RuleDefinition[];
  groups: RuleGroup[];
}

/**
 * Renders the six precedence tiers in the IMMUTABLE order supplied by
 * `PRECEDENCE_ORDER` (architecture 5.5). It maps over `tiers` in array order and
 * never sorts by data; there is deliberately NO drag handle / reorder / sort
 * control (AC3). Resolution (who wins) is owned by the backend and only shown in
 * the Preview panel — this matrix is a static display of order + the rules /
 * control modes that live in each tier.
 */
export function PrecedenceMatrix({ tiers, rules, groups }: PrecedenceMatrixProps) {
  const groupName = (id: string) => groups.find((group) => group.id === id)?.groupName ?? null;
  const knownTiers = new Set(tiers.map((tier) => tier.tier));
  const unknownTierRules = rules.filter((rule) => !knownTiers.has(rule.precedenceTier));

  return (
    <div className="space-y-3">
      {tiers.map((tier, index) => {
        const tierRules = rules.filter((rule) => rule.precedenceTier === tier.tier);
        return (
          <Card key={tier.tier}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
                {viPrecedenceTierLabel(tier.tier)}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {viPrecedenceTierDescription(tier.tier)}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {tierRules.length === 0 ? (
                <p className="text-muted-foreground text-sm">Không có quy tắc trong tầng này.</p>
              ) : (
                <RuleList rules={tierRules} groupName={groupName} />
              )}
            </CardContent>
          </Card>
        );
      })}

      {unknownTierRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tầng chưa hỗ trợ</CardTitle>
            <p className="text-muted-foreground text-sm">
              Các quy tắc này dùng tầng ưu tiên chưa có trong bản hiển thị hiện tại. Hệ thống vẫn
              hiển thị để người vận hành kiểm tra dữ liệu trả về.
            </p>
          </CardHeader>
          <CardContent>
            <RuleList rules={unknownTierRules} groupName={groupName} showTier />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RuleList({
  rules,
  groupName,
  showTier = false,
}: {
  rules: RuleDefinition[];
  groupName: (id: string) => string | null;
  showTier?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {rules.map((rule) => {
        const displayGroupName = groupName(rule.ruleGroupId);
        return (
          <li key={rule.id} className="space-y-2 rounded-md border px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 space-x-2 break-words">
                <span className="font-medium">{rule.ruleCode}</span>
                <span className="text-muted-foreground">{rule.ruleName}</span>
                {displayGroupName && (
                  <span className="text-muted-foreground text-xs">({displayGroupName})</span>
                )}
                {showTier && (
                  <span className="text-muted-foreground text-xs">
                    ({viPrecedenceTierLabel(rule.precedenceTier)})
                  </span>
                )}
              </span>
              <ControlModeBadge mode={rule.controlMode} />
            </div>
            {/* Condition / action JSON — READ-ONLY display only (OQ3); no editor. */}
            <div className="grid gap-2 sm:grid-cols-2">
              <RuleJson label="Điều kiện" value={rule.conditionJson} />
              <RuleJson label="Hành động" value={rule.actionJson} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Read-only display of a rule's condition / action JSON (OQ3 / Finding #3). It is
 * a static, pretty-printed view — never an editor. An advanced condition/action
 * editor is deferred (out of B6 scope).
 */
function RuleJson({ label, value }: { label: string; value: Record<string, unknown> }) {
  const isEmpty = !value || Object.keys(value).length === 0;
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      {isEmpty ? (
        <p className="text-muted-foreground text-xs">—</p>
      ) : (
        <pre className="bg-muted/40 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-md p-2 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
