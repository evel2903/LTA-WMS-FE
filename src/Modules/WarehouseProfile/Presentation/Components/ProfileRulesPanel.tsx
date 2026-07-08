import { useEffect, useState } from 'react';

import { Button } from '@shared/Components/Ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@shared/Components/Reui/alert';
import type { RuleDefinition } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinition';
import type { WarehouseProfileRule } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRule';
import { viControlModeLabel } from '@modules/WarehouseProfile/Presentation/Constants/WarehouseProfileDisplayText';

interface ProfileRulesPanelProps {
  /** Rules currently attached to the selected profile (`GET :id/rules`). */
  profileRules: WarehouseProfileRule[];
  /** The rule-definition catalog, used to label attached rules + offer attachable ones. */
  ruleDefinitions: RuleDefinition[];
  canEdit?: boolean;
  pendingAdd?: boolean;
  pendingRemove?: boolean;
  /** Attach a rule definition to the profile (`POST :id/rules`). */
  onAdd: (ruleDefinitionId: string) => void;
  /** Detach an attached profile-rule (`DELETE :id/rules/:ruleId`). */
  onRemove: (profileRuleId: string) => void;
}

/**
 * Profile-rule assignment surface (Finding #2): lists the rules attached to the
 * selected profile and lets the admin attach an available rule or detach an
 * attached one — driving the `:id/rules` endpoints that were previously plumbed
 * but unused. FE does not decide precedence here; this is plain membership
 * management.
 */
export function ProfileRulesPanel({
  profileRules,
  ruleDefinitions,
  canEdit = true,
  pendingAdd = false,
  pendingRemove = false,
  onAdd,
  onRemove,
}: ProfileRulesPanelProps) {
  const [selectedRuleId, setSelectedRuleId] = useState('');

  const definitionById = (id: string) => ruleDefinitions.find((rule) => rule.id === id) ?? null;
  const attachedIds = new Set(profileRules.map((rule) => rule.ruleDefinitionId));
  const attachable = ruleDefinitions.filter((rule) => !attachedIds.has(rule.id));
  const selectedRule = attachable.find((rule) => rule.id === selectedRuleId) ?? null;

  useEffect(() => {
    if (selectedRuleId && !selectedRule) {
      setSelectedRuleId('');
    }
  }, [selectedRuleId, selectedRule]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Quy tắc</p>
      {!canEdit && (
        <Alert variant="warning" role="status">
          <AlertTitle>Chỉ đọc</AlertTitle>
          <AlertDescription>Bạn không có quyền gắn hoặc gỡ quy tắc.</AlertDescription>
        </Alert>
      )}

      {profileRules.length === 0 ? (
        <Alert variant="info" role="status">
          <AlertDescription>Chưa gắn quy tắc nào.</AlertDescription>
        </Alert>
      ) : (
        <ul className="space-y-1 text-sm">
          {profileRules.map((profileRule) => {
            const def = definitionById(profileRule.ruleDefinitionId);
            return (
              <li
                key={profileRule.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span className="min-w-0 flex-1 space-x-2 break-words">
                  <span className="break-words font-medium">
                    {def?.ruleCode ?? profileRule.ruleDefinitionId}
                  </span>
                  {def && <span className="text-muted-foreground break-words">{def.ruleName}</span>}
                  {def && (
                    <span className="text-muted-foreground text-xs">
                      ({viControlModeLabel(def.controlMode)})
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEdit || pendingRemove}
                  onClick={() => onRemove(profileRule.id)}
                >
                  Gỡ bỏ
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid flex-1 gap-1 text-sm">
          Gắn quy tắc
          <select
            id="warehouse-profile-attach-rule"
            name="ruleDefinitionId"
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
            disabled={!canEdit || attachable.length === 0}
            value={selectedRuleId}
            onChange={(event) => setSelectedRuleId(event.target.value)}
          >
            <option value="">Chọn quy tắc...</option>
            {attachable.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.ruleCode} — {rule.ruleName}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          disabled={!canEdit || pendingAdd || !selectedRule}
          onClick={() => {
            if (!selectedRule) return;
            onAdd(selectedRule.id);
            setSelectedRuleId('');
          }}
        >
          Thêm quy tắc
        </Button>
      </div>
    </div>
  );
}
