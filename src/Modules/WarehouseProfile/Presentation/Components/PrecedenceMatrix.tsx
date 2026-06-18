import { Card, CardContent, CardHeader, CardTitle } from '@shared/Components/Ui/Card';
import type { PrecedenceTierDescriptor } from '@modules/WarehouseProfile/Domain/Constants/PrecedenceOrder';
import type { RuleDefinition } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinition';
import type { RuleGroup } from '@modules/WarehouseProfile/Domain/Entities/RuleGroup';
import { ControlModeBadge } from '@modules/WarehouseProfile/Presentation/Components/ControlModeBadge';

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

  return (
    <div className="space-y-3">
      {tiers.map((tier, index) => {
        const tierRules = rules.filter((rule) => rule.precedenceTier === tier.tier);
        return (
          <Card key={tier.tier}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
                {tier.label}
              </CardTitle>
              <p className="text-muted-foreground text-sm">{tier.description}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {tierRules.length === 0 ? (
                <p className="text-muted-foreground text-sm">No rules in this tier.</p>
              ) : (
                <ul className="space-y-2">
                  {tierRules.map((rule) => (
                    <li
                      key={rule.id}
                      className="space-y-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="space-x-2">
                          <span className="font-medium">{rule.ruleCode}</span>
                          <span className="text-muted-foreground">{rule.ruleName}</span>
                          {groupName(rule.ruleGroupId) && (
                            <span className="text-muted-foreground text-xs">
                              ({groupName(rule.ruleGroupId)})
                            </span>
                          )}
                        </span>
                        <ControlModeBadge mode={rule.controlMode} />
                      </div>
                      {/* Condition / action JSON — READ-ONLY display only (OQ3); no editor. */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <RuleJson label="Condition" value={rule.conditionJson} />
                        <RuleJson label="Action" value={rule.actionJson} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
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
        <pre className="bg-muted/40 overflow-x-auto rounded-md p-2 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
